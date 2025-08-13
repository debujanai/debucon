interface FooterProps {
  isDarkMode?: boolean
  colors?: {
    bg: string
    text: string
    textSecondary: string
    textMuted: string
    cardBg: string
    cardBorder: string
  }
}

export default function Footer({ isDarkMode, colors }: FooterProps) {
  const defaultColors = {
    bg: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#5a6c7d',
    textMuted: '#64748b',
    cardBg: '#f8fafc',
    cardBorder: '#bdc9d7',
  }

  const themeColors = colors || defaultColors

  return (
    <footer 
      className="py-12 mt-20 border-t-2"
      style={{
        backgroundColor: isDarkMode ? '#0f172a' : '#1a202c',
        borderColor: themeColors.cardBorder,
        color: '#e2e8f0'
      }}
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-black mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Debucon Image Converter
            </h3>
            <p className="text-gray-300 mb-6 font-medium leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              A powerful, free online image converter that supports all major image formats including HEIC, GIF, PSD, and RAW formats. 
              Convert your images quickly and securely without any registration required.
            </p>
            <div className="flex space-x-6">
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors duration-300 font-medium"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Privacy Policy
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors duration-300 font-medium"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Terms of Service
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-black mb-4 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Popular Conversions
            </h4>
            <ul className="space-y-3 text-gray-300 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              <li className="hover:text-white transition-colors cursor-pointer">PNG to JPEG</li>
              <li className="hover:text-white transition-colors cursor-pointer">HEIC to JPEG</li>
              <li className="hover:text-white transition-colors cursor-pointer">WebP to PNG</li>
              <li className="hover:text-white transition-colors cursor-pointer">GIF to MP4</li>
              <li className="hover:text-white transition-colors cursor-pointer">PSD to PNG</li>
              <li className="hover:text-white transition-colors cursor-pointer">RAW to JPEG</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black mb-4 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Features
            </h4>
            <ul className="space-y-3 text-gray-300 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              <li className="hover:text-white transition-colors cursor-pointer">Batch Processing</li>
              <li className="hover:text-white transition-colors cursor-pointer">ZIP Downloads</li>
              <li className="hover:text-white transition-colors cursor-pointer">Quality Control</li>
              <li className="hover:text-white transition-colors cursor-pointer">Dark/Light Theme</li>
              <li className="hover:text-white transition-colors cursor-pointer">No Registration</li>
              <li className="hover:text-white transition-colors cursor-pointer">100% Free</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            &copy; 2024 Debucon by Debu. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
} 