import './styles/StrokeAnimator.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent } from 'framer-motion'
import HanziWriter, { type StrokeData, type QuizSummary, type CharacterData } from 'hanzi-writer'
import type { AnimationPlaybackControls } from 'framer-motion'
import type { StrokeShape } from '../types/stroke'
import { pointsToPath, closePolyline } from '../utils/strokePath'
import { findMainCharacterGroup } from '../utils/hanziWriterDom'
import { useStrokeMorphAnimation } from '../hooks/useStrokeMorphAnimation'

const CHARACTER_VIEWBOX = '0 -124 1024 1024'
const STROKE_COLOR = '#000'
const WRITER_PADDING = 0
const GUIDED_DOT_RADIUS = 22
const GUIDED_DOT_COLOR = '#38bdf8'
const GUIDED_DOT_MIN_DURATION = 0.6
const GUIDED_DOT_SPEED = 450
const GUIDED_REPEAT_DELAY = 0.6

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
  // Refs for HanziWriter and stroke data
  const writerContainerRef = useRef<HTMLDivElement | null>(null)
  const strokeShapesRef = useRef<StrokeShape[]>([])
  const mainCharacterGroupRef = useRef<SVGGElement | null>(null)

  // Guided dot animation refs and state
  const guidedControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const guidedStrokeIndexRef = useRef(0)
  const guidedPathElementRef = useRef<SVGPathElement | null>(null)
  const guidedPathLengthRef = useRef(0)
  const [showGuidedDot, setShowGuidedDot] = useState(false)
  const [guidedPath, setGuidedPath] = useState('')
  const guidedDotProgress = useMotionValue(0)
  const guidedDotX = useMotionValue(0)
  const guidedDotY = useMotionValue(0)

  // Morph animation hook
  const { StrokeMorphOverlay, triggerMorph, reset: resetMorph } = useStrokeMorphAnimation({ mainCharacterGroupRef })

  // Styles
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])
  const overlayTransformStyle = useMemo(
    () => ({ transform: 'scale(1, -1)', transformOrigin: '50% 50%' }),
    [],
  )

  // Guided dot animation handlers
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
      setShowGuidedDot(true)
      setGuidedPath(stroke.guidePath)
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
      requestAnimationFrame(() => {
        requestAnimationFrame(schedule)
      })
    },
    [guidedDotProgress, guidedDotX, guidedDotY, showOutline, stopGuidedStrokeAnimation],
  )

  // Update guided dot position
  useMotionValueEvent(guidedDotProgress, 'change', (value) => {
    const pathElement = guidedPathElementRef.current
    const totalLength = guidedPathLengthRef.current
    if (!pathElement || totalLength <= 0) return
    const point = pathElement.getPointAtLength(value * totalLength)
    guidedDotX.set(point.x)
    guidedDotY.set(point.y)
  })

  // Main HanziWriter setup effect
  useEffect(() => {
    if (!writerContainerRef.current) return

    const container = writerContainerRef.current
    container.innerHTML = ''
    strokeShapesRef.current = []
    mainCharacterGroupRef.current = null
    resetMorph()
    stopGuidedStrokeAnimation()
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

      // Prepare drawn stroke path (closed for Flubber)
      const closedPoints = closePolyline(drawnPath.points.map((point) => ({ x: point.x, y: point.y })))
      const sourcePath = pointsToPath(closedPoints)

      // Trigger morph animation
      triggerMorph({
        sourcePath,
        targetPath: targetShape.path,
        strokeIndex: strokeData.strokeNum,
      })

      // Handle guided dot for next stroke
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
      .then((character: CharacterData) => {
        if (disposed) return
        strokeShapesRef.current = character.strokes.map((stroke) => ({
          path: stroke.path,
          guidePath: pointsToPath(
            (stroke.points ?? []).map((pt) => (Array.isArray(pt) ? { x: pt[0], y: pt[1] } : { x: pt.x, y: pt.y })),
          ),
        }))
        mainCharacterGroupRef.current = findMainCharacterGroup(container)
        if (showOutline && strokeShapesRef.current.length > 0) {
          const initialIndex = guidedStrokeIndexRef.current
          if (initialIndex < strokeShapesRef.current.length) {
            startGuidedStrokeAnimation(initialIndex)
          }
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load character data', error)
      })

    return () => {
      disposed = true
      resetMorph()
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
    resetMorph,
    triggerMorph,
    showOutline,
    startGuidedStrokeAnimation,
    stopGuidedStrokeAnimation,
  ])

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
      <div ref={writerContainerRef} className="stroke-animator__writer" />
      <svg
        className="stroke-animator__overlay"
        viewBox={CHARACTER_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        style={overlayTransformStyle}
        aria-hidden="true"
      >
        <StrokeMorphOverlay />
        {showGuidedDot && showOutline && guidedPath && (
          <>
            <path
              ref={guidedPathElementRef}
              d={guidedPath}
              fill="none"
              stroke="transparent"
              strokeWidth="1"
            />
            <motion.circle
              cx={guidedDotX}
              cy={guidedDotY}
              r={GUIDED_DOT_RADIUS}
              fill={GUIDED_DOT_COLOR}
              style={{ opacity: 0.9 }}
            />
          </>
        )}
      </svg>
    </div>
  )
}
