import './styles/StrokeAnimator.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter, {
  type StrokeData,
  type QuizSummary,
  type CharacterData,
} from 'hanzi-writer'
import type { StrokeShape } from '../types/stroke'
import { pointsToPath, closePolyline } from '../utils/strokePath'
import { findMainCharacterGroup } from '../utils/hanziWriterDom'
import { useStrokeMorphAnimation } from '../hooks/useStrokeMorphAnimation'
import { useStrokeGuideAnimation } from '../hooks/useStrokeGuideAnimation'
import { useStrokeColorAnimation } from '../hooks/useStrokeColorAnimation'

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
  debugStrokeColors?: boolean
  hintTrigger?: number
}

export function StrokeAnimator({
  character,
  size = 260,
  sessionKey = 0,
  onQuizComplete,
  showOutline = false,
  onClearStrokes,
  debugStrokeColors = false,
  hintTrigger,
}: StrokeAnimatorProps) {
  // Refs for HanziWriter and stroke data
  const writerContainerRef = useRef<HTMLDivElement | null>(null)
  const strokeShapesRef = useRef<StrokeShape[]>([])
  const mainCharacterGroupRef = useRef<SVGGElement | null>(null)

  // Stable ref for onQuizComplete to avoid re-triggering HanziWriter effect
  const onQuizCompleteRef = useRef(onQuizComplete)
  onQuizCompleteRef.current = onQuizComplete

  // Reactive signal for when stroke data is available (ref changes aren't reactive)
  const [strokesReady, setStrokesReady] = useState(false)

  // Local gate that controls color-overlay visibility and blocks writing while it is shown.
  const [showColorOverlay, setShowColorOverlay] = useState(
    () => showOutline || debugStrokeColors,
  )
  const canWrite = !showColorOverlay
  const showGuideDot = showOutline && !showColorOverlay

  // Colored stroke animation hook
  const {
    StrokeColorOverlay,
    start: startStrokeColorAnimation,
    stop: stopStrokeColorAnimation,
  } = useStrokeColorAnimation({ character })

  // Stroke morph animation hook
  const {
    StrokeMorphOverlay,
    start: startMorphAnimation,
    stop: stopMorphAnimation,
  } = useStrokeMorphAnimation({ mainCharacterGroupRef })

  // Stroke guide dot animation hook
  const {
    StrokeGuideOverlay,
    start: startStrokeGuideAnimation,
    stop: stopStrokeGuideAnimation,
    currentIndex: strokeGuideIndexRef,
  } = useStrokeGuideAnimation({ strokeShapesRef })

  // Keep the color overlay in sync with the current card/mode.
  useEffect(() => {
    setShowColorOverlay(showOutline || debugStrokeColors)
  }, [character, sessionKey, showOutline, debugStrokeColors])

  // Trigger a visual replay when the parent increments hintTrigger.
  const prevHintTriggerRef = useRef(hintTrigger)
  useEffect(() => {
    if (
      hintTrigger !== undefined &&
      hintTrigger !== prevHintTriggerRef.current
    ) {
      if (!showColorOverlay) {
        setShowColorOverlay(true)
      }
      prevHintTriggerRef.current = hintTrigger
    }
  }, [hintTrigger, showColorOverlay])

  // Styles
  const style = useMemo(
    () => ({ width: `${size}px`, height: `${size}px` }),
    [size],
  )
  const overlayTransformStyle = useMemo(
    () => ({ transform: 'scale(1, -1)', transformOrigin: '50% 50%' }),
    [],
  )

  // Main HanziWriter setup effect — re-runs when character/size/session changes.
  useEffect(() => {
    if (!writerContainerRef.current) return

    const container = writerContainerRef.current
    container.innerHTML = ''
    strokeShapesRef.current = []
    mainCharacterGroupRef.current = null
    stopMorphAnimation()
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
    // Hide the black character fill immediately. We only want the outline
    // or the color intro overlay to show until the user starts writing.
    writer.hideCharacter()

    const handleCorrectStroke = (strokeData: StrokeData) => {
      const targetShape = strokeShapesRef.current[strokeData.strokeNum]
      const drawnPath = strokeData.drawnPath

      if (disposed || !targetShape || !drawnPath?.points?.length) return

      // Prepare drawn stroke path (closed for Flubber)
      const closedPoints = closePolyline(
        drawnPath.points.map((point) => ({ x: point.x, y: point.y })),
      )
      const sourcePath = pointsToPath(closedPoints)

      // Trigger morph animation
      startMorphAnimation({
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

    strokeGuideIndexRef.current = 0
    if (!showOutline) {
      stopStrokeGuideAnimation()
    }
    writer.quiz({
      onCorrectStroke: handleCorrectStroke,
      onComplete: (summary) => {
        if (summary) {
          onQuizCompleteRef.current?.(summary)
        }
      },
    })

    writer
      .getCharacterData()
      .then((charData: CharacterData) => {
        if (disposed) {
          return
        }
        strokeShapesRef.current = charData.strokes.map((stroke) => ({
          path: stroke.path,
          guidePath: pointsToPath(
            (stroke.points ?? []).map((pt) =>
              Array.isArray(pt) ? { x: pt[0], y: pt[1] } : { x: pt.x, y: pt.y },
            ),
          ),
        }))
        mainCharacterGroupRef.current = findMainCharacterGroup(container)
        setStrokesReady(true)

        // Generate colored paths immediately when character data resolves
        startStrokeColorAnimation({ characterStrokeData: charData })
      })
      .catch((error: unknown) => {
        console.error('Failed to load character data', error)
      })

    return () => {
      disposed = true
      stopMorphAnimation()
      stopStrokeGuideAnimation()
      stopStrokeColorAnimation()
      writer.showCharacter()
      container.replaceChildren()
      strokeShapesRef.current = []
      mainCharacterGroupRef.current = null
      setStrokesReady(false)
    }
  }, [
    character,
    size,
    sessionKey,
    showOutline,
    strokeGuideIndexRef,
    // onQuizComplete intentionally omitted — accessed via onQuizCompleteRef
    startMorphAnimation,
    stopMorphAnimation,
    startStrokeGuideAnimation,
    stopStrokeGuideAnimation,
    startStrokeColorAnimation,
    stopStrokeColorAnimation,
  ])

  // Effect to handle mode transitions without resetting the writer
  useEffect(() => {
    if (showGuideDot && strokesReady && strokeShapesRef.current.length > 0) {
      const initialIndex = strokeGuideIndexRef.current
      if (initialIndex < strokeShapesRef.current.length) {
        startStrokeGuideAnimation(initialIndex)
      }
    }
  }, [
    showGuideDot,
    strokesReady,
    startStrokeGuideAnimation,
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
          disabled={!canWrite}
          aria-label="Clear strokes"
          title="Clear strokes"
        >
          ✕
        </button>
      )}
      <div
        ref={writerContainerRef}
        className="stroke-animator__writer"
        style={{ pointerEvents: canWrite ? 'auto' : 'none' }}
      />
      <svg
        className="stroke-animator__overlay"
        viewBox={CHARACTER_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        style={overlayTransformStyle}
        aria-hidden="true"
      >
        <StrokeMorphOverlay />
        {showColorOverlay ? (
          <StrokeColorOverlay
            staticColors={debugStrokeColors}
            onComplete={() => setShowColorOverlay(false)}
          />
        ) : showGuideDot ? (
          <StrokeGuideOverlay />
        ) : null}
      </svg>
    </div>
  )
}
