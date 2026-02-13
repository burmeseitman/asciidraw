import sharp from 'sharp';

export interface AsciiOptions {
  width?: number;
  contrast?: number;
  chars?: string;
  isTerminal?: boolean;
}

const DEFAULT_CHARS = '@%#*+=-:. ';

export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    // Basic security: Check if sharp can parse it and if it's a known format
    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      return false;
    }
    // Limit dimensions to prevent DOS
    if ((metadata.width || 0) > 4000 || (metadata.height || 0) > 4000) {
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

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const aspectRatio = (metadata.height || 1) / (metadata.width || 1);
  const height = Math.round(width * aspectRatio * 0.5); // 0.5 to adjust for font aspect ratio

  const { data, info } = await image
    .resize(width, height, { fit: 'fill' }) // 'fill' ensures the entire image is mapped to the box
    .removeAlpha() // Standardize to RGB
    .raw()
    .toBuffer({ resolveWithObject: true });

  let result = '';
  const charArray = chars.split('');

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

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
