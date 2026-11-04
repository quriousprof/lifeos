export function Footer() {
  return (
    <footer className="border-t border-line py-10 px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left */}
        <div className="font-mono text-xs text-mist-dim">
          <span className="text-mist">LIFE OS</span>
          {' // autonomous agent for everyday life'}
          <br />
          {'Built for Free Society Hack · Mumbai · Nov 2026'}
        </div>

        {/* Right */}
        <div className="font-mono text-xs text-mist-dim flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
          <span>zcash://privacy</span>
          <span className="hidden sm:inline opacity-30">·</span>
          <span>bitrefill://commerce</span>
          <span className="hidden sm:inline opacity-30">·</span>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  )
}
