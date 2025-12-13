import { useEffect, useMemo, useRef } from 'react'
import HanziWriter from 'hanzi-writer'

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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const writer = HanziWriter.create(containerRef.current, hanziWriterId, {
      width: size,
      height: size,
      showOutline: false,
      padding: 8,
      strokeColor: '#f97316',
      delayBetweenLoops: 1200,
    })

    writer.hideCharacter()
    writer.quiz({
      onComplete: () => {
        console.log(`Quiz complete: ${hanziWriterId}`)
        onComplete?.()
      },
    })

    return () => {
      writer.showCharacter()
      containerRef.current?.replaceChildren()
    }
  }, [hanziWriterId, size, sessionKey, onComplete])

  return (
    <div
      ref={containerRef}
      className="stroke-animator"
      role="img"
      aria-label={`Stroke order animation for ${character}`}
      style={style}
    />
  )
}
