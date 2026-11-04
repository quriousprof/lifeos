import { LifeOSProvider } from '@/app/providers/LifeOSProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LifeOSProvider>{children}</LifeOSProvider>
}
