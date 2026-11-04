'use client'

import { motion } from 'motion/react'

const GRADIENT =
  'radial-gradient(ellipse 65% 45% at 18% 55%, rgba(244,183,40,0.07) 0%, transparent 70%), ' +
  'radial-gradient(ellipse 55% 65% at 82% 18%, rgba(53,201,165,0.06) 0%, transparent 70%), ' +
  'radial-gradient(ellipse 75% 55% at 58% 82%, rgba(53,201,165,0.05) 0%, transparent 70%)'

export function AuroraMesh() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute blur-[48px]"
        style={{ inset: '-20%', background: GRADIENT }}
        animate={{
          x: ['0%', '3%', '-2%', '4%', '-1%'],
          y: ['0%', '-3%', '4%', '1%', '-2%'],
          scale: [1, 1.04, 0.97, 1.06, 1.02],
          opacity: [0.6, 0.75, 0.85, 0.7, 0.9],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
    </div>
  )
}
