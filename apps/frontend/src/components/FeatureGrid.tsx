import { GlassCard } from '@subbridge/ui'
import { motion } from 'framer-motion'
import { Filter, Gauge, Globe, Layers, Lock, QrCode } from 'lucide-react'

const FEATURES = [
  {
    icon: Gauge,
    title: 'Edge-fast',
    body: 'Runs on Cloudflare’s edge in 300+ cities. Conversions finish before the spinner shows.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    body: 'Original subscription URLs are AES-encrypted in short links and never logged.',
  },
  {
    icon: Layers,
    title: 'Every client',
    body: 'Mihomo, Sing-box, Shadowrocket, Surge, Quantumult X, Base64 and raw share links.',
  },
  {
    icon: Filter,
    title: 'Powerful pipeline',
    body: 'Merge subscriptions, filter with regex, rename nodes and dedupe endpoints.',
  },
  {
    icon: Globe,
    title: 'Smart rules',
    body: 'Sane remote rule sets and auto url-test groups, tuned per target client.',
  },
  {
    icon: QrCode,
    title: 'Share anywhere',
    body: 'Copy, QR codes and encrypted short links — one tap to import on mobile.',
  },
]

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-4xl" aria-label="Features">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.32, 0.72, 0, 1] }}
          >
            <GlassCard className="h-full p-5 sm:p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 shadow-lg shadow-blue-500/25">
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mb-1 text-[17px] font-semibold">{feature.title}</h3>
              <p className="text-[14px] leading-relaxed text-[--color-label-secondary]">
                {feature.body}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
