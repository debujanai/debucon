'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { Download, Music2, Settings, X, CheckCircle, Loader2, Clock, AlertCircle, Archive } from 'lucide-react'

interface ConversionResult {
  originalName: string
  convertedName: string
  downloadUrl: string
  size: string
  blob: Blob
}

interface FileProcessingState {
  file: File
  status: 'pending' | 'converting' | 'completed' | 'error'
  result?: ConversionResult
  error?: string
  progress: number
}

interface AudioConverterProps {
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

const SUPPORTED_AUDIO_OUTPUTS = [
  { value: 'mp3', label: 'MP3 (libmp3lame)', preset: 'mp3_v2' },
  { value: 'wav', label: 'WAV (PCM 16-bit)', preset: 'wav_pcm_s16le' },
  { value: 'ogg', label: 'OGG (Opus)', preset: 'ogg_opus_128k' },
  { value: 'flac', label: 'FLAC (lossless)', preset: 'flac_lvl5' },
  { value: 'm4a', label: 'M4A (AAC)', preset: 'm4a_aac_192k' },
]

export default function AudioConverter({ isDarkMode, colors }: AudioConverterProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileStates, setFileStates] = useState<FileProcessingState[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [conversionResults, setConversionResults] = useState<ConversionResult[]>([])
  const [targetFormat, setTargetFormat] = useState<string>('mp3')
  const [bitrateKbps, setBitrateKbps] = useState<number>(192)
  const [sampleRate, setSampleRate] = useState<number>(48000)
  const [channels, setChannels] = useState<number>(2)
  const [maxConcurrent, setMaxConcurrent] = useState<number>(2)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [ffmpegReady, setFfmpegReady] = useState(false)
  const [ffmpegProgress, setFfmpegProgress] = useState<number>(0)

  const ensureFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return
    const ffmpeg = new FFmpeg()
    ffmpeg.on('progress', ({ progress }) => {
      setFfmpegProgress(Math.min(99, Math.round(((progress as number) || 0) * 100)))
    })
    await ffmpeg.load()
    ffmpegRef.current = ffmpeg
    setFfmpegReady(true)
  }, [])

  useEffect(() => {
    // Lazy load on first interaction; no-op here to avoid upfront WASM cost
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const audioFiles = acceptedFiles.filter(file => 
      file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|ogg|opus|flac|aiff?|wma|webm|mp4)$/i)
    )
    setSelectedFiles(prev => [...prev, ...audioFiles])
    const newStates = audioFiles.map(file => ({ file, status: 'pending' as const, progress: 0 }))
    setFileStates(prev => [...prev, ...newStates])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.aif', '.aiff', '.wma', '.webm', '.mp4']
    },
    multiple: true
  })

  const buildArgs = useCallback((inputName: string, outputName: string) => {
    // Common audio parameters
    const common = ['-ar', String(sampleRate), '-ac', String(channels)]
    switch (targetFormat) {
      case 'mp3':
        return ['-i', inputName, ...common, '-c:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`, outputName]
      case 'wav':
        return ['-i', inputName, ...common, '-c:a', 'pcm_s16le', outputName]
      case 'ogg':
        return ['-i', inputName, ...common, '-c:a', 'libopus', '-b:a', `${bitrateKbps}k`, outputName]
      case 'flac':
        return ['-i', inputName, ...common, '-c:a', 'flac', '-compression_level', '5', outputName]
      case 'm4a':
        return ['-i', inputName, ...common, '-c:a', 'aac', '-b:a', `${bitrateKbps}k`, outputName]
      default:
        return ['-i', inputName, ...common, '-c:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`, outputName]
    }
  }, [bitrateKbps, channels, sampleRate, targetFormat])

  const convertSingle = useCallback(async (state: FileProcessingState, globalIndex: number): Promise<ConversionResult> => {
    await ensureFFmpeg()
    const ffmpeg = ffmpegRef.current!

    const inputName = `input_${globalIndex}`
    const outputName = `output_${globalIndex}.${targetFormat}`

    const progressInterval = setInterval(() => {
      setFileStates(prev => prev.map((s, i) => i === globalIndex && s.status === 'converting' ? { ...s, progress: Math.min(95, s.progress + Math.random() * 15 + 5) } : s))
    }, 250)

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(state.file))
      const args = buildArgs(inputName, outputName)
      await ffmpeg.exec(args)
      const data = await ffmpeg.readFile(outputName)
      const src = data as Uint8Array
      const copy = new Uint8Array(src.length)
      copy.set(src)
      const blob = new Blob([copy.buffer], { type: `audio/${targetFormat === 'm4a' ? 'mp4' : targetFormat}` })
      const url = URL.createObjectURL(blob)

      clearInterval(progressInterval)
      setFileStates(prev => prev.map((s, i) => i === globalIndex ? { ...s, progress: 100 } : s))

      return {
        originalName: state.file.name,
        convertedName: `${state.file.name.replace(/\.[^.]+$/, '')}.${targetFormat}`,
        downloadUrl: url,
        size: `${(blob.size / 1024).toFixed(1)} KB`,
        blob
      }
    } catch (e) {
      clearInterval(progressInterval)
      throw e
    }
  }, [buildArgs, ensureFFmpeg, targetFormat])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setFileStates(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setSelectedFiles([])
    setFileStates([])
    setConversionResults([])
  }

  const convertAll = async () => {
    if (fileStates.length === 0) return
    setIsConverting(true)
    setConversionResults([])
    setFileStates(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0, result: undefined, error: undefined })))

    try {
      const chunks: FileProcessingState[][] = []
      for (let i = 0; i < fileStates.length; i += maxConcurrent) {
        chunks.push(fileStates.slice(i, i + maxConcurrent))
      }

      const allResults: ConversionResult[] = []
      for (const chunk of chunks) {
        const indices = chunk.map(s => fileStates.indexOf(s))
        setFileStates(prev => prev.map((s, i) => indices.includes(i) ? { ...s, status: 'converting', progress: 0 } : s))
        const promises = chunk.map(async (s) => {
          const idx = fileStates.indexOf(s)
          try {
            const res = await convertSingle(s, idx)
            setFileStates(prev => prev.map((ps, i) => i === idx ? { ...ps, status: 'completed', result: res, progress: 100 } : ps))
            return res
          } catch (err) {
            setFileStates(prev => prev.map((ps, i) => i === idx ? { ...ps, status: 'error', error: err instanceof Error ? err.message : 'Conversion failed', progress: 0 } : ps))
            return null
          }
        })
        const results = await Promise.all(promises)
        allResults.push(...results.filter((r): r is ConversionResult => r !== null))
      }
      setConversionResults(allResults)
    } finally {
      setIsConverting(false)
    }
  }

  const downloadFile = (result: ConversionResult) => {
    const a = document.createElement('a')
    a.href = result.downloadUrl
    a.download = result.convertedName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const downloadAll = async () => {
    if (conversionResults.length === 0) return
    const zip = new JSZip()
    for (const r of conversionResults) {
      zip.file(r.convertedName, r.blob)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted_audio.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusDisplay = (state: FileProcessingState) => {
    switch (state.status) {
      case 'pending':
        return { icon: Clock, color: colors.textMuted, bg: isDarkMode ? '#374151' : '#f1f5f9', animate: false }
      case 'converting':
        return { icon: Loader2, color: '#3b82f6', bg: isDarkMode ? '#1e3a8a' : '#dbeafe', animate: true }
      case 'completed':
        return { icon: CheckCircle, color: '#059669', bg: isDarkMode ? '#065f46' : '#d1fae5', animate: false }
      case 'error':
        return { icon: AlertCircle, color: '#dc2626', bg: isDarkMode ? '#7f1d1d' : '#fee2e2', animate: false }
      default:
        return { icon: Clock, color: colors.textMuted, bg: colors.cardBg, animate: false }
    }
  }

  const ProgressBar = ({ progress, status }: { progress: number, status: string }) => {
    if (status !== 'converting') return null
    return (
      <div className="mt-3 w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-blue-600">Converting...</span>
          <span className="text-xs font-medium text-blue-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-2 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
            style={{ width: `${progress}%`, boxShadow: progress > 0 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div 
        className="border-2 rounded-3xl p-12 mb-12 transition-all duration-300 shadow-lg"
        style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
            Convert Audio
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 border-2"
            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.text, fontFamily: 'Poppins, sans-serif' }}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {showSettings && (
          <div 
            className="mb-8 p-6 rounded-2xl border-2"
            style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.cardBorder }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                  Bitrate: {bitrateKbps} kbps
                </label>
                <input type="range" min="64" max="320" value={bitrateKbps} onChange={(e) => setBitrateKbps(Number(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                  Sample Rate: {sampleRate} Hz
                </label>
                <select value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value))} className="w-full px-4 py-3 border-2 rounded-xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.text }}>
                  {[44100, 48000].map(sr => (<option key={sr} value={sr}>{sr}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                  Channels: {channels}
                </label>
                <select value={channels} onChange={(e) => setChannels(Number(e.target.value))} className="w-full px-4 py-3 border-2 rounded-xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.text }}>
                  {[1, 2].map(c => (<option key={c} value={c}>{c === 1 ? 'Mono (1)' : 'Stereo (2)'}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                  Concurrent Conversions: {maxConcurrent}
                </label>
                <input type="range" min="1" max="3" value={maxConcurrent} onChange={(e) => setMaxConcurrent(Number(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer" />
                <p className="text-xs mt-1" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>Lower values reduce CPU spikes</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <label className="block text-xl font-bold mb-4" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
            Target Format
          </label>
          <div className="relative">
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full px-4 py-4 border-2 rounded-xl font-medium transition-all duration-300 appearance-none bg-no-repeat bg-right pr-12"
              style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.text, fontFamily: 'Inter, sans-serif' }}
            >
              {SUPPORTED_AUDIO_OUTPUTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'scale-105' : 'hover:scale-102'}`}
          style={{ backgroundColor: isDragActive ? (isDarkMode ? '#1e293b' : '#f1f5f9') : colors.cardBg, borderColor: isDragActive ? '#334155' : colors.cardBorder }}
        >
          <input {...getInputProps()} />
          <div className="text-6xl mb-6 transition-all duration-300">🎵</div>
          {isDragActive ? (
            <p className="text-2xl font-bold mb-2" style={{ color: '#334155', fontFamily: 'Poppins, sans-serif' }}>
              Drop the audio files here...
            </p>
          ) : (
            <div>
              <p className="text-2xl font-bold mb-3" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>
                Drag & drop audio here, or <span className="text-blue-600">click to select</span>
              </p>
              <p className="text-lg font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
                Supports MP3, WAV, M4A/AAC, OGG/Opus, FLAC, WEBM and more
              </p>
            </div>
          )}
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
                Selected Files ({selectedFiles.length})
              </h3>
              <button
                onClick={clearAll}
                disabled={isConverting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.textMuted, fontFamily: 'Poppins, sans-serif' }}
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            </div>
            <div className="space-y-4">
              {fileStates.map((fs, index) => {
                const s = getStatusDisplay(fs)
                const Icon = s.icon
                return (
                  <div key={index} className="p-4 rounded-xl border-2 transition-all duration-300" style={{ backgroundColor: s.bg, borderColor: fs.status === 'completed' ? '#059669' : fs.status === 'error' ? '#dc2626' : fs.status === 'converting' ? '#3b82f6' : colors.cardBorder }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Icon className={`w-6 h-6 ${s.animate ? 'animate-spin' : ''}`} style={{ color: s.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-lg" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>{fs.file.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>{(fs.file.size / 1024).toFixed(1)} KB</p>
                            {fs.status === 'converting' && (<span className="text-blue-600 font-medium animate-pulse">Converting...</span>)}
                            {fs.status === 'completed' && fs.result && (<span className="text-green-600 font-medium">→ {fs.result.size}</span>)}
                            {fs.status === 'error' && (<span className="text-red-600 font-medium text-sm">{fs.error}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fs.status === 'completed' && fs.result && (
                          <button onClick={() => downloadFile(fs.result!)} className="flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all duration-300 text-sm" style={{ backgroundColor: '#334155', color: 'white', fontFamily: 'Poppins, sans-serif' }}>
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                        {!isConverting && (
                          <button onClick={() => removeFile(index)} className="p-2 rounded-lg transition-all duration-300 hover:bg-red-100 hover:text-red-600" style={{ color: colors.textMuted }}>
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <ProgressBar progress={fs.progress} status={fs.status} />
                  </div>
                )
              })}
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={convertAll}
                disabled={isConverting}
                className={`
                  flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xl tracking-wide transition-all duration-300 min-w-[240px]
                  ${isConverting ? 'cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-2xl'}
                `}
                style={{ backgroundColor: isConverting ? (isDarkMode ? '#374151' : '#cbd5e1') : '#334155', color: isConverting ? (isDarkMode ? '#6b7280' : '#94a3b8') : 'white', fontFamily: 'Poppins, sans-serif' }}
              >
                {isConverting ? (<><Loader2 className="w-6 h-6 animate-spin" /> Converting...</>) : (<><Music2 className="w-6 h-6" /> Convert to {targetFormat.toUpperCase()}</>)}
              </button>
            </div>
          </div>
        )}
      </div>

      {conversionResults.length > 0 && (
        <div className="border-2 rounded-3xl p-8 shadow-lg" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-black" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>Conversion Results</h3>
            {conversionResults.length > 1 && (
              <button onClick={downloadAll} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ backgroundColor: '#059669', color: 'white', fontFamily: 'Poppins, sans-serif' }}>
                <Archive className="w-5 h-5" />
                Download All as ZIP
              </button>
            )}
          </div>
          <div className="space-y-4">
            {conversionResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300" style={{ backgroundColor: isDarkMode ? '#065f46' : '#d1fae5', borderColor: '#059669' }}>
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-bold text-lg" style={{ color: colors.text, fontFamily: 'Poppins, sans-serif' }}>{r.originalName}</p>
                    <p className="font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
                      Converted to {r.convertedName} ({r.size})
                    </p>
                  </div>
                </div>
                <button onClick={() => downloadFile(r)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ backgroundColor: '#334155', color: 'white', fontFamily: 'Poppins, sans-serif' }}>
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


