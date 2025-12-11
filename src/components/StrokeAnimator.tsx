import { useEffect, useRef } from 'react'
import HanziWriter from 'hanzi-writer'

type StrokeAnimatorProps = {
  character: string
  hanziWriterId: string
  size?: number
}

export function StrokeAnimator({ character, hanziWriterId, size = 260 }: StrokeAnimatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const writer = HanziWriter.create(containerRef.current, hanziWriterId, {
      width: size,
      height: size,
      showOutline: true,
      padding: 8,
      strokeColor: '#f97316',
      delayBetweenLoops: 1200,
    })

    writer.loopCharacterAnimation()

    return () => {
      writer.pauseAnimation()
      containerRef.current?.replaceChildren()
    }
  }, [hanziWriterId, size])

  return (
    <div
      ref={containerRef}
      className="stroke-animator"
      role="img"
      aria-label={`Stroke order animation for ${character}`}
    />
  )
}
