import { Button } from '@subbridge/ui'
import { Github, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { currentTheme, toggleTheme } from '@/lib/theme'
import { Logo } from './Logo'

export function Nav() {
  const [theme, setTheme] = useState(currentTheme)

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-3">
      <nav className="glass flex w-full max-w-3xl items-center justify-between rounded-full py-2 pl-3 pr-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[17px] font-semibold tracking-tight">SubBridge</span>
        </a>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(toggleTheme())}
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="GitHub repository"
            onClick={() => window.open('https://github.com/subbridge/subbridge', '_blank')}
          >
            <Github className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </nav>
    </header>
  )
}
