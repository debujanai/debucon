import { ImageIcon } from 'lucide-react'

interface HeaderProps {
  isDarkMode?: boolean
  colors?: {
    bg: string
    text: string
    textSecondary: string
    cardBg: string
    cardBorder: string
  }
}

export default function Header({ isDarkMode, colors }: HeaderProps) {
  const defaultColors = {
    bg: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#5a6c7d',
    cardBg: '#f8fafc',
    cardBorder: '#bdc9d7',
  }

  const themeColors = colors || defaultColors

  return (
    <header 
      className="sticky top-0 z-40 backdrop-blur-md border-b-2 transition-colors duration-300"
      style={{
        backgroundColor: `${themeColors.cardBg}cc`,
        borderColor: themeColors.cardBorder,
      }}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }}
            >
              <ImageIcon className="w-6 h-6" style={{ color: '#334155' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: themeColors.text }}>
              Debucon
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a 
              href="#converter" 
              className="font-medium transition-colors duration-300 hover:text-blue-600"
              style={{ color: themeColors.textSecondary, fontFamily: 'Inter, sans-serif' }}
            >
              Converter
            </a>
            <a 
              href="#formats" 
              className="font-medium transition-colors duration-300 hover:text-blue-600"
              style={{ color: themeColors.textSecondary, fontFamily: 'Inter, sans-serif' }}
            >
              Formats
            </a>
            <a 
              href="#features" 
              className="font-medium transition-colors duration-300 hover:text-blue-600"
              style={{ color: themeColors.textSecondary, fontFamily: 'Inter, sans-serif' }}
            >
              Features
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
} 