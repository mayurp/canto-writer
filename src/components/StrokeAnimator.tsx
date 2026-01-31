import './styles/StrokeAnimator.css'
import { useEffect, useMemo, useRef } from 'react'
import HanziWriter, { type StrokeData, type QuizSummary, type CharacterData } from 'hanzi-writer'
import type { StrokeShape } from '../types/stroke'
import { pointsToPath, closePolyline } from '../utils/strokePath'
import { findMainCharacterGroup } from '../utils/hanziWriterDom'
import { useStrokeMorphAnimation } from '../hooks/useStrokeMorphAnimation'
import { useStrokeGuideAnimation } from '../hooks/useStrokeGuideAnimation'

const CHARACTER_VIEWBOX = '0 -124 1024 1024'
const STROKE_COLOR = '#000'
const WRITER_PADDING = 0

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

  // Stroke morph animation hook
  const { StrokeMorphOverlay, triggerMorph, reset: resetMorph } = useStrokeMorphAnimation({ mainCharacterGroupRef })

  // Stroke guide dot animation hook
  const {
    StrokeGuideOverlay,
    start: startStrokeGuideAnimation,
    stop: stopStrokeGuideAnimation,
    currentIndex: strokeGuideIndexRef,
  } = useStrokeGuideAnimation({ strokeShapesRef, enable: showOutline })

  // Styles
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])
  const overlayTransformStyle = useMemo(
    () => ({ transform: 'scale(1, -1)', transformOrigin: '50% 50%' }),
    [],
  )

  // Main HanziWriter setup effect
  useEffect(() => {
    if (!writerContainerRef.current) return

    const container = writerContainerRef.current
    container.innerHTML = ''
    strokeShapesRef.current = []
    mainCharacterGroupRef.current = null
    resetMorph()
    stopStrokeGuideAnimation()
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
        strokeGuideIndexRef.current = nextStroke
        if (nextStroke < strokeShapesRef.current.length) {
          startStrokeGuideAnimation(nextStroke)
        } else {
          stopStrokeGuideAnimation()
        }
      }
    }

    writer.hideCharacter()
    strokeGuideIndexRef.current = 0
    if (!showOutline) {
      stopStrokeGuideAnimation()
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
          const initialIndex = strokeGuideIndexRef.current
          if (initialIndex < strokeShapesRef.current.length) {
            startStrokeGuideAnimation(initialIndex)
          }
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load character data', error)
      })

    return () => {
      disposed = true
      resetMorph()
      stopStrokeGuideAnimation()
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
    startStrokeGuideAnimation,
    stopStrokeGuideAnimation,
    strokeGuideIndexRef,
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
        <StrokeGuideOverlay />
      </svg>
    </div>
  )
}
