import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent } from 'framer-motion'
import HanziWriter, { type StrokeData } from 'hanzi-writer'
import type { AnimationPlaybackControls } from 'framer-motion'

type StrokePoint = {
  x: number
  y: number
}

type DrawnPath = {
  pathString: string
  points: StrokePoint[]
}

type StrokeShape = {
  path: string
  median: StrokePoint[]
}

type MorphState = {
  id: string
  sourcePoints: StrokePoint[]
  targetPoints: StrokePoint[]
}

const CHARACTER_BOUNDS = {
  minX: 0,
  maxX: 1024,
  minY: -124,
  maxY: 900,
}
const CHARACTER_Y_FLIP_SUM = CHARACTER_BOUNDS.minY + CHARACTER_BOUNDS.maxY

const flipYAxis = (point: StrokePoint): StrokePoint => ({
  x: point.x,
  y: CHARACTER_Y_FLIP_SUM - point.y,
})

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

const SVG_NS = 'http://www.w3.org/2000/svg'
const CHARACTER_VIEWBOX = '0 -124 1024 1024'
const STROKE_COLOR = '#f97316'
const USER_STROKE_WIDTH = 50
const MORPH_DURATION = 150
const MORPH_FADE_DURATION = 220
const MORPH_SAMPLE_POINTS = 96
const MORPH_OVERSHOOT = 0.1
const MORPH_OVERSHOOT_DURATION = 50

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const distanceBetweenPoints = (a: StrokePoint, b: StrokePoint) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

const subtractPoints = (a: StrokePoint, b: StrokePoint): StrokePoint => ({
  x: a.x - b.x,
  y: a.y - b.y,
})

const vectorMagnitude = (point: StrokePoint) => Math.sqrt(point.x * point.x + point.y * point.y) || 0

const normalizeVector = (point: StrokePoint): StrokePoint => {
  const magnitude = vectorMagnitude(point)
  if (!magnitude) {
    return { x: 0, y: 0 }
  }
  return { x: point.x / magnitude, y: point.y / magnitude }
}

const interpolatePoints = (start: StrokePoint, end: StrokePoint, t: number): StrokePoint => ({
  x: start.x + (end.x - start.x) * t,
  y: start.y + (end.y - start.y) * t,
})

const pointsToPath = (points: StrokePoint[]) => {
  if (!points.length) return ''

  const format = (value: number) => value.toFixed(2)
  const [first, ...rest] = points
  let path = `M ${format(first.x)} ${format(first.y)}`

  rest.forEach((point) => {
    path += ` L ${format(point.x)} ${format(point.y)}`
  })

  return path
}

const pointsToClosedPath = (points: StrokePoint[]) => {
  if (!points.length) return ''
  return `${pointsToPath(points)} Z`
}

const resamplePolyline = (points: StrokePoint[], targetCount: number): StrokePoint[] => {
  if (!points.length || targetCount <= 0) {
    return []
  }
  if (points.length === 1 || targetCount === 1) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }))
  }

  const cumulativeLengths: number[] = [0]
  for (let i = 1; i < points.length; i += 1) {
    cumulativeLengths[i] = cumulativeLengths[i - 1] + distanceBetweenPoints(points[i - 1], points[i])
  }

  const totalLength = cumulativeLengths[cumulativeLengths.length - 1]
  if (!Number.isFinite(totalLength) || totalLength === 0) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }))
  }

  const result: StrokePoint[] = []
  for (let i = 0; i < targetCount; i += 1) {
    const targetDistance = clamp((i / (targetCount - 1)) * totalLength, 0, totalLength)
    let segmentIndex = 0
    while (
      segmentIndex < cumulativeLengths.length - 1 &&
      cumulativeLengths[segmentIndex + 1] < targetDistance
    ) {
      segmentIndex += 1
    }
    const segmentStart = points[segmentIndex]
    const segmentEnd = points[Math.min(segmentIndex + 1, points.length - 1)]
    const segmentLength = cumulativeLengths[Math.min(segmentIndex + 1, cumulativeLengths.length - 1)] -
      cumulativeLengths[segmentIndex]
    const segmentProgress =
      segmentLength === 0 ? 0 : (targetDistance - cumulativeLengths[segmentIndex]) / segmentLength
    result.push(interpolatePoints(segmentStart, segmentEnd, clamp(segmentProgress, 0, 1)))
  }

  return result
}

const ensureClosedPolyline = (points: StrokePoint[]): StrokePoint[] => {
  if (!points.length) return []
  const result = [...points]
  const first = result[0]
  const last = result[result.length - 1]
  if (distanceBetweenPoints(first, last) > 0.01) {
    result.push({ ...first })
  }
  return result
}

const resampleClosedPolyline = (points: StrokePoint[], targetCount: number): StrokePoint[] => {
  if (!points.length || targetCount <= 0) return []
  if (points.length === 1) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }))
  }
  const closedPoints = ensureClosedPolyline(points)
  const cumulativeLengths: number[] = [0]
  for (let i = 1; i < closedPoints.length; i += 1) {
    cumulativeLengths[i] =
      cumulativeLengths[i - 1] + distanceBetweenPoints(closedPoints[i - 1], closedPoints[i])
  }
  const totalLength = cumulativeLengths[cumulativeLengths.length - 1]
  if (!Number.isFinite(totalLength) || totalLength === 0) {
    return Array.from({ length: targetCount }, () => ({ ...closedPoints[0] }))
  }
  const result: StrokePoint[] = []
  for (let i = 0; i < targetCount; i += 1) {
    const targetDistance = clamp((i / targetCount) * totalLength, 0, totalLength)
    let segmentIndex = 0
    while (
      segmentIndex < cumulativeLengths.length - 1 &&
      cumulativeLengths[segmentIndex + 1] < targetDistance
    ) {
      segmentIndex += 1
    }
    const segmentStart = closedPoints[segmentIndex]
    const segmentEnd = closedPoints[Math.min(segmentIndex + 1, closedPoints.length - 1)]
    const segmentLength = cumulativeLengths[Math.min(segmentIndex + 1, cumulativeLengths.length - 1)] -
      cumulativeLengths[segmentIndex]
    const segmentProgress =
      segmentLength === 0 ? 0 : (targetDistance - cumulativeLengths[segmentIndex]) / segmentLength
    result.push(interpolatePoints(segmentStart, segmentEnd, clamp(segmentProgress, 0, 1)))
  }
  return result
}

const buildStrokeOutline = (points: StrokePoint[], width: number): StrokePoint[] => {
  if (points.length < 2 || width <= 0) {
    return []
  }
  const filtered = [...points]
  const halfWidth = width / 2
  const normals = filtered.map((point, index) => {
    const prev = filtered[index - 1] ?? filtered[index]
    const next = filtered[index + 1] ?? filtered[index]
    const tangent = subtractPoints(next, prev)
    let normal = normalizeVector({ x: -tangent.y, y: tangent.x })
    if (!normal.x && !normal.y) {
      normal = { x: 0, y: 1 }
    }
    return normal
  })
  const outer = filtered.map((point, index) => ({
    x: point.x + normals[index].x * halfWidth,
    y: point.y + normals[index].y * halfWidth,
  }))
  const inner = filtered.map((point, index) => ({
    x: point.x - normals[index].x * halfWidth,
    y: point.y - normals[index].y * halfWidth,
  }))
  return [...outer, ...inner.reverse()]
}

const polygonArea = (points: StrokePoint[]): number => {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

const ensurePolygonOrientation = (points: StrokePoint[], clockwise = true): StrokePoint[] => {
  const area = polygonArea(points)
  if (clockwise ? area < 0 : area > 0) {
    return points
  }
  return [...points].reverse()
}

const rotatePoints = (points: StrokePoint[], offset: number): StrokePoint[] => {
  if (!points.length) return []
  const normalizedOffset = ((offset % points.length) + points.length) % points.length
  const rotated: StrokePoint[] = []
  for (let i = 0; i < points.length; i += 1) {
    rotated.push(points[(i + normalizedOffset) % points.length])
  }
  return rotated
}

const alignClosedPointSets = (reference: StrokePoint[], candidates: StrokePoint[]): StrokePoint[] => {
  if (reference.length !== candidates.length || reference.length === 0) {
    return candidates
  }

  const orientedReference = ensurePolygonOrientation(reference)
  let orientedCandidates = ensurePolygonOrientation(candidates)

  const considerOrientation = (points: StrokePoint[]) => {
    let bestPoints = points
    let bestDistance = Number.POSITIVE_INFINITY
    for (let offset = 0; offset < points.length; offset += 1) {
      const rotated = rotatePoints(points, offset)
      const distanceSum = rotated.reduce(
        (acc, point, index) => acc + distanceBetweenPoints(point, orientedReference[index]),
        0,
      )
      if (distanceSum < bestDistance) {
        bestDistance = distanceSum
        bestPoints = rotated
      }
    }
    return bestPoints
  }

  let bestAlignment = considerOrientation(orientedCandidates)
  const reversedCandidates = [...orientedCandidates].reverse()
  const reversedAlignment = considerOrientation(reversedCandidates)

  const bestDistance = bestAlignment.reduce(
    (acc, point, index) => acc + distanceBetweenPoints(point, orientedReference[index]),
    0,
  )
  const reversedDistance = reversedAlignment.reduce(
    (acc, point, index) => acc + distanceBetweenPoints(point, orientedReference[index]),
    0,
  )

  return reversedDistance < bestDistance ? reversedAlignment : bestAlignment
}

const samplePathPoints = (
  svg: SVGSVGElement,
  pathString: string,
  fallbackPoints: StrokePoint[] | undefined,
  targetCount: number,
): StrokePoint[] => {
  if (!pathString) {
    return fallbackPoints ? resamplePolyline(fallbackPoints, targetCount) : []
  }

  const measurementPath = document.createElementNS(SVG_NS, 'path')
  measurementPath.setAttribute('d', pathString)
  measurementPath.setAttribute('fill', 'none')
  measurementPath.setAttribute('stroke', 'none')
  svg.appendChild(measurementPath)

  let totalLength = 0
  try {
    totalLength = measurementPath.getTotalLength()
  } catch (error) {
    console.warn('Failed to measure path for morph animation', error)
  }

  let sampledPoints: StrokePoint[] = []
  if (Number.isFinite(totalLength) && totalLength > 0 && targetCount > 1) {
    const viewCoords = Array.from({ length: targetCount }, (_, index) => {
      const distance = (index / (targetCount - 1)) * totalLength
      const point = measurementPath.getPointAtLength(distance)
      return { x: point.x, y: point.y }
    })
    sampledPoints = viewCoords.map(flipYAxis)
  }

  measurementPath.remove()

  if (!sampledPoints.length && fallbackPoints?.length) {
    return resamplePolyline(fallbackPoints.map(flipYAxis), targetCount)
  }

  return sampledPoints
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
  const overlaySvgRef = useRef<SVGSVGElement | null>(null)
  const strokeShapesRef = useRef<StrokeShape[]>([])
  const mainCharacterGroupRef = useRef<SVGGElement | null>(null)
  const morphStateRef = useRef<MorphState | null>(null)
  const visibilityRestoreRef = useRef<(() => void) | null>(null)
  const progressControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const opacityControlsRef = useRef<AnimationPlaybackControls | null>(null)
  const [morphState, setMorphState] = useState<MorphState | null>(null)
  const [pathData, setPathData] = useState('')
  const progress = useMotionValue(0)
  const overlayOpacity = useMotionValue(0)
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])

  useEffect(() => {
    morphStateRef.current = morphState
  }, [morphState])

  const stopAllAnimations = useCallback(() => {
    progressControlsRef.current?.stop()
    opacityControlsRef.current?.stop()
    progressControlsRef.current = null
    opacityControlsRef.current = null
  }, [])

  const restoreHiddenStroke = useCallback(() => {
    if (visibilityRestoreRef.current) {
      visibilityRestoreRef.current()
      visibilityRestoreRef.current = null
    }
  }, [])

  const cleanupOverlay = useCallback(() => {
    stopAllAnimations()
    restoreHiddenStroke()
    morphStateRef.current = null
    setMorphState(null)
    setPathData('')
    overlayOpacity.set(0)
  }, [overlayOpacity, restoreHiddenStroke, stopAllAnimations])

  const startMorphAnimation = useCallback(
    (state: MorphState) => {
      stopAllAnimations()
      setMorphState(state)
      progress.set(0)
      overlayOpacity.set(1)
      const runFadeOut = () => {
        restoreHiddenStroke()
        opacityControlsRef.current = animate(overlayOpacity, 0, {
          duration: MORPH_FADE_DURATION / 1000,
          onComplete: cleanupOverlay,
        })
      }
      const runOvershoot = () => {
        if (MORPH_OVERSHOOT <= 0) {
          runFadeOut()
          return
        }
        const settle = () => {
          progressControlsRef.current = animate(progress, 1, {
            type: 'spring',
            bounce: 0,
            stiffness: 260,
            damping: 28,
            onComplete: runFadeOut,
          })
        }
        progressControlsRef.current = animate(progress, 1 + MORPH_OVERSHOOT, {
          duration: MORPH_OVERSHOOT_DURATION / 1000,
          ease: 'easeOut',
          onComplete: settle,
        })
      }
      progressControlsRef.current = animate(progress, 1, {
        duration: MORPH_DURATION / 1000,
        ease: 'easeOut',
        onComplete: runOvershoot,
      })
    },
    [cleanupOverlay, overlayOpacity, progress, stopAllAnimations],
  )

  const clearMorphs = useCallback(() => {
    cleanupOverlay()
  }, [cleanupOverlay])

  useMotionValueEvent(progress, 'change', (value) => {
    const state = morphStateRef.current
    if (!state) return
    const maxProgress = MORPH_OVERSHOOT > 0 ? 1 + MORPH_OVERSHOOT : 1
    const clampedProgress = clamp(value, 0, maxProgress)
    const interpolated = state.sourcePoints.map((point, index) =>
      interpolatePoints(point, state.targetPoints[index], clampedProgress),
    )
    setPathData(pointsToClosedPath(interpolated))
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
      padding: 8,
      strokeColor: STROKE_COLOR,
      delayBetweenLoops: 1200,
    })

    const handleCorrectStroke = (strokeData: StrokeData) => {
      const overlaySvg = overlaySvgRef.current
      if (!overlaySvg) return

      const targetShape = strokeShapesRef.current[strokeData.strokeNum]
      const drawnPath = strokeData.drawnPath

      if (disposed || !targetShape || !drawnPath?.points?.length) return

      cleanupOverlay()

      if (!mainCharacterGroupRef.current) {
        mainCharacterGroupRef.current = findMainCharacterGroup(container)
      }
      const restoreStrokeVisibility = hideStrokeElement(mainCharacterGroupRef.current, strokeData.strokeNum)

      const userLinePoints = (strokeData.isBackwards ? [...drawnPath.points].reverse() : drawnPath.points).map(
        flipYAxis,
      )
      const resampledUserLine = resamplePolyline(userLinePoints, Math.max(12, MORPH_SAMPLE_POINTS / 2))
      const userOutline = buildStrokeOutline(resampledUserLine, USER_STROKE_WIDTH)
      let sourcePoints = resampleClosedPolyline(userOutline, MORPH_SAMPLE_POINTS)

      let targetOutline = samplePathPoints(
        overlaySvg,
        targetShape.path,
        targetShape.median,
        Math.max(MORPH_SAMPLE_POINTS * 2, 120),
      )
      if (!targetOutline.length) {
        const medianFallback = resamplePolyline(targetShape.median.map(flipYAxis), MORPH_SAMPLE_POINTS)
        targetOutline = buildStrokeOutline(medianFallback, USER_STROKE_WIDTH)
      }
      let targetPoints = resampleClosedPolyline(targetOutline, MORPH_SAMPLE_POINTS)
      sourcePoints = alignClosedPointSets(targetPoints, sourcePoints)

      if (!sourcePoints.length || sourcePoints.length !== targetPoints.length) {
        restoreStrokeVisibility?.()
        return
      }

      visibilityRestoreRef.current = () => {
        restoreStrokeVisibility?.()
      }

      const morph: MorphState = {
        id: `${strokeData.character}-${strokeData.strokeNum}-${Date.now()}`,
        sourcePoints,
        targetPoints,
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
      .then((character) => {
        if (disposed) return
        strokeShapesRef.current = character.strokes.map((stroke) => ({
          path: stroke.path,
          median: stroke.points.map((point) => ({ x: point.x, y: point.y })),
        }))
        mainCharacterGroupRef.current = findMainCharacterGroup(container)
      })
      .catch((error) => {
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
        ref={overlaySvgRef}
        className="stroke-animator__overlay"
        viewBox={CHARACTER_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {morphState && pathData && (
          <motion.path
            key={morphState.id}
            d={pathData}
            fill={STROKE_COLOR}
            stroke="none"
            style={{ opacity: overlayOpacity }}
          />
        )}
      </svg>
    </div>
  )
}
