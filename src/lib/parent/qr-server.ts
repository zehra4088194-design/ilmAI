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

export async function decodeQrImage(imageBuffer: Buffer) {
  for (const variant of ['plain', 'rescaled', 'normalized', 'threshold'] as const) {
    const image = await createLuminance(imageBuffer, variant);
    const payload = decodeLuminance(image.data, image.width, image.height);
    if (payload) return payload;
  }

  return null;
}
