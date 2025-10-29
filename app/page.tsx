'use client'

import { useState, useEffect } from 'react'
import ImageConverter from '@/components/ImageConverter'
import AudioConverter from '@/components/AudioConverter'
import { Moon, Sun } from 'lucide-react'

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('debucon-theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    }
  }, [])

  // Save theme preference
  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem('debucon-theme', newMode ? 'dark' : 'light')
  }

  // Theme-aware colors
  const getThemeColors = () => {
    if (isDarkMode) {
      return {
        bg: '#1a1a1a',
        text: '#e2e8f0',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        cardBg: '#0f172a',
        cardBorder: '#334155',
      }
    }
    return {
      bg: '#ffffff',
      text: '#2c3e50',
      textSecondary: '#5a6c7d',
      textMuted: '#64748b',
      cardBg: '#f8fafc',
      cardBorder: '#bdc9d7',
    }
  }

  const colors = getThemeColors()
  const [activeTool, setActiveTool] = useState<'image' | 'audio'>('image')

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      
      <div 
        className="min-h-screen overflow-x-hidden transition-colors duration-300" 
        style={{ 
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', 
          lineHeight: '1.6',
          backgroundColor: colors.bg,
          color: colors.text
        }}
      >
        {/* Theme Toggle */}
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={toggleTheme}
            className="p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-lg border-2"
            style={{
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
              color: colors.text
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </div>

        <div className="max-w-[1000px] mx-auto px-10 py-15 min-h-screen flex flex-col justify-center">
          
          {/* Header */}
          <div className="text-center mb-20 opacity-0 animate-[fadeInUp_1s_ease_0.2s_forwards]">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="Debucon Logo" 
                  className="w-48 h-48 object-contain opacity-0 animate-[fadeInUp_1s_ease_0.1s_forwards] hover:-translate-y-0.5 hover:scale-105 transition-all duration-300 filter drop-shadow-[0_4px_20px_rgba(44,62,80,0.15)]"
                  style={{ 
                    imageRendering: 'auto'
                  }}
                />
              </div>
            </div>
            <h1 className="text-6xl font-black mb-5 tracking-tight relative" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
              DEBUCON
            </h1>
            <p className="text-xl font-medium mb-0" style={{ color: colors.textSecondary, fontFamily: 'Inter, sans-serif' }}>
              Convert images between PNG, JPEG, WebP, HEIC, GIF, PSD and more formats
            </p>
          </div>

          {/* Tool Switcher */}
          <div className="mt-6 mb-8 flex items-center justify-center opacity-0 animate-[fadeInUp_1s_ease_0.45s_forwards]">
            <div
              className="relative inline-flex p-1 rounded-2xl border-2"
              style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
              role="tablist"
              aria-label="Converter switch"
            >
              <button
                onClick={() => setActiveTool('image')}
                className={`px-5 py-2 rounded-xl font-bold transition-all duration-300 ${activeTool === 'image' ? 'shadow' : ''}`}
                style={{
                  backgroundColor: activeTool === 'image' ? (isDarkMode ? '#1f2937' : '#e5e7eb') : 'transparent',
                  color: colors.text,
                  fontFamily: 'Poppins, sans-serif'
                }}
                role="tab"
                aria-selected={activeTool === 'image'}
              >
                Image
              </button>
              <button
                onClick={() => setActiveTool('audio')}
                className={`px-5 py-2 rounded-xl font-bold transition-all duration-300 ${activeTool === 'audio' ? 'shadow' : ''}`}
                style={{
                  backgroundColor: activeTool === 'audio' ? (isDarkMode ? '#1f2937' : '#e5e7eb') : 'transparent',
                  color: colors.text,
                  fontFamily: 'Poppins, sans-serif'
                }}
                role="tab"
                aria-selected={activeTool === 'audio'}
              >
                Audio
              </button>
            </div>
          </div>

          {/* Active Converter */}
          <div className="opacity-0 animate-[fadeInUp_1s_ease_0.5s_forwards]">
            {activeTool === 'image' ? (
              <ImageConverter isDarkMode={isDarkMode} colors={colors} />
            ) : (
              <AudioConverter isDarkMode={isDarkMode} colors={colors} />
            )}
          </div>

          {/* Supported Formats Grid */}
          <div className="mt-16 text-center opacity-0 animate-[fadeInUp_1s_ease_0.6s_forwards]">
            <h2 className="text-3xl font-black mb-8" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
              Supported Formats {activeTool === 'image' ? '(Image)' : '(Audio)'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {(activeTool === 'image'
                ? [
                    { name: 'PNG', desc: 'Lossless compression', emoji: '🖼️' },
                    { name: 'JPEG', desc: 'High compression', emoji: '📷' },
                    { name: 'JPG', desc: 'High compression', emoji: '📱' },
                    { name: 'WebP', desc: 'Modern format', emoji: '🌐' },
                    { name: 'HEIC', desc: 'Apple format', emoji: '🍎' },
                    { name: 'HEIF', desc: 'High efficiency', emoji: '⚡' },
                    { name: 'GIF', desc: 'Animated images', emoji: '🎬' },
                    { name: 'PSD', desc: 'Photoshop files', emoji: '🎨' },
                    { name: 'TIFF', desc: 'High quality', emoji: '📸' },
                    { name: 'BMP', desc: 'Bitmap format', emoji: '🖼️' },
                    { name: 'ICO', desc: 'Icon format', emoji: '🔲' },
                    { name: 'AVIF', desc: 'Next-gen format', emoji: '🚀' }
                  ]
                : [
                    { name: 'MP3', desc: 'Popular, lossy', emoji: '🎧' },
                    { name: 'WAV', desc: 'Uncompressed PCM', emoji: '📼' },
                    { name: 'OGG/Opus', desc: 'Modern, efficient', emoji: '🌀' },
                    { name: 'FLAC', desc: 'Lossless compression', emoji: '💽' },
                    { name: 'M4A/AAC', desc: 'Widely supported', emoji: '📱' },
                    { name: 'WEBM/Opus', desc: 'Web-friendly', emoji: '🌐' },
                    { name: 'AIFF', desc: 'Uncompressed', emoji: '🎛️' },
                    { name: 'AAC', desc: 'Lossy codec', emoji: '🎵' }
                  ]
              ).map((format, index) => (
                <div 
                  key={format.name} 
                  className="border-2 rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    backgroundColor: colors.cardBg,
                    borderColor: colors.cardBorder,
                    animationDelay: `${0.8 + index * 0.1}s`
                  }}
                >
                  <div className="text-2xl mb-2">{format.emoji}</div>
                  <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif', color: colors.text }}>
                    {format.name}
                  </h3>
                  <p className="text-sm" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
                    {format.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 opacity-0 animate-[fadeInUp_1s_ease_1s_forwards]">
            <p className="text-sm opacity-80 font-medium" style={{ color: colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
              Debucon by Debu
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  )
} 