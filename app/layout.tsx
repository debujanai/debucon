import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Debucon by Debu',
  description: 'Convert images between PNG, JPEG, WebP, HEIC, GIF, PSD and more formats easily. Fast, secure, and completely free.',
  keywords: ['image converter', 'png to jpeg', 'webp to png', 'heic converter', 'gif converter', 'psd converter', 'image format converter', 'debucon'],
  authors: [{ name: 'Debu' }],
  icons: {
    icon: '/logo1.png',
    shortcut: '/logo1.png',
    apple: '/logo1.png',
  },
  openGraph: {
    title: 'Debucon by Debu',
    description: 'Convert images between PNG, JPEG, WebP, HEIC, GIF, PSD and more formats easily. Fast, secure, and completely free.',
    type: 'website',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo1.png" type="image/png" />
        <link rel="shortcut icon" href="/logo1.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo1.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
} 