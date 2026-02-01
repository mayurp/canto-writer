import { useCallback, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { interpolate } from 'flubber'
import type { AnimationPlaybackControls } from 'framer-motion'
import type { MorphState } from '../types/stroke'
import { hideStrokeElement } from '../utils/hanziWriterDom'

// Animation constants
const MORPH_DURATION = 200
const MORPH_FADE_DURATION = 100
const SCALE_OVERSHOOT = 0.08
const SCALE_OVERSHOOT_DURATION = 80
const SCALE_SPRING_STIFFNESS = 260
const SCALE_SPRING_DAMPING = 28
const DEBUG_SHOW_ACTUAL_STROKES = false

// Overlay styling
const OVERLAY_FILL_COLOR = '#000'
const OVERLAY_STROKE_COLOR = '#000'
const OVERLAY_OUTLINE_WIDTH = 0

type StartParams = {
  sourcePath: string
  targetPath: string
  strokeIndex: number
  id?: string
}

type UseMorphAnimationOptions = {
  mainCharacterGroupRef: React.RefObject<SVGGElement | null>
}

/**
 * Hook that manages the stroke morph animation overlay.
 * Animates user's drawn stroke morphing into the correct target stroke.
 */
export function useStrokeMorphAnimation({
  mainCharacterGroupRef,
}: UseMorphAnimationOptions) {
  // State
  const [morphState, setMorphState] = useState<MorphState | null>(null)
  const [pathData, setPathData] = useState('')

  // Refs
  const morphStateRef = useRef<MorphState | null>(null)
  const morphInterpolatorRef = useRef<((t: number) => string) | null>(null)
  const visibilityRestoreRef = useRef<(() => void) | null>(null)
  const progressControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const opacityControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const scaleControlsRef = useRef<AnimationPlaybackControls | null>(null)

  // Motion values
  const progress = useMotionValue(0)
  const overlayOpacity = useMotionValue(0)
  const overlayScale = useMotionValue(1)

  // Keep ref in sync with state
  morphStateRef.current = morphState

  const stopAllAnimations = useCallback(() => {
    progressControlsRef.current?.stop()
    opacityControlsRef.current?.stop()
    scaleControlsRef.current?.stop()
    progressControlsRef.current = null
    opacityControlsRef.current = null
    scaleControlsRef.current = null
  }, [])

  const restoreHiddenStroke = useCallback(() => {
    if (DEBUG_SHOW_ACTUAL_STROKES) {
      visibilityRestoreRef.current = null
      return
    }
    if (visibilityRestoreRef.current) {
      visibilityRestoreRef.current()
      visibilityRestoreRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    stopAllAnimations()
    restoreHiddenStroke()
    morphStateRef.current = null
    morphInterpolatorRef.current = null
    setMorphState(null)
    setPathData('')
    overlayOpacity.set(0)
    overlayScale.set(1)
  }, [overlayOpacity, overlayScale, restoreHiddenStroke, stopAllAnimations])

  const start = useCallback(
    ({ sourcePath, targetPath, strokeIndex, id }: StartParams) => {
      // Cleanup previous animation
      stop()

      // Hide the actual stroke in HanziWriter's DOM
      if (!DEBUG_SHOW_ACTUAL_STROKES) {
        const restoreVisibility = hideStrokeElement(
          mainCharacterGroupRef.current,
          strokeIndex,
        )
        if (restoreVisibility) {
          visibilityRestoreRef.current = restoreVisibility
        }
      }

      // Create morph state
      const state: MorphState = {
        id: id ?? `morph-${strokeIndex}-${Date.now()}`,
        sourcePath,
        targetPath,
      }

      // Set up animation
      setMorphState(state)
      setPathData(sourcePath)
      morphInterpolatorRef.current = interpolate(sourcePath, targetPath, {
        maxSegmentLength: 30,
      })
      progress.set(0)
      overlayOpacity.set(1)
      overlayScale.set(1)

      // Animation sequence callbacks
      const runFadeOut = () => {
        restoreHiddenStroke()
        if (DEBUG_SHOW_ACTUAL_STROKES) return
        opacityControlsRef.current = animate(overlayOpacity, 0, {
          duration: MORPH_FADE_DURATION / 1000,
          onComplete: stop,
        })
      }

      const runScaleOvershoot = () => {
        const settle = () => {
          scaleControlsRef.current = animate(overlayScale, 1, {
            type: 'spring',
            bounce: 0,
            stiffness: SCALE_SPRING_STIFFNESS,
            damping: SCALE_SPRING_DAMPING,
            onComplete: runFadeOut,
          })
        }
        scaleControlsRef.current = animate(overlayScale, 1 + SCALE_OVERSHOOT, {
          duration: SCALE_OVERSHOOT_DURATION / 1000,
          ease: 'easeOut',
          onComplete: settle,
        })
      }

      // Listen for progress changes to update path
      const unsubscribe = progress.on('change', (value) => {
        const interpolator = morphInterpolatorRef.current
        if (interpolator) {
          setPathData(interpolator(value))
        }
      })

      // Start morph animation
      progressControlsRef.current = animate(progress, 1, {
        duration: MORPH_DURATION / 1000,
        ease: 'easeOut',
        onComplete: () => {
          unsubscribe()
          runScaleOvershoot()
        },
      })
    },
    [
      mainCharacterGroupRef,
      overlayOpacity,
      overlayScale,
      progress,
      stop,
      restoreHiddenStroke,
    ],
  )

  // MorphOverlay component rendered inside an SVG
  const StrokeMorphOverlay = useCallback(() => {
    if (!morphState || !pathData) return null

    return (
      <motion.path
        key={morphState.id}
        d={pathData}
        fill={OVERLAY_FILL_COLOR}
        stroke={OVERLAY_STROKE_COLOR}
        strokeWidth={OVERLAY_OUTLINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: overlayOpacity,
          scale: overlayScale,
          transformOrigin: '50% 50%',
        }}
      />
    )
  }, [morphState, pathData, overlayOpacity, overlayScale])

  return {
    StrokeMorphOverlay,
    start,
    stop,
  }
}
