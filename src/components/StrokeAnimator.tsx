import { useEffect, useMemo, useRef } from 'react'
import HanziWriter from 'hanzi-writer'

type StrokeAnimatorProps = {
  character: string
  hanziWriterId: string
  size?: number
  mode?: 'watch' | 'write'
  sessionKey?: number
}

export function StrokeAnimator({
  character,
  hanziWriterId,
  size = 260,
  mode = 'watch',
  sessionKey = 0,
}: StrokeAnimatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const style = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size])

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const writer = HanziWriter.create(containerRef.current, hanziWriterId, {
      width: size,
      height: size,
      showOutline: mode !== 'write',
      padding: 8,
      strokeColor: '#f97316',
      delayBetweenLoops: 1200,
    })

    if (mode === 'write') {
      writer.hideCharacter()
      writer.quiz()
    } else {
      writer.loopCharacterAnimation()
    }

    return () => {
      if (mode === 'watch') {
        writer.pauseAnimation()
      } else {
        writer.showCharacter()
      }
      containerRef.current?.replaceChildren()
    }
  }, [hanziWriterId, size, mode, sessionKey])

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
