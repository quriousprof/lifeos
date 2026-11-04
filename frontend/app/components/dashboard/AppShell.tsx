'use client'

import React from 'react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Badge } from '@/app/components/ui/Badge'
import { Toggle } from '@/app/components/ui/Toggle'
import { AgentChat } from './AgentChat'
import { ConnectedSources } from './ConnectedSources'
import { LifeGraphPanel } from './LifeGraphPanel'
import { TriggerFeed } from './TriggerFeed'
import { PolicyEditor } from './PolicyEditor'
import { CommerceDrawer } from './CommerceDrawer'
import { ShieldedPaymentDemo } from './ShieldedPaymentDemo'
import { AuditLog } from './AuditLog'
import { ICON, type IconKey } from '@/app/lib/icons'

type TabId = 'agent' | 'sources' | 'graph' | 'triggers' | 'policy' | 'commerce' | 'payment' | 'audit'

const tabs: { id: TabId; icon: IconKey; label: string }[] = [
  { id: 'agent',    icon: 'sparkle',  label: 'Agent' },
  { id: 'sources',  icon: 'sources',  label: 'Sources' },
  { id: 'graph',    icon: 'graph',    label: 'Life Graph' },
  { id: 'triggers', icon: 'triggers', label: 'Triggers' },
  { id: 'policy',   icon: 'policy',   label: 'Policy' },
  { id: 'commerce', icon: 'commerce', label: 'Commerce' },
  { id: 'payment',  icon: 'payment',  label: 'Shielded Pay' },
  { id: 'audit',    icon: 'audit',    label: 'Audit Log' },
]


function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}) {
  return (
    <nav className="w-52 shrink-0 border-r border-line bg-ink-2 py-4 flex flex-col gap-1 px-2">
      {tabs.map((tab) => {
        const TabIcon = ICON[tab.icon]
        const active = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={
              'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer font-mono text-xs transition-colors w-full text-left ' +
              (active
                ? 'bg-ink-3 text-mist border-l-2 border-signal'
                : 'text-mist-dim hover:text-mist hover:bg-ink-3/50')
            }
          >
            <TabIcon size={16} weight={active ? 'fill' : 'regular'} className="shrink-0" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function AppShell() {
  const { killSwitch, toggleKillSwitch, activeTab, setActiveTab } = useLifeOS()

  function renderTab() {
    switch (activeTab) {
      case 'agent':    return <AgentChat />
      case 'sources':  return <ConnectedSources />
      case 'graph':    return <LifeGraphPanel />
      case 'triggers': return <TriggerFeed />
      case 'policy':   return <PolicyEditor />
      case 'commerce': return <CommerceDrawer />
      case 'payment':  return <ShieldedPaymentDemo />
      case 'audit':    return <AuditLog />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-ink">
      <header className="h-14 flex items-center justify-between px-6 border-b border-line bg-ink-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-mist-dim tracking-widest">
            LIFE<span className="text-signal">OS</span>
          </span>
          <span className="text-mist-dim/40">|</span>
          <span className="font-mono text-xs text-mist-dim">dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-mist-dim">KILL SWITCH</span>
            <Toggle checked={killSwitch} onChange={toggleKillSwitch} variant="kill" />
          </div>
          {killSwitch && <Badge variant="alert" size="sm">PAUSED</Badge>}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderTab()}
        </main>
      </div>
    </div>
  )
}
