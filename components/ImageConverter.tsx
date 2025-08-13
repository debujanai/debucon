'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, Image as ImageIcon, X, Settings, CheckCircle, Archive, Loader2 } from 'lucide-react'
import JSZip from 'jszip'

interface ConversionResult {
  originalName: string
  convertedName: string
  downloadUrl: string
  size: string
  blob: Blob
}

interface ImageConverterProps {
  isDarkMode: boolean
  colors: {
    bg: string
    text: string
    textSecondary: string
    textMuted: string
    cardBg: string
    cardBorder: string
  }
}

const SUPPORTED_FORMATS = [
  { value: 'png', label: 'PNG', description: 'Lossless compression' },
  { value: 'jpeg', label: 'JPEG', description: 'High compression' },
  { value: 'webp', label: 'WebP', description: 'Modern format' },
  { value: 'heic', label: 'HEIC', description: 'Apple format' },
  { value: 'heif', label: 'HEIF', description: 'High efficiency' },
  { value: 'gif', label: 'GIF', description: 'Animated images' },
  { value: 'psd', label: 'PSD', description: 'Photoshop files' },
  { value: 'tiff', label: 'TIFF', description: 'High quality' },
  { value: 'tif', label: 'TIF', description: 'Tagged format' },
  { value: 'bmp', label: 'BMP', description: 'Bitmap format' },
  { value: 'ico', label: 'ICO', description: 'Icon format' },
  { value: 'avif', label: 'AVIF', description: 'Next-gen format' }
]

export default function ImageConverter({ isDarkMode, colors }: ImageConverterProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [targetFormat, setTargetFormat] = useState('png')
  const [isConverting, setIsConverting] = useState(false)
  const [conversionResults, setConversionResults] = useState<ConversionResult[]>([])
  const [quality, setQuality] = useState(100)
  const [showSettings, setShowSettings] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|svg|bmp|tiff?|ico|avif|heic|heif|gif|psd|3fr|arw|cr2|cr3|crw|dcr|dng|eps|erf|mos|mrw|nef|odd|odg|orf|pef|ppm|ps|pub|raf|raw|rw2|x3f|xcf|xps)$/i)
    )
    setSelectedFiles(prev => [...prev, ...imageFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.bmp', '.tiff', '.tif', '.ico', '.avif', '.heic', '.heif', '.gif', '.psd', '.3fr', '.arw', '.cr2', '.cr3', '.crw', '.dcr', '.dng', '.eps', '.erf', '.mos', '.mrw', '.nef', '.odd', '.odg', '.orf', '.pef', '.ppm', '.ps', '.pub', '.raf', '.raw', '.rw2', '.x3f', '.xcf', '.xps']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    setConversionResults([])
  }

  const convertImages = async () => {
    if (selectedFiles.length === 0) return
    
    setIsConverting(true)
    const results: ConversionResult[] = []
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('format', targetFormat)
        formData.append('quality', quality.toString())

        const response = await fetch('/api/convert', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to convert ${file.name}`)
        }

        const blob = await response.blob()
        const downloadUrl = URL.createObjectURL(blob)
        
        const result: ConversionResult = {
          originalName: file.name,
          convertedName: `${file.name.split('.')[0]}.${targetFormat}`,
          downloadUrl,
          size: `${(blob.size / 1024).toFixed(1)} KB`,
          blob: blob
        }
        results.push(result)
      }
      
      setConversionResults(results)
    } catch (error) {
      console.error('Conversion failed:', error)
      alert('Some images failed to convert. Please try again.')
    } finally {
      setIsConverting(false)
    }
  }

  const downloadFile = (result: ConversionResult) => {
    const link = document.createElement('a')
    link.href = result.downloadUrl
    link.download = result.convertedName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAll = async () => {
    if (conversionResults.length === 0) return

    const zip = new JSZip()
    for (const result of conversionResults) {
      zip.file(result.convertedName, result.blob)
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.href = url
    link.download = 'converted_images.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Upload Section */}
      <div 
        className="border-2 rounded-3xl p-12 mb-12 transition-all duration-300 shadow-lg"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
        }}
      >
        {/* Settings Toggle */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
            Convert Images
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 border-2"
            style={{
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
              color: colors.text,
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div 
            className="mb-8 p-6 rounded-2xl border-2"
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              borderColor: colors.cardBorder,
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #334155 0%, #334155 ${quality}%, ${colors.cardBorder} ${quality}%, ${colors.cardBorder} 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Format Selection */}
        <div className="mb-8">
          <label className="block text-xl font-bold mb-4" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
            Target Format
          </label>
          <div className="relative">
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full px-4 py-4 border-2 rounded-xl font-medium transition-all duration-300 appearance-none bg-no-repeat bg-right pr-12"
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
                color: colors.text,
                fontFamily: 'Inter, sans-serif',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              {SUPPORTED_FORMATS.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label} - {format.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'scale-105' : 'hover:scale-102'
          }`}
          style={{
            backgroundColor: isDragActive ? (isDarkMode ? '#1e293b' : '#f1f5f9') : colors.cardBg,
            borderColor: isDragActive ? '#334155' : colors.cardBorder,
          }}
        >
          <input {...getInputProps()} />
          <div className="text-6xl mb-6 transition-all duration-300">
            📁
          </div>
          {isDragActive ? (
            <p className="text-2xl font-bold mb-2" style={{ color: '#334155', fontFamily: 'Poppins, sans-serif' }}>
              Drop the images here...
            </p>
          ) : (
            <div>
              <p className="text-2xl font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                Drag & drop images here, or <span className="text-blue-600">click to select</span>
              </p>
              <p className="text-lg font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
                Supports PNG, JPEG, WebP, HEIC, HEIF, GIF, PSD, TIFF, BMP, ICO, AVIF, and RAW formats
              </p>
            </div>
          )}
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
                Selected Files ({selectedFiles.length})
              </h3>
              <button
                onClick={clearAllFiles}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                style={{
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                  color: colors.textMuted,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            </div>
            <div className="space-y-4">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300"
                  style={{
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: colors.cardBorder,
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">📄</div>
                    <div>
                      <p className="font-bold text-lg" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                        {file.name}
                      </p>
                      <p className="font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 rounded-lg transition-all duration-300 hover:bg-red-100 hover:text-red-600"
                    style={{ color: colors.textMuted }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Convert Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={convertImages}
                disabled={isConverting}
                className={`
                  flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xl tracking-wide transition-all duration-300 min-w-[240px]
                  ${isConverting 
                    ? 'cursor-not-allowed' 
                    : 'hover:-translate-y-1 hover:shadow-2xl'
                  }
                `}
                style={{
                  backgroundColor: isConverting ? (isDarkMode ? '#374151' : '#cbd5e1') : '#334155',
                  color: isConverting ? (isDarkMode ? '#6b7280' : '#94a3b8') : 'white',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    Convert to {targetFormat.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conversion Results */}
      {conversionResults.length > 0 && (
        <div 
          className="border-2 rounded-3xl p-8 shadow-lg"
          style={{
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-black" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
              Conversion Results
            </h3>
            {conversionResults.length > 1 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <Archive className="w-5 h-5" />
                Download All as ZIP
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {conversionResults.map((result, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300"
                style={{
                  backgroundColor: isDarkMode ? '#065f46' : '#d1fae5',
                  borderColor: '#059669',
                }}
              >
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-bold text-lg" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                      {result.originalName}
                    </p>
                    <p className="font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
                      Converted to {result.convertedName} ({result.size})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(result)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    backgroundColor: '#334155',
                    color: 'white',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 