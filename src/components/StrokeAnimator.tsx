import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent } from 'framer-motion'
import { interpolate } from 'flubber'
import HanziWriter, { type StrokeData } from 'hanzi-writer'
import type { AnimationPlaybackControls } from 'framer-motion'

type StrokePoint = {
  x: number
  y: number
}

type StrokeShape = {
  path: string
}

type HanziStrokeData = {
  path: string
  points: Array<[number, number]>
}

type HanziCharacterData = {
  strokes: HanziStrokeData[]
}

type MorphState = {
  id: string
  sourcePath: string
  targetPath: string
}

const findMainCharacterGroup = (root: HTMLElement | null): SVGGElement | null => {
  if (!root) return null
  const svg = root.querySelector('svg')
  if (!svg) return null
  const positionedGroup = Array.from(svg.children).find(
    (child): child is SVGGElement => child instanceof SVGGElement,
  )
  if (!positionedGroup) return null
  const characterGroups = Array.from(positionedGroup.children).filter(
    (child): child is SVGGElement => child instanceof SVGGElement,
  )
  return characterGroups[1] ?? null
}

const hideStrokeElement = (group: SVGGElement | null, strokeIndex: number): (() => void) | null => {
  if (!group) return null
  const strokeNode = group.children.item(strokeIndex)
  if (!(strokeNode instanceof SVGPathElement)) {
    return null
  }
  const element = strokeNode
  const previousVisibility = element.style.visibility
  let restored = false
  element.style.visibility = 'hidden'
  return () => {
    if (restored) return
    restored = true
    element.style.visibility = previousVisibility
  }
}

const CHARACTER_VIEWBOX = '0 -124 1024 1024'
const STROKE_COLOR = '#000'
const OVERLAY_FILL_COLOR = STROKE_COLOR
const OVERLAY_STROKE_COLOR = STROKE_COLOR
const OVERLAY_OUTLINE_WIDTH = 0
const WRITER_PADDING = 0
const DEBUG_SHOW_ACTUAL_STROKES = false
const MORPH_DURATION = 200
const MORPH_FADE_DURATION = 100
const SCALE_OVERSHOOT = 0.08
const SCALE_OVERSHOOT_DURATION = 80
const SCALE_SPRING_STIFFNESS = 260
const SCALE_SPRING_DAMPING = 28


const formatPathValue = (value: number) => {
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(2)
}

const pointsToPath = (points: StrokePoint[]) => {
  if (!points.length) return ''
  const [first, ...rest] = points
  const commands = [`M ${formatPathValue(first.x)} ${formatPathValue(first.y)}`]
  rest.forEach((point) => {
    commands.push(`L ${formatPathValue(point.x)} ${formatPathValue(point.y)}`)
  })
  return commands.join(' ')
}

const closePolyline = (points: StrokePoint[]): StrokePoint[] => {
  if (points.length <= 1) return points.slice()
  const closed: StrokePoint[] = [...points]
  for (let i = points.length - 2; i >= 0; i -= 1) {
    closed.push({ ...points[i] })
  }
  return closed
}

type StrokeAnimatorProps = {
  character: string
  hanziWriterId: string
  size?: number
  sessionKey?: number
  onComplete?: () => void
}

export function StrokeAnimator({
  character,
  hanziWriterId,
  size = 260,
  sessionKey = 0,
  onComplete,
}: StrokeAnimatorProps) {
  const writerContainerRef = useRef<HTMLDivElement | null>(null)
  const strokeShapesRef = useRef<StrokeShape[]>([])
  const mainCharacterGroupRef = useRef<SVGGElement | null>(null)
  const morphStateRef = useRef<MorphState | null>(null)
  const visibilityRestoreRef = useRef<(() => void) | null>(null)
  const progressControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const opacityControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const scaleControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const [morphState, setMorphState] = useState<MorphState | null>(null)
  const [pathData, setPathData] = useState('')
  const morphInterpolatorRef = useRef<((t: number) => string) | null>(null)
  const progress = useMotionValue(0)
  const overlayOpacity = useMotionValue(0)
  const overlayScale = useMotionValue(1)
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])
  const overlayTransformStyle = useMemo(
    () => ({ transform: 'scale(1, -1)', transformOrigin: '50% 50%' }),
    [],
  )

  useEffect(() => {
    morphStateRef.current = morphState
  }, [morphState])

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

  const cleanupOverlay = useCallback(() => {
    stopAllAnimations()
    restoreHiddenStroke()
    morphStateRef.current = null
    morphInterpolatorRef.current = null
    setMorphState(null)
    setPathData('')
    overlayOpacity.set(0)
    overlayScale.set(1)
  }, [overlayOpacity, overlayScale, restoreHiddenStroke, stopAllAnimations])

  const startMorphAnimation = useCallback(
    (state: MorphState) => {
      stopAllAnimations()
      setMorphState(state)
      setPathData(state.sourcePath)
      morphInterpolatorRef.current = interpolate(state.sourcePath, state.targetPath, { maxSegmentLength: 30 })
      progress.set(0)
      overlayOpacity.set(1)
      overlayScale.set(1)
      const runFadeOut = () => {
        restoreHiddenStroke()
        if (DEBUG_SHOW_ACTUAL_STROKES) {
          return
        }
        opacityControlsRef.current = animate(overlayOpacity, 0, {
          duration: MORPH_FADE_DURATION / 1000,
          onComplete: cleanupOverlay,
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
      progressControlsRef.current = animate(progress, 1, {
        duration: MORPH_DURATION / 1000,
        ease: 'easeOut',
        onComplete: runScaleOvershoot,
      })
    },
    [cleanupOverlay, overlayOpacity, overlayScale, progress, stopAllAnimations, restoreHiddenStroke],
  )

  const clearMorphs = useCallback(() => {
    cleanupOverlay()
  }, [cleanupOverlay])

  useMotionValueEvent(progress, 'change', (value) => {
    const state = morphStateRef.current
    if (!state) return
    const interpolator = morphInterpolatorRef.current
    if (interpolator) {
      setPathData(interpolator(value))
    }
  })

  useEffect(() => {
    if (!writerContainerRef.current) return

    const container = writerContainerRef.current
    container.innerHTML = ''
    strokeShapesRef.current = []
    mainCharacterGroupRef.current = null
    clearMorphs()
    let disposed = false

    const writer = HanziWriter.create(container, hanziWriterId, {
      width: size,
      height: size,
      showOutline: false,
      padding: WRITER_PADDING,
      strokeColor: STROKE_COLOR,
      delayBetweenLoops: 1200,
    })

    const handleCorrectStroke = (strokeData: StrokeData) => {
      const targetShape = strokeShapesRef.current[strokeData.strokeNum]
      const drawnPath = strokeData.drawnPath

      if (disposed || !targetShape || !drawnPath?.points?.length) return

      cleanupOverlay()

      let restoreStrokeVisibility: (() => void) | null = null
      if (!DEBUG_SHOW_ACTUAL_STROKES) {
        if (!mainCharacterGroupRef.current) {
          mainCharacterGroupRef.current = findMainCharacterGroup(container)
        }
        restoreStrokeVisibility = hideStrokeElement(mainCharacterGroupRef.current, strokeData.strokeNum)
      }

      if (restoreStrokeVisibility) {
        visibilityRestoreRef.current = () => {
          restoreStrokeVisibility?.()
        }
      } else {
        visibilityRestoreRef.current = null
      }

      // Flubber dones't support unclosed lines, so we need to close the drawn path
      // ourselves by mirroring the points back to the start
      const closedPoints = closePolyline(drawnPath.points.map((point) => ({ x: point.x, y: point.y })))
      const sourcePath = pointsToPath(closedPoints)

      const morph: MorphState = {
        id: `${strokeData.character}-${strokeData.strokeNum}-${Date.now()}`,
        sourcePath,
        targetPath: targetShape.path,
      }
      startMorphAnimation(morph)
    }

    writer.hideCharacter()
    writer.quiz({
      onCorrectStroke: handleCorrectStroke,
      onComplete: () => {
        onComplete?.()
      },
    })

    writer
      .getCharacterData()
      .then((character: HanziCharacterData) => {
        if (disposed) return
        strokeShapesRef.current = character.strokes.map((stroke) => ({
          path: stroke.path,
        }))
        mainCharacterGroupRef.current = findMainCharacterGroup(container)
      })
      .catch((error: unknown) => {
        console.error('Failed to load character data', error)
      })

    return () => {
      disposed = true
      clearMorphs()
      writer.showCharacter()
      container.replaceChildren()
      strokeShapesRef.current = []
      mainCharacterGroupRef.current = null
    }
  }, [hanziWriterId, size, sessionKey, onComplete, clearMorphs, cleanupOverlay, startMorphAnimation])

  return (
    <div
      className="stroke-animator"
      role="img"
      aria-label={`Stroke order animation for ${character}`}
      style={style}
    >
      <div ref={writerContainerRef} className="stroke-animator__writer" />
      <svg
        className="stroke-animator__overlay"
        viewBox={CHARACTER_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        style={overlayTransformStyle}
        aria-hidden="true"
      >
        {morphState && pathData && (
          <motion.path
            key={morphState.id}
            d={pathData}
            fill={OVERLAY_FILL_COLOR}
            stroke={OVERLAY_STROKE_COLOR}
            strokeWidth={OVERLAY_OUTLINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: overlayOpacity, scale: overlayScale, transformOrigin: '50% 50%' }}
          />
        )}
      </svg>
    </div>
  )
}
