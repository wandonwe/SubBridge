import { Button } from '@subbridge/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface QrModalProps {
  url: string | null
  onClose: () => void
}

/** Full-screen sheet showing a QR code for a generated subscription URL. */
export function QrModal({ url, onClose }: QrModalProps) {
  return (
    <AnimatePresence>
      {url && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Subscription QR code"
        >
          <motion.div
            className="glass w-full max-w-xs rounded-[32px] p-6 text-center"
            initial={{ scale: 0.85, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold">Scan to import</h3>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <X className="h-[18px] w-[18px]" />
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-inner">
              <img
                src={`/api/qrcode?text=${encodeURIComponent(url)}`}
                alt="QR code of the subscription URL"
                className="h-auto w-full"
                draggable={false}
              />
            </div>
            <p className="mt-4 break-all font-mono text-[11px] leading-relaxed text-[--color-label-secondary]">
              {url.length > 96 ? `${url.slice(0, 96)}…` : url}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
