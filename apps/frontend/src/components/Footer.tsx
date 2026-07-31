import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="pb-10 pt-4 text-center text-[13px] text-[--color-label-tertiary]">
      <p className="flex items-center justify-center gap-1.5">
        Open source under MIT
        <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" aria-hidden="true" />
        Runs entirely on Cloudflare
      </p>
      <p className="mt-1">SubBridge never stores or logs your subscription contents.</p>
    </footer>
  )
}
