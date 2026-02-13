import { Jimp, intToRGBA } from 'jimp';

export interface AsciiOptions {
  width?: number;
  contrast?: number;
  chars?: string;
  isTerminal?: boolean;
}

const DEFAULT_CHARS = '@%#*+=-:. ';

export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const image = await Jimp.read(buffer);
    const mime = image.mime;
    // Basic security: Check if jimp can parse it and if it's a known format
    if (!['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/gif'].includes(mime || '')) {
      return false;
    }
    // Limit dimensions to prevent DOS
    if (image.bitmap.width > 4000 || image.bitmap.height > 4000) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function convertToAscii(buffer: Buffer, options: AsciiOptions = {}) {
  const {
    width = 100,
    chars = DEFAULT_CHARS,
    isTerminal = false,
  } = options;

  const image = await Jimp.read(buffer);
  const metadata = {
    width: image.bitmap.width,
    height: image.bitmap.height
  };
  const aspectRatio = (metadata.height || 1) / (metadata.width || 1);
  const height = Math.round(width * aspectRatio * 0.5); // 0.5 to adjust for font aspect ratio

  image.resize({ w: width, h: height });

  let result = '';
  const charArray = chars.split('');

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelColor = image.getPixelColor(x, y);
      const rgba = intToRGBA(pixelColor);
      
      const r = rgba.r;
      const g = rgba.g;
      const b = rgba.b;

      // Luminance (standard ITU-R BT.709)
      const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const charIdx = Math.floor(brightness * (charArray.length - 1));
      const char = charArray[charIdx];

      if (isTerminal) {
        // ANSI 24-bit color: \x1b[38;2;R;G;Bm
        result += `\x1b[38;2;${r};${g};${b}m${char}`;
      } else {
        // Simple HTML-ready format: [char, r, g, b]
        // We'll return an array of rows to the frontend for efficient rendering
        result += JSON.stringify([char, r, g, b]) + '|';
      }
    }
    result += isTerminal ? '\x1b[0m\n' : '\n';
  }

  return result;
}
