import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const targetFormat = formData.get('format') as string
    const quality = parseInt(formData.get('quality') as string) || 80

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!targetFormat) {
      return NextResponse.json({ error: 'No target format specified' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    let convertedBuffer: Buffer
    let actualFormat = targetFormat
    
    // Convert image based on target format
    switch (targetFormat.toLowerCase()) {
      case 'png':
        convertedBuffer = await sharp(buffer).png().toBuffer()
        break
      case 'jpeg':
      case 'jpg':
        convertedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer()
        break
      case 'webp':
        convertedBuffer = await sharp(buffer).webp({ quality }).toBuffer()
        break
      case 'avif':
        convertedBuffer = await sharp(buffer).avif({ quality }).toBuffer()
        break
      case 'tiff':
      case 'tif':
        convertedBuffer = await sharp(buffer).tiff({ 
          quality,
          compression: 'lzw',
          xres: 300,
          yres: 300
        }).toBuffer()
        break
      case 'bmp':
        // Convert to PNG since Sharp doesn't support BMP output directly
        convertedBuffer = await sharp(buffer).png().toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      case 'gif':
        convertedBuffer = await sharp(buffer).gif().toBuffer()
        break
      case 'heic':
      case 'heif':
        convertedBuffer = await sharp(buffer).heif({ quality }).toBuffer()
        break
      case 'psd':
        // Convert PSD to PNG since Sharp can read PSD but not write it
        convertedBuffer = await sharp(buffer).png().toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      case 'ico':
        // Convert to PNG first, then resize for ICO
        convertedBuffer = await sharp(buffer)
          .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      default:
        return NextResponse.json({ error: 'Unsupported target format' }, { status: 400 })
    }

    // Generate filename with actual output format
    const originalName = file.name
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
    const newFilename = `${nameWithoutExt}.${actualFormat}`

    // Return converted image using Response instead of NextResponse for binary data
    return new Response(new Uint8Array(convertedBuffer), {
      headers: {
        'Content-Type': `image/${actualFormat === 'jpg' ? 'jpeg' : actualFormat}`,
        'Content-Disposition': `attachment; filename="${newFilename}"`,
        'Content-Length': convertedBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to convert image' },
      { status: 500 }
    )
  }
} 