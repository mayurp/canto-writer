import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import { interpolate } from 'flubber'
import HanziWriter, { type StrokeData, type QuizSummary } from 'hanzi-writer'
import type { AnimationPlaybackControls } from 'framer-motion'
import { usePictogramMorph } from '../hooks/usePictogramMorph'

type StrokePoint = {
  x: number
  y: number
}

type StrokeShape = {
  path: string
  guidePath: string
}

type HanziStrokePoint = [number, number] | StrokePoint

type HanziStrokeData = {
  path: string
  points: HanziStrokePoint[]
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

const HANZI_VIEWBOX_Y_OFFSET = -124
const CHARACTER_VIEWBOX = `0 ${HANZI_VIEWBOX_Y_OFFSET} 1024 1024`
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
const GUIDED_DOT_RADIUS = 22
const GUIDED_DOT_COLOR = '#38bdf8'
const GUIDED_DOT_MIN_DURATION = 0.6
const GUIDED_DOT_SPEED = 450 // approximate units per second (slower for clarity)
const GUIDED_REPEAT_DELAY = 0.6


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
  size?: number
  sessionKey?: number
  onQuizComplete?: (summary: QuizSummary) => void
  showOutline?: boolean
  onClearStrokes?: () => void
}

export function StrokeAnimator({
  character,
  size = 260,
  sessionKey = 0,
  onQuizComplete,
  showOutline = false,
  onClearStrokes,
}: StrokeAnimatorProps) {
  const writerContainerRef = useRef<HTMLDivElement | null>(null)
  const strokeShapesRef = useRef<StrokeShape[]>([])
  const mainCharacterGroupRef = useRef<SVGGElement | null>(null)
  const morphStateRef = useRef<MorphState | null>(null)
  const visibilityRestoreRef = useRef<(() => void) | null>(null)
  const progressControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const opacityControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const scaleControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const guidedControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const guidedStrokeIndexRef = useRef(0)
  const guidedPathElementRef = useRef<SVGPathElement | null>(null)
  const guidedPathLengthRef = useRef(0)
  const [isPictogramMorphFinished, setIsPictogramMorphFinished] = useState(false)
  const [isPictogramFadeFinished, setIsPictogramFadeFinished] = useState(false)
  const isPictogramFadeFinishedRef = useRef(false)
  const [completeCharacterPaths, setCompleteCharacterPaths] = useState<string[]>([])
  const [morphState, setMorphState] = useState<MorphState | null>(null)
  const [pathData, setPathData] = useState('')
  const [showGuidedDot, setShowGuidedDot] = useState(false)
  const [guidedPath, setGuidedPath] = useState('')
  const morphInterpolatorRef = useRef<((t: number) => string) | null>(null)
  const progress = useMotionValue(0)
  const overlayOpacity = useMotionValue(0)
  const overlayScale = useMotionValue(1)
  const guidedDotProgress = useMotionValue(0)
  const guidedDotX = useMotionValue(0)
  const guidedDotY = useMotionValue(0)
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])
  const overlayTransformStyle = useMemo(
    () => ({ transform: 'scale(1, -1)', transformOrigin: '50% 50%' }),
    [],
  )

  const { morphPaths: pictogramMorphPaths, pictogramPaths, overlayStyle: pictogramOverlayStyle, isActive: isPictogramMorphActive, progress: pictogramProgress } = usePictogramMorph({
    character,
    enabled: showOutline,
    targetPath: completeCharacterPaths,
    onMorphComplete: () => setIsPictogramMorphFinished(true),
    onFadeComplete: () => {
      setIsPictogramFadeFinished(true)
      isPictogramFadeFinishedRef.current = true
    }
  })

  // Animate the vertical offset from pictogram center (geometric 512) to character center (visual 388)
  // The difference is precisely the VIEWBOX_Y_OFFSET (124)
  const morphY = useTransform(pictogramProgress, [0, 1], [HANZI_VIEWBOX_Y_OFFSET, 0])

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

  const stopGuidedStrokeAnimation = useCallback(() => {
    guidedControlsRef.current?.stop()
    guidedControlsRef.current = null
    guidedPathLengthRef.current = 0
    guidedDotProgress.stop()
    setShowGuidedDot(false)
    setGuidedPath('')
  }, [guidedDotProgress])

  const startGuidedStrokeAnimation = useCallback(
    (strokeIndex: number) => {
      if (!showOutline) {
        stopGuidedStrokeAnimation()
        return
      }
      const stroke = strokeShapesRef.current[strokeIndex]
      if (!stroke || !stroke.guidePath) {
        stopGuidedStrokeAnimation()
        return
      }
      guidedStrokeIndexRef.current = strokeIndex
      guidedDotProgress.set(0)
      setGuidedPath(stroke.guidePath)
      // Only show the dot if the pictogram has finished fading out
      if (isPictogramFadeFinishedRef.current) {
        setShowGuidedDot(true)
      }
      guidedControlsRef.current?.stop()
      guidedPathLengthRef.current = 0
      const schedule = () => {
        const pathElement = guidedPathElementRef.current
        if (!pathElement) return
        const totalLength = pathElement.getTotalLength()
        if (totalLength === 0) {
          guidedControlsRef.current = null
          setShowGuidedDot(false)
          return
        }
        guidedPathLengthRef.current = totalLength || 1
        const startPoint = pathElement.getPointAtLength(0)
        guidedDotX.set(startPoint.x)
        guidedDotY.set(startPoint.y)
        const durationSeconds = Math.max(GUIDED_DOT_MIN_DURATION, totalLength / GUIDED_DOT_SPEED)
        guidedControlsRef.current = animate(guidedDotProgress, 1, {
          duration: durationSeconds,
          ease: 'linear',
          repeat: Infinity,
          repeatDelay: GUIDED_REPEAT_DELAY,
        })
      }
      // Wait two animation frames: first lets React commit the <path>, second ensures the browser paints it
      // so getTotalLength/getPointAtLength read the correct geometry instead of 0-length placeholders.
      requestAnimationFrame(() => {
        requestAnimationFrame(schedule)
      })
    },
    [guidedDotProgress, guidedDotX, guidedDotY, showOutline, stopGuidedStrokeAnimation],
  )

  useMotionValueEvent(progress, 'change', (value) => {
    const state = morphStateRef.current
    if (!state) return
    const interpolator = morphInterpolatorRef.current
    if (interpolator) {
      setPathData(interpolator(value))
    }
  })
  useMotionValueEvent(guidedDotProgress, 'change', (value) => {
    const pathElement = guidedPathElementRef.current
    const totalLength = guidedPathLengthRef.current
    if (!pathElement || totalLength <= 0) return
    const point = pathElement.getPointAtLength(value * totalLength)
    guidedDotX.set(point.x)
    guidedDotY.set(point.y)
  })

  // When pictogram fades out, trigger the guided dot if it's meant to be shown
  useEffect(() => {
    if (isPictogramFadeFinished && showOutline) {
      const currentStroke = guidedStrokeIndexRef.current
      if (currentStroke < strokeShapesRef.current.length) {
        startGuidedStrokeAnimation(currentStroke)
      }
    }
  }, [isPictogramFadeFinished, showOutline, startGuidedStrokeAnimation])

  useEffect(() => {
    if (!writerContainerRef.current) return
    setIsPictogramMorphFinished(false)
    setIsPictogramFadeFinished(false)
    isPictogramFadeFinishedRef.current = false

    const container = writerContainerRef.current
    container.innerHTML = ''
    strokeShapesRef.current = []
    mainCharacterGroupRef.current = null
    clearMorphs()
    stopGuidedStrokeAnimation()
    setCompleteCharacterPaths([])
    let disposed = false

    const writer = HanziWriter.create(container, character, {
      width: size,
      height: size,
      showOutline,
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
      if (showOutline) {
        const nextStroke = strokeData.strokeNum + 1
        guidedStrokeIndexRef.current = nextStroke
        if (nextStroke < strokeShapesRef.current.length) {
          startGuidedStrokeAnimation(nextStroke)
        } else {
          stopGuidedStrokeAnimation()
        }
      }
    }

    writer.hideCharacter()
    guidedStrokeIndexRef.current = 0
    if (!showOutline) {
      stopGuidedStrokeAnimation()
    }
    writer.quiz({
      onCorrectStroke: handleCorrectStroke,
      onComplete: (summary) => {
        if (summary) {
          onQuizComplete?.(summary)
        }
      },
    })

    writer
      .getCharacterData()
      .then((character: HanziCharacterData) => {
        if (disposed) return
        const strokes = character.strokes.map((stroke) => ({
          path: stroke.path,
          guidePath: pointsToPath(
            (stroke.points ?? []).map((pt) => (Array.isArray(pt) ? { x: pt[0], y: pt[1] } : { x: pt.x, y: pt.y })),
          ),
        }))
        strokeShapesRef.current = strokes

        // Combine strokes for pictogram morph target
        const allPaths = character.strokes.map(s => s.path)
        setCompleteCharacterPaths(allPaths)

        mainCharacterGroupRef.current = findMainCharacterGroup(container)
      })
      .catch((error: unknown) => {
        console.error('Failed to load character data', error)
      })

    return () => {
      disposed = true
      clearMorphs()
      stopGuidedStrokeAnimation()
      writer.showCharacter()
      container.replaceChildren()
      strokeShapesRef.current = []
      mainCharacterGroupRef.current = null
    }
  }, [
    character,
    size,
    sessionKey,
    onQuizComplete,
    clearMorphs,
    cleanupOverlay,
    startMorphAnimation,
    showOutline,
    startGuidedStrokeAnimation,
    stopGuidedStrokeAnimation,
  ])

  // DEBUGGING: Set to true to see static pictogram without animation
  const DEBUG_PICTOGRAM = false

  return (
    <div
      className="stroke-animator"
      role="img"
      aria-label={`Stroke order animation for ${character}`}
      style={style}
    >
      {onClearStrokes && (
        <button
          type="button"
          className="stroke-clear-button"
          onClick={onClearStrokes}
          aria-label="Clear strokes"
          title="Clear strokes"
        >
          ✕
        </button>
      )}
      <div
        ref={writerContainerRef}
        className="stroke-animator__writer"
        style={{ visibility: (!showOutline || isPictogramMorphFinished) ? 'visible' : 'hidden' }}
      />
      <svg
        className="stroke-animator__overlay"
        viewBox={CHARACTER_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        style={overlayTransformStyle}
        aria-hidden="true"
      >
        <g transform={`translate(0, ${HANZI_VIEWBOX_Y_OFFSET})`}>
          {/* Debug: Static Pictogram with distinct colors */}
          {DEBUG_PICTOGRAM && showOutline && pictogramPaths.map((d, i) => (
            <path
              key={`debug-p-${i}`}
              d={d}
              fill={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][i % 4]}
              fillRule="evenodd"
              stroke="white"
              strokeWidth="4"
            />
          ))}
        </g>

        {/* Regular Morph Animation (Disabled in Debug Mode) */}
        {!DEBUG_PICTOGRAM && isPictogramMorphActive && (
          <motion.g style={{ y: morphY }}>
            {pictogramMorphPaths.map((d, i) => (
              <motion.path
                key={`morph-${i}`}
                d={d}
                fill={OVERLAY_FILL_COLOR}
                fillRule="evenodd"
                stroke={OVERLAY_STROKE_COLOR}
                strokeWidth={OVERLAY_OUTLINE_WIDTH}
                style={{ ...pictogramOverlayStyle, transformOrigin: '50% 50%' }}
              />
            ))}
          </motion.g>
        )}

        {!isPictogramMorphActive && morphState && pathData && (
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
        {showGuidedDot && showOutline && guidedPath && (
          <>
            <path
              ref={guidedPathElementRef}
              d={guidedPath}
              fill="none"
              stroke="transparent"
              strokeWidth="1"
            />
            {isPictogramFadeFinished && (
              <motion.circle
                cx={guidedDotX}
                cy={guidedDotY}
                r={GUIDED_DOT_RADIUS}
                fill={GUIDED_DOT_COLOR}
                style={{ opacity: 0.9 }}
              />
            )}
          </>
        )}
      </svg>
    </div>
  )
}
