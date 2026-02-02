import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStatsContext } from '../context/UserStatsContext'
import { useEffect, useRef, useState } from 'react'
import './styles/PointsAnimation.css'

function FlyingPoints({
  amount,
  targetRect,
  onComplete,
}: {
  amount: number
  targetRect: DOMRect | null
  onComplete: () => void
}) {
  // Start from center of viewport
  const startX = window.innerWidth / 2
  const startY = window.innerHeight / 2

  // End at the points pill
  const endX = targetRect ? targetRect.left + targetRect.width / 2 : startX
  const endY = targetRect
    ? targetRect.top + targetRect.height / 2
    : startY - 100

  return (
    <motion.div
      className="flying-points"
      initial={{ x: startX, y: startY, scale: 1.5, opacity: 1 }}
      animate={{ x: endX, y: endY, scale: 0.5, opacity: 0.8 }}
      transition={{ duration: 0.6, delay: 0.4, ease: 'easeInOut' }}
      onAnimationComplete={onComplete}
    >
      +{amount} 💎
    </motion.div>
  )
}

export function PointsAnimationLayer() {
  const { animationState } = useUserStatsContext()
  const {
    pending: pendingAnimations,
    complete: completeAnimation,
    pillRef,
  } = animationState

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const lastAnimationCount = useRef(0)

  useEffect(() => {
    if (pillRef.current) {
      setTargetRect(pillRef.current.getBoundingClientRect())
    }
    // Play sound when a new animation is added
    if (pendingAnimations.length > lastAnimationCount.current) {
      import('../utils/pointsSound').then(({ playPointsSound }) =>
        playPointsSound(),
      )
    }
    lastAnimationCount.current = pendingAnimations.length
  }, [pillRef, pendingAnimations])

  return createPortal(
    <div className="points-animation-portal">
      <AnimatePresence>
        {pendingAnimations.map((anim) => (
          <FlyingPoints
            key={anim.id}
            amount={anim.amount}
            targetRect={targetRect}
            onComplete={() => completeAnimation(anim.id, anim.amount)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
