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
        // Advanced PNG optimization based on image characteristics
        const hasAlpha = metadata.channels === 4 || metadata.hasAlpha
        const colors = metadata.density || 0
        
        // For high-quality settings (>90), use lossless optimization
        if (quality > 90) {
          convertedBuffer = await sharpInstance
            .resize(resizeOptions)
            .png({ 
              compressionLevel: 9, // Maximum compression for lossless
              adaptiveFiltering: true, // Better compression at slight speed cost
              palette: !hasAlpha && colors < 256, // Use palette for images with few colors
              quality: 100, // Lossless
              effort: 10, // Maximum effort for best compression
              colours: Math.min(colors || 256, 256), // Optimize color count
              dither: 0.0, // No dithering for high quality
              force: true
            })
            .toBuffer()
        } 
        // For medium quality (70-90), use optimized lossless with palette reduction
        else if (quality >= 70) {
          // Try to convert to palette if possible for better compression
          const tempBuffer = await sharpInstance
            .resize(resizeOptions)
            .png({ 
              compressionLevel: 9,
              adaptiveFiltering: true,
              palette: true, // Force palette mode if possible
              quality: 100, // Lossless but with palette optimization
              effort: 10,
              colours: Math.min(Math.ceil(quality * 2.56), 256), // Reduce colors based on quality
              dither: (100 - quality) / 200, // Light dithering for smooth gradients
              force: true
            })
            .toBuffer()
          
          // If palette conversion fails or results in larger file, use regular compression
          try {
            convertedBuffer = tempBuffer
          } catch (error) {
            convertedBuffer = await sharpInstance
              .resize(resizeOptions)
              .png({ 
                compressionLevel: 9,
                adaptiveFiltering: true,
                quality: quality,
                effort: 8,
                force: true
              })
              .toBuffer()
          }
        }
        // For lower quality settings (<70), use aggressive optimization
        else {
          // First pass: Try quantization for smaller files
          try {
            convertedBuffer = await sharpInstance
              .resize(resizeOptions)
              .png({ 
                compressionLevel: 9,
                adaptiveFiltering: true,
                palette: true, // Force palette for better compression
                quality: Math.max(quality, 40), // Don't go below 40 for PNG
                effort: 10,
                colours: Math.max(Math.ceil(quality * 2.56), 16), // Reduce colors aggressively
                dither: Math.min((100 - quality) / 100, 0.8), // More dithering for lower quality
                force: true
              })
              .toBuffer()
          } catch (error) {
            // Fallback to standard PNG compression
            convertedBuffer = await sharpInstance
              .resize(resizeOptions)
              .png({ 
                compressionLevel: 9,
                adaptiveFiltering: true,
                quality: quality,
                effort: 6,
                force: true
              })
              .toBuffer()
          }
        }
        break
      case 'jpeg':
      case 'jpg':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .jpeg({ 
            quality: Math.max(1, Math.min(100, quality)),
            progressive: true,
            mozjpeg: true, // Better compression
            optimizeScans: true, // Optimize scan order
            trellisQuantisation: true, // Better quality at low bitrates
            overshootDeringing: true, // Reduce artifacts
            force: true
          })
          .toBuffer()
        break
      case 'webp':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .webp({ 
            quality: Math.max(1, Math.min(100, quality)),
            effort: 6, // Higher effort for better compression
            alphaQuality: Math.max(1, Math.min(100, quality)), // Preserve alpha quality
            lossless: quality >= 95, // Use lossless for very high quality
            nearLossless: quality >= 90 && quality < 95, // Near-lossless for high quality
            smartSubsample: true, // Better compression for certain images
            force: true
          })
          .toBuffer()
        break
      case 'avif':
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .avif({ 
            quality: Math.max(1, Math.min(100, quality)),
            effort: 6, // Good balance of speed vs compression
            chromaSubsampling: quality < 80 ? '4:2:0' : '4:4:4', // Better quality for high settings
            lossless: quality >= 98, // Lossless only for near-perfect quality
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
            compression: quality >= 80 ? 'lzw' : 'jpeg', // Use JPEG compression for smaller files
            predictor: 'horizontal', // Better compression for continuous-tone images
            xres: 300,
            yres: 300,
            force: true
          })
          .toBuffer()
        break
      case 'bmp':
        // Convert to optimized PNG since Sharp doesn't support BMP output directly
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({ 
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true, // Use palette for better compression
            quality: Math.max(quality, 80), // Maintain quality for BMP conversion
            effort: 8,
            force: true
          })
          .toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      case 'gif':
        // Convert to optimized PNG with palette for GIF-like images
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true, // Force palette for GIF-style images
            colours: Math.min(256, Math.max(16, quality * 2.56)), // Limit colors like GIF
            dither: 0.5, // Add dithering for smooth gradients
            effort: 10,
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
            effort: 6, // Balance speed and compression
            chromaSubsampling: quality < 80 ? '4:2:0' : '4:4:4',
            force: true
          })
          .toBuffer()
        break
      case 'psd':
        // Convert PSD to optimized PNG since Sharp can read PSD but not write it
        convertedBuffer = await sharpInstance
          .resize(resizeOptions)
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            quality: Math.max(quality, 85), // Maintain quality for PSD conversion
            effort: 8,
            force: true
          })
          .toBuffer()
        actualFormat = 'png' // Update format since we're actually outputting PNG
        break
      case 'ico':
        // Convert to optimized PNG for ICO format
        convertedBuffer = await sharpInstance
          .resize(256, 256, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            withoutEnlargement: false
          })
          .png({ 
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true, // Use palette for icon-style images
            quality: Math.max(quality, 90), // High quality for icons
            effort: 10,
            force: true 
          })
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
        'Content-Type': `image/${actualFormat === 'jpg' ? 'jpeg' : actualFormat}`,
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