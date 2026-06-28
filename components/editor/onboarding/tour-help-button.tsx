'use client'

import type { ReactElement } from 'react'

import { HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import type { TourId } from '@/types/onboarding'
import { resetTours } from '@/lib/onboarding/storage'

type TourHelpButtonProps = {
  readonly tourId: TourId
  readonly userId: string | null
  readonly onStart: (tourId: TourId) => void
}

export function TourHelpButton({ tourId, userId, onStart }: TourHelpButtonProps): ReactElement {
  const handleClick = (): void => {
    if (userId) {
      resetTours(userId)
    }
    onStart(tourId)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      <Button
        aria-label="Replay onboarding guide"
        className="relative h-8 w-8 shrink-0 cursor-pointer rounded-xl border border-(--border-default) bg-(--bg-surface) p-0 text-(--text-muted) shadow-none transition-all hover:border-(--accent-primary)/40 hover:bg-(--bg-subtle) hover:text-(--accent-primary) hover:shadow-[0_0_12px_var(--accent-glow)]"
        onClick={handleClick}
        size="icon"
        title="Replay onboarding guide"
        type="button"
        variant="ghost"
      >
        <HelpCircle className="size-4" strokeWidth={1.5} />
        {/* Subtle ping dot */}
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-(--accent-primary) opacity-60"
        />
      </Button>
    </motion.div>
  )
}
