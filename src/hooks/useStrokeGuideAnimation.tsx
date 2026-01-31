import { useCallback, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from 'framer-motion'
import type { AnimationPlaybackControls } from 'framer-motion'
import type { StrokeShape } from '../types/stroke'

// Animation constants
const DOT_RADIUS = 22
const DOT_COLOR = '#38bdf8'
const DOT_MIN_DURATION = 0.6
const DOT_SPEED = 450
const REPEAT_DELAY = 0.6

type UseStrokeGuideOptions = {
  strokeShapesRef: React.RefObject<StrokeShape[]>
}

/**
 * Hook that manages the animated guide dot showing the next stroke to draw.
 */
export function useStrokeGuideAnimation({
  strokeShapesRef,
}: UseStrokeGuideOptions) {
  // State
  const [showDot, setShowDot] = useState(false)
  const [path, setPath] = useState('')

  // Refs
  const controlsRef = useRef<AnimationPlaybackControls | null>(null)
  const indexRef = useRef(0)
  const pathElementRef = useRef<SVGPathElement | null>(null)
  const pathLengthRef = useRef(0)

  // Motion values
  const dotProgress = useMotionValue(0)
  const dotX = useMotionValue(0)
  const dotY = useMotionValue(0)

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    pathLengthRef.current = 0
    dotProgress.stop()
    setShowDot(false)
    setPath('')
  }, [dotProgress])

  const start = useCallback(
    (strokeIndex: number) => {
      const stroke = strokeShapesRef.current?.[strokeIndex]
      if (!stroke || !stroke.guidePath) {
        stop()
        return
      }
      indexRef.current = strokeIndex
      dotProgress.set(0)
      setShowDot(true)
      setPath(stroke.guidePath)
      controlsRef.current?.stop()
      pathLengthRef.current = 0

      const schedule = () => {
        const pathElement = pathElementRef.current
        if (!pathElement) return
        const totalLength = pathElement.getTotalLength()
        if (totalLength === 0) {
          controlsRef.current = null
          setShowDot(false)
          return
        }
        pathLengthRef.current = totalLength || 1
        const startPoint = pathElement.getPointAtLength(0)
        dotX.set(startPoint.x)
        dotY.set(startPoint.y)
        const durationSeconds = Math.max(
          DOT_MIN_DURATION,
          totalLength / DOT_SPEED,
        )
        controlsRef.current = animate(dotProgress, 1, {
          duration: durationSeconds,
          ease: 'linear',
          repeat: Infinity,
          repeatDelay: REPEAT_DELAY,
        })
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(schedule)
      })
    },
    [dotProgress, dotX, dotY, stop, strokeShapesRef],
  )

  // Update dot position along path
  useMotionValueEvent(dotProgress, 'change', (value) => {
    const pathElement = pathElementRef.current
    const totalLength = pathLengthRef.current
    if (!pathElement || totalLength <= 0) return
    const point = pathElement.getPointAtLength(value * totalLength)
    dotX.set(point.x)
    dotY.set(point.y)
  })

  // Component to render the guide dot overlay inside an SVG
  const StrokeGuideOverlay = useCallback(() => {
    if (!showDot || !path) return null

    return (
      <>
        <path
          ref={pathElementRef}
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="1"
        />
        <motion.circle
          cx={dotX}
          cy={dotY}
          r={DOT_RADIUS}
          fill={DOT_COLOR}
          style={{ opacity: 0.9 }}
        />
      </>
    )
  }, [showDot, path, dotX, dotY])

  return {
    StrokeGuideOverlay,
    start,
    stop,
    currentIndex: indexRef,
  }
}
