import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

// Configure Sharp for better performance
sharp.cache(false) // Disable cache to prevent memory leaks with many files
sharp.concurrency(1) // Limit concurrency per instance to prevent memory spikes

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

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 413 })
    }

    // Convert file to buffer with memory management
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let convertedBuffer: Buffer
    let actualFormat = targetFormat
    
    // Create Sharp instance with optimizations
    const sharpInstance = sharp(buffer, {
      failOnError: false,
      density: 300, // Good default for most images
      limitInputPixels: 268402689 // ~16k x 16k max resolution for safety
    })

    // Get image metadata for optimization decisions
    const metadata = await sharpInstance.metadata()
    
    // Apply size optimization for very large images
    const maxDimension = 8192 // Max width/height
    let resizeOptions = {}
    
    if (metadata.width && metadata.height) {
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        resizeOptions = {
          width: Math.min(metadata.width, maxDimension),
          height: Math.min(metadata.height, maxDimension),
          fit: 'inside' as const,
          withoutEnlargement: true
        }
      }
    }
    
    // Convert image based on target format with optimizations
    switch (targetFormat.toLowerCase()) {
      case 'png':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({ 
            compressionLevel: 6, // Good balance of speed vs compression
            adaptiveFiltering: false, // Faster processing
            force: true
          })
          .toBuffer()
        break
      case 'jpeg':
      case 'jpg':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .jpeg({ 
            quality: Math.max(1, Math.min(100, quality)),
            progressive: true,
            mozjpeg: true, // Better compression
            force: true
          })
          .toBuffer()
        // Keep the original format choice (jpeg or jpg) for filename
        actualFormat = targetFormat
        break
      case 'webp':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .webp({ 
            quality: Math.max(1, Math.min(100, quality)),
            effort: 4, // Good balance of speed vs compression (0-6)
            force: true
          })
          .toBuffer()
        break
      case 'avif':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .avif({ 
            quality: Math.max(1, Math.min(100, quality)),
            effort: 4, // Faster than default (0-9)
            force: true
          })
          .toBuffer()
        break
      case 'tiff':
      case 'tif':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .tiff({ 
            quality: Math.max(1, Math.min(100, quality)),
            compression: 'lzw',
            xres: 300,
            yres: 300,
            force: true
          })
          .toBuffer()
        break
      case 'bmp':
        // Convert to PNG since Sharp doesn't support BMP output directly
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({ 
            compressionLevel: 6,
            force: true
          })
          .toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      case 'gif':
        // Sharp has limited GIF support, convert to PNG for better results
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({
            compressionLevel: 6,
            force: true
          })
          .toBuffer()
        actualFormat = 'png'
        break
      case 'heic':
      case 'heif':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .heif({ 
            quality: Math.max(1, Math.min(100, quality)),
            compression: 'hevc',
            force: true
          })
          .toBuffer()
        break
      case 'psd':
        // Convert PSD to PNG since Sharp can read PSD but not write it
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({
            compressionLevel: 6,
            force: true
          })
          .toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      case 'ico':
        // Convert to PNG first, then resize for ICO (multiple sizes would be ideal)
        convertedBuffer = await sharpInstance
          .resize(256, 256, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            withoutEnlargement: false
          })
          .png({ force: true })
          .toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      default:
        return NextResponse.json({ error: 'Unsupported target format' }, { status: 400 })
    }

    // Clean up memory
    sharpInstance.destroy()

    // Generate filename with actual output format
    const originalName = file.name
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
    const newFilename = `${nameWithoutExt}.${actualFormat}`

    // Return converted image with optimized headers
    return new Response(new Uint8Array(convertedBuffer), {
      headers: {
        'Content-Type': `image/${(actualFormat === 'jpg' || actualFormat === 'jpeg') ? 'jpeg' : actualFormat}`,
        'Content-Disposition': `attachment; filename="${newFilename}"`,
        'Content-Length': convertedBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching of converted images
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    })
  } catch (error) {
    console.error('Conversion error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Input file contains unsupported image format')) {
        return NextResponse.json(
          { error: 'Unsupported image format. Please try a different file.' },
          { status: 400 }
        )
      }
      if (error.message.includes('Input image exceeds pixel limit')) {
        return NextResponse.json(
          { error: 'Image is too large. Please use a smaller image.' },
          { status: 413 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to convert image. Please try again.' },
      { status: 500 }
    )
  }
} 