import asyncio
import hmac
import os
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader

SERVICE_SECRET = os.environ.get("OCR_SERVICE_SECRET", "")
DEFAULT_LANGUAGES = os.environ.get("OCR_LANGUAGES", "eng+urd")
MAX_FILE_BYTES = int(os.environ.get("OCR_MAX_FILE_BYTES", str(25 * 1024 * 1024)))
MAX_PDF_PAGES = int(os.environ.get("OCR_MAX_PDF_PAGES", "30"))
MAX_CONCURRENT_JOBS = max(1, int(os.environ.get("OCR_MAX_CONCURRENT_JOBS", "1")))
JOB_TIMEOUT_SECONDS = max(30, int(os.environ.get("OCR_JOB_TIMEOUT_SECONDS", "180")))
ALLOWED_LANGUAGES = {"eng", "urd"}

Image.MAX_IMAGE_PIXELS = 50_000_000
job_slots = asyncio.Semaphore(MAX_CONCURRENT_JOBS)
app = FastAPI(title="ilm AI private OCR", docs_url=None, redoc_url=None, openapi_url=None)


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not SERVICE_SECRET:
        raise HTTPException(status_code=503, detail="OCR service secret is not configured")
    expected = f"Bearer {SERVICE_SECRET}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def normalize_languages(value: str) -> str:
    requested = [item.strip().lower() for item in value.split("+") if item.strip()]
    if not requested or any(item not in ALLOWED_LANGUAGES for item in requested):
        raise HTTPException(status_code=400, detail="Only eng and urd OCR languages are enabled")
    return "+".join(dict.fromkeys(requested))


async def save_upload(upload: UploadFile, target: Path) -> int:
    size = 0
    with target.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_BYTES:
                raise HTTPException(status_code=413, detail=f"File must be at most {MAX_FILE_BYTES} bytes")
            output.write(chunk)
    if size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    return size


async def run_command(*args: str) -> tuple[str, str]:
    process = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env={**os.environ, "OMP_THREAD_LIMIT": "1"},
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=JOB_TIMEOUT_SECONDS)
    except TimeoutError:
        process.kill()
        await process.communicate()
        raise HTTPException(status_code=504, detail="OCR job timed out")

    stdout_text = stdout.decode("utf-8", errors="replace")
    stderr_text = stderr.decode("utf-8", errors="replace")
    if process.returncode != 0:
        safe_error = stderr_text.strip().splitlines()[-1:] or ["OCR command failed"]
        raise HTTPException(status_code=422, detail=safe_error[0][:300])
    return stdout_text, stderr_text


def extract_pdf_text(path: Path) -> tuple[str, int]:
    try:
        reader = PdfReader(str(path), strict=False)
        if reader.is_encrypted:
            raise HTTPException(status_code=400, detail="Password-protected PDFs are not supported")
        page_count = len(reader.pages)
        if page_count > MAX_PDF_PAGES:
            raise HTTPException(status_code=413, detail=f"PDF must have at most {MAX_PDF_PAGES} pages")
        text = "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()
        return text, page_count
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=422, detail="Invalid or unsupported PDF") from error


def prepare_image(source: Path, target: Path) -> None:
    try:
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image)
            image = ImageOps.autocontrast(image.convert("L"))
            if image.width < 1400:
                scale = min(2.0, 1400 / max(1, image.width))
                image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
            image.save(target, format="PNG", optimize=True)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as error:
        raise HTTPException(status_code=422, detail="Invalid or unsafe image file") from error


async def ocr_image(source: Path, workdir: Path, languages: str) -> dict:
    prepared = workdir / "prepared.png"
    await asyncio.to_thread(prepare_image, source, prepared)
    stdout, _ = await run_command(
        "tesseract",
        str(prepared),
        "stdout",
        "-l",
        languages,
        "--oem",
        "1",
        "--psm",
        "3",
        "--dpi",
        "300",
    )
    text = stdout.strip()
    if not text:
        raise HTTPException(status_code=422, detail="No readable printed text found")
    return {"text": text, "providerUsed": "self-hosted-tesseract", "pages": 1}


async def ocr_pdf(source: Path, workdir: Path, languages: str) -> dict:
    native_text, page_count = await asyncio.to_thread(extract_pdf_text, source)
    visible_characters = len("".join(native_text.split()))
    if visible_characters >= max(40, page_count * 20):
        return {"text": native_text, "providerUsed": "native-pdf", "pages": page_count}

    output_pdf = workdir / "searchable.pdf"
    sidecar = workdir / "sidecar.txt"
    await run_command(
        "ocrmypdf",
        "--skip-text",
        "--rotate-pages",
        "--deskew",
        "--jobs",
        "1",
        "--optimize",
        "0",
        "--output-type",
        "pdf",
        "--tesseract-timeout",
        "60",
        "--sidecar",
        str(sidecar),
        "-l",
        languages,
        str(source),
        str(output_pdf),
    )
    searchable_text, _ = await asyncio.to_thread(extract_pdf_text, output_pdf)
    sidecar_text = sidecar.read_text(encoding="utf-8", errors="replace").strip() if sidecar.exists() else ""
    text = searchable_text.strip() or sidecar_text
    if not text:
        raise HTTPException(status_code=422, detail="No readable printed text found in PDF")
    return {"text": text, "providerUsed": "self-hosted-ocrmypdf", "pages": page_count}


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ilm-ai-ocr"}


@app.post("/v1/ocr", dependencies=[Depends(require_auth)])
async def perform_ocr(
    file: UploadFile = File(...),
    mode: str = Form(default="printed"),
    languages: str = Form(default=DEFAULT_LANGUAGES),
) -> dict:
    if mode not in {"printed", "handwritten"}:
        raise HTTPException(status_code=400, detail="Invalid OCR mode")
    safe_languages = normalize_languages(languages)

    with tempfile.TemporaryDirectory(prefix="ilm-ocr-") as directory:
        workdir = Path(directory)
        source = workdir / "upload.bin"
        await save_upload(file, source)
        header = source.read_bytes()[:8]
        is_pdf = header.startswith(b"%PDF-")

        async with job_slots:
            if is_pdf:
                return await ocr_pdf(source, workdir, safe_languages)
            return await ocr_image(source, workdir, safe_languages)
