'use client'

import { motion, useReducedMotion } from 'motion/react'
import { BrandIcon } from '@/app/components/ui/BrandIcon'
import { ICON, type IconKey } from '@/app/lib/icons'

const CX = 400
const CY = 372
const HUB_R = 50
const OUTER_R = 350
const RINGS = [172, 272, 350]

type NodeColor = 'mist' | 'signal' | 'shielded'

type GraphNode = {
  id: string
  label: string
  note: string
  angle: number
  radius: number
  size: number
  color: NodeColor
  confidence: number
  bend: number
  active?: boolean
} & ({ kind: 'brand'; slug: string } | { kind: 'icon'; iconKey: IconKey })

// Angle in degrees (screen space, y down). Radius places the node on a ring:
// 172 = context sources · 272 = decision layer · beyond = settlement.
const NODES: GraphNode[] = [
  { id: 'gmail',        label: 'Gmail',         note: '2 receipts',    angle: -108, radius: 172, size: 66, color: 'signal',   confidence: 0.78, bend:  0.16, active: true,  kind: 'brand', slug: 'gmail' },
  { id: 'calendar',     label: 'Calendar',      note: 'SIN trip',      angle: -14,  radius: 272, size: 62, color: 'signal',   confidence: 0.66, bend: -0.14, kind: 'brand', slug: 'calendar' },
  { id: 'subscriptions',label: 'Subscriptions', note: '5 active',      angle: 132,  radius: 172, size: 62, color: 'mist',     confidence: 0.91, bend:  0.13, kind: 'icon',  iconKey: 'subscriptions' },
  { id: 'triggers',     label: 'Triggers',      note: 'armed',         angle: -58,  radius: 272, size: 60, color: 'signal',   confidence: 0.84, bend:  0.18, active: true,  kind: 'icon',  iconKey: 'triggers' },
  { id: 'policy',       label: 'Policy',        note: '$25 cap',       angle: 58,   radius: 272, size: 60, color: 'mist',     confidence: 0.96, bend: -0.17, kind: 'icon',  iconKey: 'policy' },
  { id: 'audit',        label: 'Audit',         note: 'hash-chained',  angle: 122,  radius: 272, size: 58, color: 'mist',     confidence: 0.99, bend:  0.15, kind: 'icon',  iconKey: 'audit' },
  { id: 'bitrefill',    label: 'Bitrefill',     note: 'live catalog',  angle: 180,  radius: 272, size: 60, color: 'shielded', confidence: 0.72, bend: -0.16, kind: 'brand', slug: 'bitrefill' },
  { id: 'zcash',        label: 'Zcash',         note: 'shielded',      angle: 238,  radius: 272, size: 62, color: 'shielded', confidence: 0.88, bend:  0.19, kind: 'brand', slug: 'zcash' },
]

const LINKS: [string, string][] = [
  ['gmail', 'triggers'],
  ['calendar', 'policy'],
  ['subscriptions', 'bitrefill'],
  ['zcash', 'policy'],
  ['audit', 'subscriptions'],
]

const COLOR: Record<NodeColor, { hex: string; rgb: string }> = {
  mist:     { hex: '#E8E6DF', rgb: '232,230,223' },
  signal:   { hex: '#F4B728', rgb: '244,183,40' },
  shielded: { hex: '#35C9A5', rgb: '53,201,165' },
}

const MONO = 'var(--font-geist-mono)'
const HubIcon = ICON.user

function polar(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180
  return { x: CX + Math.cos(a) * radius, y: CY + Math.sin(a) * radius }
}

const nodes = NODES.map((n) => ({ ...n, ...polar(n.angle, n.radius) }))
const nodeById = new Map(nodes.map((n) => [n.id, n]))

function spokePath(node: (typeof nodes)[number]) {
  const dx = node.x - CX
  const dy = node.y - CY
  const dist = Math.hypot(dx, dy)
  const ux = dx / dist
  const uy = dy / dist
  const sx = CX + ux * (HUB_R + 16)
  const sy = CY + uy * (HUB_R + 16)
  const ex = node.x - ux * (node.size / 2 + 12)
  const ey = node.y - uy * (node.size / 2 + 12)
  const mx = (sx + ex) / 2
  const my = (sy + ey) / 2
  const bend = dist * node.bend
  return `M ${sx} ${sy} Q ${mx - uy * bend} ${my + ux * bend} ${ex} ${ey}`
}

function linkPath(aId: string, bId: string) {
  const a = nodeById.get(aId)!
  const b = nodeById.get(bId)!
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy)
  const ux = dx / dist
  const uy = dy / dist
  const sx = a.x + ux * (a.size / 2 + 8)
  const sy = a.y + uy * (a.size / 2 + 8)
  const ex = b.x - ux * (b.size / 2 + 8)
  const ey = b.y - uy * (b.size / 2 + 8)
  const bend = dist * 0.14
  return `M ${sx} ${sy} Q ${(sx + ex) / 2 - uy * bend} ${(sy + ey) / 2 + ux * bend} ${ex} ${ey}`
}

const spokes = nodes.map((node, i) => ({ id: node.id, d: spokePath(node), index: i, color: node.color }))
const crossLinks = LINKS.map(([a, b]) => ({ id: `${a}-${b}`, d: linkPath(a, b) }))

const ticks = Array.from({ length: 72 }, (_, i) => i * 5)
const ghostNodes: [number, number][] = [
  [-140, 320], [-6, 335], [24, 322], [96, 320], [150, 336],
  [205, 318], [286, 330], [-78, 322], [-170, 300],
]

export function LifeGraphConstellation() {
  const reduce = useReducedMotion()

  const conf = (v: number) => `Confidence: ${Math.round(v * 100)} percent`

  return (
    <div className="relative flex w-full items-center justify-center">
      {/* Ambient bloom behind the instrument */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 46%, rgba(244,183,40,0.07) 0%, transparent 58%), radial-gradient(circle at 62% 62%, rgba(53,201,165,0.05) 0%, transparent 55%)',
        }}
      />

      <svg
        viewBox="0 0 800 760"
        className="relative h-auto w-full max-w-[640px] overflow-visible xl:max-w-[720px]"
        role="img"
        aria-label="Life Graph — a permissioned map of sources, decisions, and settlement"
      >
        <defs>
          {(['mist', 'signal', 'shielded'] as NodeColor[]).map((key) => (
            <radialGradient key={key} id={`halo-${key}`}>
              <stop offset="0%" stopColor={COLOR[key].hex} stopOpacity="0.22" />
              <stop offset="55%" stopColor={COLOR[key].hex} stopOpacity="0.06" />
              <stop offset="100%" stopColor={COLOR[key].hex} stopOpacity="0" />
            </radialGradient>
          ))}

          <radialGradient id="hub-core">
            <stop offset="0%" stopColor="#F4B728" stopOpacity="0.34" />
            <stop offset="58%" stopColor="#F4B728" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#F4B728" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="sweep-fill">
            <stop offset="0%" stopColor="#F4B728" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#F4B728" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#F4B728" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="horizon-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8E6DF" stopOpacity="0" />
            <stop offset="50%" stopColor="#E8E6DF" stopOpacity="0.035" />
            <stop offset="100%" stopColor="#E8E6DF" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="grid-fade">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="68%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>

          <pattern id="dot-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="rgba(232,230,223,0.16)" />
          </pattern>

          <mask id="grid-mask">
            <rect width="800" height="760" fill="url(#grid-fade)" />
          </mask>

          <filter id="soft-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hub-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Instrument backplane */}
        <rect x="0" y="0" width="800" height="760" fill="url(#dot-grid)" mask="url(#grid-mask)" />

        {/* Horizon ticks */}
        <g stroke="rgba(232,230,223,0.14)" strokeWidth="1">
          {ticks.map((deg) => {
            const a = (deg * Math.PI) / 180
            const major = deg % 30 === 0
            const inner = OUTER_R + (major ? 6 : 3)
            const outer = OUTER_R + (major ? 16 : 9)
            return (
              <line
                key={deg}
                x1={CX + Math.cos(a) * inner}
                y1={CY + Math.sin(a) * inner}
                x2={CX + Math.cos(a) * outer}
                y2={CY + Math.sin(a) * outer}
                opacity={major ? 0.9 : 0.4}
              />
            )
          })}
        </g>

        {/* Orbital rings */}
        <g fill="none">
          {RINGS.map((r, i) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              stroke="rgba(232,230,223,0.10)"
              strokeWidth={i === 2 ? 1 : 0.75}
            />
          ))}
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R}
            stroke="rgba(232,230,223,0.16)"
            strokeWidth="1"
            strokeDasharray="1 9"
          />
          <circle
            cx={CX}
            cy={CY}
            r={222}
            stroke="rgba(244,183,40,0.10)"
            strokeWidth="0.75"
            strokeDasharray="22 10 2 10"
          />
          {/* Axes */}
          <line x1={CX} y1={CY - OUTER_R - 16} x2={CX} y2={CY + OUTER_R + 16} stroke="rgba(232,230,223,0.07)" strokeWidth="0.75" />
          <line x1={CX - OUTER_R - 16} y1={CY} x2={CX + OUTER_R + 16} y2={CY} stroke="rgba(232,230,223,0.07)" strokeWidth="0.75" />
        </g>

        {/* Radar sweep */}
        {!reduce && (
          <motion.g
            style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
          >
            <path
              d={`M ${CX} ${CY} L ${CX + OUTER_R * Math.cos(-0.42)} ${CY + OUTER_R * Math.sin(-0.42)} A ${OUTER_R} ${OUTER_R} 0 0 1 ${CX + OUTER_R * Math.cos(0.06)} ${CY + OUTER_R * Math.sin(0.06)} Z`}
              fill="url(#sweep-fill)"
            />
            <line
              x1={CX}
              y1={CY}
              x2={CX + OUTER_R * Math.cos(0.06)}
              y2={CY + OUTER_R * Math.sin(0.06)}
              stroke="rgba(244,183,40,0.18)"
              strokeWidth="0.75"
            />
          </motion.g>
        )}

        {/* Faint peripheral nodes */}
        <g>
          {ghostNodes.map(([angle, radius], i) => {
            const { x, y } = polar(angle, radius)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i % 3 === 0 ? 2.4 : 1.6}
                fill="rgba(232,230,223,0.22)"
                stroke="rgba(232,230,223,0.10)"
                strokeWidth="0.75"
              />
            )
          })}
        </g>

        {/* Cross-links — the graph is a mesh, not just a star */}
        <g fill="none" stroke="rgba(232,230,223,0.13)" strokeWidth="0.75" strokeDasharray="3 7">
          {crossLinks.map((link) => (
            <path key={link.id} d={link.d} />
          ))}
        </g>

        {/* Hub spokes */}
        <g fill="none">
          {spokes.map((spoke, i) => {
            return (
              <g key={spoke.id}>
                <motion.path
                  d={spoke.d}
                  stroke="rgba(232,230,223,0.26)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.3, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  vectorEffect="non-scaling-stroke"
                />
                {/* Packet flow along the spoke */}
                {!reduce && (
                  <motion.path
                    d={spoke.d}
                    pathLength={1}
                    stroke={COLOR[spoke.color].hex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeOpacity="0.85"
                    strokeDasharray="0.05 0.95"
                    initial={{ strokeDashoffset: 1 }}
                    animate={{ strokeDashoffset: [1, 0] }}
                    transition={{
                      duration: 3.4 + i * 0.3,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: 0.6 + i * 0.18,
                    }}
                  />
                )}
              </g>
            )
          })}
        </g>

        {/* Hub */}
        <motion.g
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
        >
          <circle cx={CX} cy={CY} r={128} fill="url(#hub-core)" opacity="0.6" />
          <circle cx={CX} cy={CY} r={86} fill="none" stroke="rgba(244,183,40,0.16)" strokeWidth="0.75" />
          <motion.circle
            cx={CX}
            cy={CY}
            r={76}
            fill="none"
            stroke="rgba(244,183,40,0.28)"
            strokeWidth="1"
            strokeDasharray="2 6"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
          />
          <motion.circle
            cx={CX}
            cy={CY}
            r={64}
            fill="none"
            stroke="rgba(232,230,223,0.16)"
            strokeWidth="0.75"
            strokeDasharray="40 18"
            animate={reduce ? undefined : { rotate: -360 }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
          />

          <circle cx={CX} cy={CY} r={HUB_R + 1} fill="rgba(10,11,13,0.92)" stroke="rgba(244,183,40,0.45)" strokeWidth="1.2" filter="url(#soft-glow)" />
          <circle
            cx={CX}
            cy={CY}
            r={HUB_R - 0.5}
            fill="none"
            stroke="rgba(244,183,40,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * (HUB_R - 1) * 0.31} ${2 * Math.PI * HUB_R}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          <circle cx={CX} cy={CY} r={36} fill="rgba(244,183,40,0.06)" stroke="rgba(232,230,223,0.20)" strokeWidth="0.75" />

          <HubIcon
            size={32}
            weight="duotone"
            color="#E8E6DF"
            x={CX - 16}
            y={CY - 16}
          />

          {/* Live status pip on the hub bezel */}
          <circle cx={CX + 35} cy={CY - 35} r={4.5} fill="#0A0B0D" stroke="rgba(244,183,40,0.5)" strokeWidth="1" />
          <circle cx={CX + 35} cy={CY - 35} r={2.2} fill="#F4B728" filter="url(#hub-glow)">
            {!reduce && (
              <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
            )}
          </circle>

          <text
            x={CX}
            y={CY - 31}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize="9"
            letterSpacing="0.24em"
            fill="rgba(232,230,223,0.7)"
          >
            YOU
          </text>
          <text
            x={CX}
            y={CY + 41}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize="8"
            letterSpacing="0.18em"
            fill="rgba(232,230,223,0.5)"
          >
            OWNER
          </text>
        </motion.g>

        {/* Nodes */}
        {nodes.map((node, index) => {
          const color = COLOR[node.color]
          const isBrand = node.kind === 'brand'
          const NodeIcon = node.kind === 'icon' ? ICON[node.iconKey] : null
          const inner = Math.round(node.size * 0.42)
          const circumference = 2 * Math.PI * (node.size / 2 + 1)

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                reduce
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: 1, y: [0, -3, 0] }
              }
              transition={{
                opacity: { duration: 0.6, delay: 0.35 + index * 0.08 },
                scale: { duration: 0.7, delay: 0.35 + index * 0.08, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 4 + index * 0.35, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'view-box' }}
            >
              {/* Halo */}
              <circle cx={node.x} cy={node.y} r={node.size / 2 + 26} fill={`url(#halo-${node.color})`} />

              {/* Active pulse */}
              {node.active && !reduce && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size / 2 + 6}
                  fill="none"
                  stroke={color.hex}
                  strokeWidth="1"
                  initial={false}
                  animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: index * 0.25 }}
                  style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'view-box' }}
                />
              )}

              {/* Dashed orbit */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.size / 2 + 9}
                fill="none"
                stroke={`rgba(${color.rgb},0.38)`}
                strokeWidth="0.75"
                strokeDasharray="1.5 5"
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 24 + index * 3, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'view-box' }}
              />

              {/* Disc */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size / 2}
                fill="rgba(14,15,20,0.97)"
                stroke={`rgba(${color.rgb},0.55)`}
                strokeWidth="1.2"
                filter="url(#soft-glow)"
              />

              {/* Confidence arc */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size / 2 + 1}
                fill="none"
                stroke={`rgba(${color.rgb},0.85)`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${circumference * node.confidence} ${circumference}`}
                transform={`rotate(-90 ${node.x} ${node.y})`}
                opacity="0.9"
              />

              {/* Inner bevel */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size / 2 - 6}
                fill="none"
                stroke={`rgba(${color.rgb},0.14)`}
                strokeWidth="0.75"
              />

              {/* Glyph */}
              {isBrand ? (
                <foreignObject
                  x={node.x - inner / 2}
                  y={node.y - inner / 2}
                  width={inner}
                  height={inner}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <BrandIcon slug={node.slug} size={inner} />
                  </div>
                </foreignObject>
              ) : NodeIcon ? (
                <NodeIcon
                  size={Math.round(node.size * 0.36)}
                  weight="duotone"
                  color={color.hex}
                  x={node.x - Math.round(node.size * 0.36) / 2}
                  y={node.y - Math.round(node.size * 0.36) / 2}
                />
              ) : null}

              {/* Leader + label */}
              <line
                x1={node.x}
                y1={node.y + node.size / 2 + 5}
                x2={node.x}
                y2={node.y + node.size / 2 + 11}
                stroke={`rgba(${color.rgb},0.35)`}
                strokeWidth="0.75"
              />
              <text
                x={node.x}
                y={node.y + node.size / 2 + 25}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize="11"
                letterSpacing="0.14em"
                fill="#E8E6DF"
                fillOpacity="0.92"
              >
                {node.label.toUpperCase()}
              </text>
              <text
                x={node.x}
                y={node.y + node.size / 2 + 39}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize="9"
                letterSpacing="0.1em"
                fill={color.hex}
                fillOpacity="0.72"
              >
                {node.note}
              </text>

              <title>{`${node.label} — ${node.note} — ${conf(node.confidence)}`}</title>
            </motion.g>
          )
        })}

        {/* Corner brackets */}
        <g fill="none" stroke="rgba(232,230,223,0.22)" strokeWidth="1">
          <path d="M 16 40 L 16 16 L 40 16" />
          <path d="M 760 16 L 784 16 L 784 40" />
          <path d="M 16 720 L 16 744 L 40 744" />
          <path d="M 784 720 L 784 744 L 760 744" />
        </g>

        {/* HUD — top left */}
        <g fontFamily={MONO}>
          <text x="24" y="42" fontSize="9" letterSpacing="0.26em" fill="#E8E6DF" fillOpacity="0.6">
            LIFE GRAPH
          </text>
          <text x="24" y="57" fontSize="7.5" letterSpacing="0.16em" fill="#E8E6DF" fillOpacity="0.42">
            PERMISSIONED MODEL / V0.1
          </text>
          <line x1="24" y1="66" x2="96" y2="66" stroke="rgba(244,183,40,0.35)" strokeWidth="1" />

          {/* top right */}
          <g textAnchor="end">
            <text x="776" y="42" fontSize="8" letterSpacing="0.18em" fill="#E8E6DF" fillOpacity="0.6">
              08 NODES / 08 EDGES
            </text>
            <text x="776" y="57" fontSize="8" letterSpacing="0.18em" fill="#35C9A5" fillOpacity="0.75">
              CONFIDENCE 0.94
            </text>
            <line x1="704" y1="66" x2="776" y2="66" stroke="rgba(53,201,165,0.3)" strokeWidth="1" />
          </g>

          {/* bottom left legend */}
          <g>
            {[
              { x: 24, color: '#F4B728', label: 'SOURCES' },
              { x: 122, color: '#E8E6DF', label: 'DECISION' },
              { x: 226, color: '#35C9A5', label: 'SETTLEMENT' },
            ].map((item) => (
              <g key={item.label}>
                <circle cx={item.x} cy={735} r="2.5" fill={item.color} fillOpacity="0.8" />
                <text x={item.x + 10} y={738} fontSize="7.5" letterSpacing="0.16em" fill="#E8E6DF" fillOpacity="0.55">
                  {item.label}
                </text>
              </g>
            ))}
          </g>

          {/* bottom right status */}
          <g textAnchor="end">
            <text x="776" y="738" fontSize="7.5" letterSpacing="0.16em" fill="#E8E6DF" fillOpacity="0.55">
              SYNCED 12S AGO
              <tspan fill="#F4B728" fillOpacity="0.85"> ● LIVE</tspan>
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
}
