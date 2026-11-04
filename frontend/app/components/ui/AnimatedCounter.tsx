'use client'

import React, { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value

    const controls = animate(from, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1], // outExpo approximation
      onUpdate(latest) {
        setDisplayed(latest)
      },
    })

    return () => controls.stop()
  }, [value])

  return (
    <span className="font-mono">
      {prefix}
      {displayed.toFixed(decimals)}
      {suffix}
    </span>
  )
}

export default AnimatedCounter
