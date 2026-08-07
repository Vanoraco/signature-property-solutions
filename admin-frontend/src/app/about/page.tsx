import type { Metadata } from 'next'
import { Cinzel, Cormorant_Garamond } from 'next/font/google'
import AboutServicesPage from '@/components/about/AboutServicesPage'

const cinzel = Cinzel({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--as-cinzel',
})

const cormorantGaramond = Cormorant_Garamond({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--as-cormorant',
})

export const metadata: Metadata = {
  title: 'About & Services — Signature Property Solutions',
  description:
    'About Signature Property Solutions and our services: luxury furnished apartments, residential and commercial property sales and rentals, property management, marketing, investment advisory, consultancy, and corporate relocation in Addis Ababa, Ethiopia.',
}

export default function Page() {
  return <AboutServicesPage fontsClassName={`${cinzel.variable} ${cormorantGaramond.variable}`} />
}
