/**
 * DOM utilities for HanziWriter SVG manipulation
 */

/**
 * Find the main character group within HanziWriter's SVG structure
 */
export const findMainCharacterGroup = (
  root: HTMLElement | null,
): SVGGElement | null => {
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

/**
 * Hide a stroke element and return a restore function
 * Used to hide the actual stroke while showing an animated overlay
 */
export const hideStrokeElement = (
  group: SVGGElement | null,
  strokeIndex: number,
): (() => void) | null => {
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
