import { GrainOverlay } from '@/app/components/atmosphere/GrainOverlay'
import Nav from '@/app/components/Nav'
import { Hero } from '@/app/components/landing/Hero'
import { PipelineStrip } from '@/app/components/landing/PipelineStrip'
import { TriggerTaxonomy } from '@/app/components/landing/TriggerTaxonomy'
import { AutonomyTiers } from '@/app/components/landing/AutonomyTiers'
import { PrivacyZcash } from '@/app/components/landing/PrivacyZcash'
import { DemoStory } from '@/app/components/landing/DemoStory'
import { CTA } from '@/app/components/landing/CTA'
import { Footer } from '@/app/components/landing/Footer'

export default function LandingPage() {
  return (
    <>
      <GrainOverlay />
      <Nav />
      <main className="overflow-x-hidden">
        <Hero />
        <PipelineStrip />
        <TriggerTaxonomy />
        <AutonomyTiers />
        <PrivacyZcash />
        <DemoStory />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
