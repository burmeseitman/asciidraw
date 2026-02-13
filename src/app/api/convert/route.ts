import { NextRequest, NextResponse } from 'next/server';
import { validateImage, convertToAscii } from '@/lib/ascii-service';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const isTerminal = req.headers.get('user-agent')?.includes('curl');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Security check
    const isValid = await validateImage(buffer);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or malicious image file' }, { status: 400 });
    }

    const width = formData.get('width') ? parseInt(formData.get('width') as string) : (isTerminal ? 80 : 150);

    const ascii = await convertToAscii(buffer, {
      isTerminal: !!isTerminal,
      width: width,
    });

    if (isTerminal) {
      return new NextResponse(ascii, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({ ascii });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}

// GET serves the bash script for curl users
export async function GET(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || '';
  if (!userAgent.includes('curl')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const script = `#!/bin/bash
# ASCII Draw Multi-Platform CLI
# Supports macOS, Linux, and Windows (Git Bash/WSL)

OS_TYPE=$(uname -s)
FILE=""

echo "✨ ASCII Draw - Multi-Platform CLI"

if [[ "$OS_TYPE" == "Darwin" ]]; then
  # macOS
  FILE=$(osascript -e 'POSIX path of (choose file with prompt "Select an image to convert to ASCII" of type {"public.image"})' 2>/dev/null)
elif [[ "$OS_TYPE" == "Linux" ]]; then
  # Linux (Zenity or kdialog)
  if command -v zenity >/dev/null 2>&1; then
    FILE=$(zenity --file-selection --title="Select an image" 2>/dev/null)
  elif command -v kdialog >/dev/null 2>&1; then
    FILE=$(kdialog --getopenfilename . "Images (*.png *.jpg *.webp *.gif)" 2>/dev/null)
  fi
elif [[ "$OS_TYPE" == *"NT"* ]] || [[ "$OS_TYPE" == *"MINGW"* ]] || [[ "$OS_TYPE" == *"CYGWIN"* ]] || [[ -f /proc/version && $(cat /proc/version) == *"Microsoft"* ]]; then
  # Windows (via PowerShell)
  FILE=$(powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Images|*.jpg;*.png;*.webp;*.gif'; $f.ShowDialog() | Out-Null; $f.FileName" 2>/dev/null | tr -d '\\r')
  # Convert Windows path to POSIX if needed (WSL)
  if [[ -n "$FILE" ]] && command -v wslpath >/dev/null 2>&1; then
    FILE=$(wslpath -u "$FILE")
  fi
fi

# Fallback to manual entry if GUI fails or OS not recognized
if [ -z "$FILE" ]; then
  echo "⚠️  No GUI file picker available or cancelled."
  read -p "📂 Please enter the full path to your image: " FILE
fi

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "❌ Error: File not found: $FILE"
  exit 1
fi

echo "🚀 Processing $FILE..."
curl -F "file=@$FILE" ${req.nextUrl.origin}/api/convert
`;

  return new NextResponse(script, {
    headers: { 'Content-Type': 'text/x-shellscript' },
  });
}
