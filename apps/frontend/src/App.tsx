import { motion } from 'framer-motion'
import { useState } from 'react'
import { ConverterCard } from '@/components/ConverterCard'
import { FeatureGrid } from '@/components/FeatureGrid'
import { Footer } from '@/components/Footer'
import { HistoryList } from '@/components/HistoryList'
import { Nav } from '@/components/Nav'
import { QrModal } from '@/components/QrModal'
import { loadHistory } from '@/lib/history'

export default function App() {
  const [history, setHistory] = useState(loadHistory)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  return (
    <>
      {/* Ambient background */}
      <div className="orb left-[-10%] top-[-10%] h-[45vmax] w-[45vmax] bg-sky-400/60" />
      <div className="orb right-[-12%] top-[20%] h-[40vmax] w-[40vmax] bg-blue-600/50 [animation-delay:-8s]" />
      <div className="orb bottom-[-15%] left-[25%] h-[38vmax] w-[38vmax] bg-indigo-400/40 [animation-delay:-16s]" />

      <Nav />

      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-14 px-4 pt-32 sm:gap-20">
        {/* Hero */}
        <section className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="bg-gradient-to-b from-sky-400 via-blue-500 to-blue-700 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl md:text-8xl"
          >
            SubBridge
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
            className="mx-auto mt-4 max-w-xl text-lg text-[--color-label-secondary] sm:text-xl"
          >
            Modern Subscription Bridge for Mihomo, Sing-box and Hiddify.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-2 text-[15px] font-medium text-blue-500"
          >
            Bridge Every Subscription.
          </motion.p>
        </section>

        {/* Converter */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          <ConverterCard onGenerated={setHistory} onShowQr={setQrUrl} />
        </motion.section>

        <HistoryList entries={history} onChange={setHistory} onShowQr={setQrUrl} />

        <FeatureGrid />

        <Footer />
      </main>

      <QrModal url={qrUrl} onClose={() => setQrUrl(null)} />
    </>
  )
}
