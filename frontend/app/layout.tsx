import type { Metadata } from 'next'
import { Fraunces, Geist_Mono, Hanken_Grotesk } from 'next/font/google'
import React from 'react'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Life OS — Your life, anticipated and handled',
  description:
    'The autonomous operating system for everyday life. Connect once. Build your Life Graph. Let bounded agents act within rules you control.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${geistMono.variable}`}
    >
      <body className="bg-ink text-mist font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
