import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DivvyUp - Split Bills Instantly',
  description: 'Upload your receipt, invite friends, and split bills fairly in seconds. No math required.',
  keywords: ['bill split', 'split check', 'share tab', 'receipt', 'venmo'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  )
}
