import {
  Lightning, Graph, Broadcast, ShieldCheck, Storefront, ShieldCheckered,
  ClipboardText, UserCircle, ArrowsClockwise, CalendarBlank, Clock, MapPin,
  Star, Gauge, Gift, Robot, Key, CheckCircle, Check, X, XCircle, Warning,
  CaretDown, CaretRight, AirplaneTilt, Coffee, CircleDashed, Lock,
  ChatTeardrop, ArrowRight, MagnifyingGlass, Sparkle, ArrowSquareOut, CopySimple,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'

// Semantic key → Phosphor component. Components reference these keys, never glyphs.
export const ICON = {
  sources: Lightning, graph: Graph, triggers: Broadcast, policy: ShieldCheck,
  commerce: Storefront, payment: ShieldCheckered, audit: ClipboardText,
  user: UserCircle, subscriptions: ArrowsClockwise, calendar: CalendarBlank,
  zcash: ShieldCheckered, propose: Robot, authorize: Key, execute: Lightning,
  verify: CheckCircle, time: Clock, location: MapPin, behaviour: ArrowsClockwise,
  opportunity: Star, threshold: Gauge, lifeEvent: Gift, travel: AirplaneTilt,
  renewal: ArrowsClockwise, coffee: Coffee, lock: Lock,
  check: Check, checkCircle: CheckCircle, cross: X, crossCircle: XCircle,
  warning: Warning, caretDown: CaretDown, caretRight: CaretRight,
  simulated: CircleDashed,
  chat: ChatTeardrop, arrowRight: ArrowRight, search: MagnifyingGlass,
  sparkle: Sparkle, externalLink: ArrowSquareOut, copy: CopySimple,
} satisfies Record<string, Icon>

export type IconKey = keyof typeof ICON
