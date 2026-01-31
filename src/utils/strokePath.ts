/**
 * SVG path utilities for stroke drawing
 */
import type { StrokePoint } from 'hanzi-writer'

/**
 * Format a number for SVG path commands
 * Integers stay as-is, decimals are rounded to 2 places
 */
export const formatPathValue = (value: number): string => {
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(2)
}

/**
 * Convert an array of points to an SVG path string
 */
export const pointsToPath = (points: StrokePoint[]): string => {
  if (!points.length) return ''
  const [first, ...rest] = points
  const commands = [`M ${formatPathValue(first.x)} ${formatPathValue(first.y)}`]
  rest.forEach((point) => {
    commands.push(`L ${formatPathValue(point.x)} ${formatPathValue(point.y)}`)
  })
  return commands.join(' ')
}

/**
 * Close a polyline by mirroring points back to start
 * Used for Flubber interpolation which requires closed shapes
 */
export const closePolyline = (points: StrokePoint[]): StrokePoint[] => {
  if (points.length <= 1) return points.slice()
  const closed: StrokePoint[] = [...points]
  for (let i = points.length - 2; i >= 0; i -= 1) {
    closed.push({ ...points[i] })
  }
  return closed
}
