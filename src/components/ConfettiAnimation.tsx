import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PARTICLE_COUNT = 90
const COLORS = [
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
]
const FRICTION_X = 0.99
const DURATION_MS = 3000

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'circle' | 'rect'
}

function createParticles(width: number, height: number): Particle[] {
  // Scale velocities relative to viewport so the effect looks
  // consistent on phones and large monitors
  const scaleY = height / 800
  const scaleX = width / 400
  // Cap horizontal velocity so particles don't fly off narrow screens
  const maxVx = Math.min(scaleX, 1) * 5
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.2,
    y: height * 0.25 + (Math.random() - 0.5) * height * 0.1,
    vx: (Math.random() - 0.5) * 2 * maxVx,
    vy: (-5 - Math.random() * 8) * scaleY,
    size: (4 + Math.random() * 5) * Math.min(scaleY, 1.5),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.3,
    opacity: 1,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }))
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.fillStyle = p.color

  if (p.shape === 'circle') {
    ctx.beginPath()
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4)
  }

  ctx.restore()
}

type ConfettiAnimationProps = {
  trigger: number
}

export function ConfettiAnimation({ trigger }: ConfettiAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [active, setActive] = useState(false)
  const prevTrigger = useRef(trigger)

  useEffect(() => {
    if (trigger === prevTrigger.current) return
    prevTrigger.current = trigger
    if (trigger === 0) return

    setActive(true)

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    ctx.scale(dpr, dpr)

    const particles = createParticles(window.innerWidth, window.innerHeight)
    const gravity = (window.innerHeight / 800) * 0.234
    const startTime = performance.now()
    let animId = 0

    const animate = (now: number) => {
      const elapsed = now - startTime
      if (elapsed > DURATION_MS) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        setActive(false)
        return
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      for (const p of particles) {
        p.vy += gravity
        p.vx *= FRICTION_X
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed

        // Fade out in the last half of the animation
        const fadeStart = DURATION_MS * 0.5
        if (elapsed > fadeStart) {
          p.opacity = Math.max(
            0,
            1 - (elapsed - fadeStart) / (DURATION_MS - fadeStart),
          )
        }

        drawParticle(ctx, p)
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animId)
  }, [trigger])

  if (!active && trigger === 0) return null

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />,
    document.body,
  )
}
