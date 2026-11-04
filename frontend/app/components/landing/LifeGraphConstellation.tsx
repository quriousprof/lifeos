'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const nodes = [
  { id: 'user',   x: 240, y: 210, label: 'You',           icon: '◉', color: 'mist',     size: 44 },
  { id: 'gmail',  x: 100, y: 90,  label: 'Gmail',         icon: '✉', color: 'signal',   size: 32 },
  { id: 'cal',    x: 370, y: 80,  label: 'Calendar',      icon: '□', color: 'signal',   size: 32 },
  { id: 'subs',   x: 60,  y: 240, label: 'Subscriptions', icon: '↻', color: 'mist',     size: 32 },
  { id: 'trig',   x: 400, y: 190, label: 'Triggers',      icon: '⚡', color: 'signal',   size: 32 },
  { id: 'policy', x: 380, y: 330, label: 'Policy',        icon: '⬡', color: 'mist',     size: 32 },
  { id: 'zcash',  x: 160, y: 350, label: 'Zcash',         icon: 'ℤ', color: 'shielded', size: 32 },
  { id: 'bfill',  x: 100, y: 330, label: 'Bitrefill',     icon: '⚙', color: 'shielded', size: 28 },
]

const colorMap: Record<string, { fill: string; stroke: string }> = {
  mist:     { fill: 'rgba(232,230,223,0.15)', stroke: 'rgba(232,230,223,0.4)' },
  signal:   { fill: 'rgba(244,183,40,0.15)',  stroke: 'rgba(244,183,40,0.4)' },
  shielded: { fill: 'rgba(53,201,165,0.15)',  stroke: 'rgba(53,201,165,0.4)' },
}

const textColorMap: Record<string, string> = {
  mist:     '#E8E6DF',
  signal:   '#F4B728',
  shielded: '#35C9A5',
}

const userNode = nodes[0]
const edges = nodes.slice(1).map((n) => ({ from: userNode, to: n }))

export function LifeGraphConstellation() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 480 420"
        width="480"
        height="420"
        className="w-full max-w-[480px] h-auto"
        aria-hidden="true"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-pulse" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const length = Math.sqrt(
            Math.pow(edge.to.x - edge.from.x, 2) + Math.pow(edge.to.y - edge.from.y, 2)
          )
          return (
            <line
              key={`edge-${i}`}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke="rgba(232,230,223,0.12)"
              strokeWidth="1"
              filter="url(#glow)"
              strokeDasharray={length}
              strokeDashoffset={mounted ? 0 : length}
              style={{
                transition: mounted
                  ? `stroke-dashoffset 1.5s ease ${i * 0.2}s`
                  : 'none',
              }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node, index) => {
          const { fill, stroke } = colorMap[node.color]
          const textColor = textColorMap[node.color]
          const isPulse = node.id === 'trig' || node.id === 'gmail'

          return (
            <motion.g
              key={node.id}
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 3 + index * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Pulse ring for active nodes */}
              {isPulse && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size / 2 + 4}
                  fill="none"
                  stroke="rgba(244,183,40,0.6)"
                  strokeWidth="1.5"
                  animate={{
                    opacity: [1, 0],
                    scale: [1, 1.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size / 2}
                fill={fill}
                stroke={stroke}
                strokeWidth="1.5"
                filter="url(#glow)"
              />

              {/* Node icon */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={node.size * 0.4}
                fill={textColor}
                fontFamily="var(--font-jb-mono)"
              >
                {node.icon}
              </text>

              {/* Node label */}
              <text
                x={node.x}
                y={node.y + node.size / 2 + 14}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(138,143,153,0.8)"
                fontFamily="var(--font-jb-mono)"
              >
                {node.label}
              </text>
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}
