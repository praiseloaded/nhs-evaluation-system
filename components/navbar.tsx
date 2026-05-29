import Link from 'next/link'
import { ThemeSwitcher } from './theme-switcher'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                NHS
              </div>
              <span className="font-bold text-lg hidden sm:inline">Evaluation Engine</span>
            </Link>
            
            <div className="hidden md:flex gap-6 text-sm">
              <Link
                href="/"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/new-analysis"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                New Analysis
              </Link>
              <Link
                href="/saved-analyses"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Saved Analyses
              </Link>
              <Link
                href="/settings"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Settings
              </Link>
            </div>
          </div>

          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  )
}
