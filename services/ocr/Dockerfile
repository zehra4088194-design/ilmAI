FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMP_THREAD_LIMIT=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ghostscript \
      ocrmypdf \
      qpdf \
      tesseract-ocr \
      tesseract-ocr-eng \
      tesseract-ocr-urd \
      unpaper \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --system --uid 10001 --create-home ocr \
    && tesseract --list-langs | grep -q '^eng$' \
    && tesseract --list-langs | grep -q '^urd$'

USER ocr
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
