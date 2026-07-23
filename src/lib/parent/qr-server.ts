import sharp from 'sharp';
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';

const MAX_QR_DIMENSION = 2200;
const MAX_INPUT_PIXELS = 40_000_000;
const QRCODECAT_API_URL = process.env.QRCODECAT_API_URL || '';
const QRCODECAT_API_KEY = process.env.QRCODECAT_API_KEY || '';

type ImageVariant = 'plain' | 'rescaled' | 'normalized' | 'threshold';

async function createLuminance(imageBuffer: Buffer, variant: ImageVariant) {
  let pipeline = sharp(imageBuffer, {
    animated: false,
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .flatten({ background: '#ffffff' });

  pipeline = pipeline
    .resize({
      width: variant === 'rescaled' ? 1600 : MAX_QR_DIMENSION,
      height: variant === 'rescaled' ? 1600 : MAX_QR_DIMENSION,
      fit: 'inside',
      withoutEnlargement: variant !== 'rescaled',
    })
    .grayscale();

  if (variant === 'normalized') pipeline = pipeline.normalise();
  if (variant === 'threshold') pipeline = pipeline.threshold(160);

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

function decodeLuminance(data: Uint8ClampedArray, width: number, height: number) {
  const source = new RGBLuminanceSource(data, width, height);
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  for (const candidate of [source, source.invert()]) {
    try {
      return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(candidate)), hints).getText();
    } catch {
      // Try the next contrast/inversion variant.
    }
  }

  return null;
}

function readRemoteQrPayload(data: any): string | null {
  const direct = data?.text || data?.data || data?.result || data?.payload || data?.decodedText || data?.qr;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const firstResult = Array.isArray(data?.results) ? data.results[0] : Array.isArray(data?.codes) ? data.codes[0] : null;
  if (!firstResult) return null;
  return readRemoteQrPayload(firstResult);
}

async function decodeWithQrCodeCat(imageBuffer: Buffer) {
  if (!QRCODECAT_API_URL || !QRCODECAT_API_KEY) return null;

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'parent-qr.png');

  const response = await fetch(QRCODECAT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${QRCODECAT_API_KEY}`,
      'X-API-Key': QRCODECAT_API_KEY,
    },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return readRemoteQrPayload(await response.json());
  const text = (await response.text()).trim();
  return text || null;
}

export async function decodeQrImage(imageBuffer: Buffer) {
  for (const variant of ['plain', 'rescaled', 'normalized', 'threshold'] as const) {
    const image = await createLuminance(imageBuffer, variant);
    const payload = decodeLuminance(image.data, image.width, image.height);
    if (payload) return payload;
  }

  return decodeWithQrCodeCat(imageBuffer);
}
