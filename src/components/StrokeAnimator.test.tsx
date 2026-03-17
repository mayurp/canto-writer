import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrokeAnimator } from './StrokeAnimator'

const { mockWriter, mockCreate } = vi.hoisted(() => {
  const writer = {
    hideCharacter: vi.fn(),
    showCharacter: vi.fn(),
    getCharacterData: vi.fn(),
    quiz: vi.fn(),
  }

  return {
    mockWriter: writer,
    mockCreate: vi.fn(() => writer),
  }
})

vi.mock('hanzi-writer', () => ({
  default: {
    create: mockCreate,
  },
}))

vi.mock('../hooks/useStrokeMorphAnimation', async () => {
  const React = await import('react')

  return {
    useStrokeMorphAnimation: () => {
      const start = React.useCallback(() => {}, [])
      const stop = React.useCallback(() => {}, [])

      const StrokeMorphOverlay = React.useCallback(() => null, [])

      return {
        StrokeMorphOverlay,
        start,
        stop,
      }
    },
  }
})

vi.mock('../hooks/useStrokeGuideAnimation', async () => {
  const React = await import('react')

  return {
    useStrokeGuideAnimation: () => {
      const [visible, setVisible] = React.useState(false)
      const currentIndex = React.useRef(0)

      const start = React.useCallback((index: number) => {
        currentIndex.current = index
        setVisible(true)
      }, [])

      const stop = React.useCallback(() => {
        setVisible(false)
      }, [])

      const StrokeGuideOverlay = React.useCallback(
        () => (visible ? <g data-testid="guide-overlay" /> : null),
        [visible],
      )

      return {
        StrokeGuideOverlay,
        start,
        stop,
        currentIndex,
      }
    },
  }
})

vi.mock('../hooks/useStrokeColorAnimation', async () => {
  const React = await import('react')

  return {
    useStrokeColorAnimation: () => {
      const [ready, setReady] = React.useState(false)

      const start = React.useCallback(() => {
        setReady(true)
      }, [])

      const stop = React.useCallback(() => {
        setReady(false)
      }, [])

      const StrokeColorOverlay = React.useCallback(
        ({
          staticColors = false,
          onComplete,
        }: {
          staticColors?: boolean
          onComplete?: () => void
        }) =>
          ready ? (
            <g
              data-testid={
                staticColors ? 'static-color-overlay' : 'color-overlay'
              }
              onClick={() => {
                if (!staticColors) {
                  onComplete?.()
                }
              }}
            />
          ) : null,
        [ready],
      )

      return {
        StrokeColorOverlay,
        start,
        stop,
      }
    },
  }
})

function StrokeAnimatorHarness({
  showOutline = true,
  debugStrokeColors = false,
  onClearStrokes = vi.fn(),
}: {
  showOutline?: boolean
  debugStrokeColors?: boolean
  onClearStrokes?: () => void
}) {
  const [hintTrigger, setHintTrigger] = useState(0)

  return (
    <>
      <button
        type="button"
        onClick={() => setHintTrigger((count) => count + 1)}
      >
        Replay hint
      </button>
      <StrokeAnimator
        character="好"
        size={260}
        sessionKey={0}
        showOutline={showOutline}
        debugStrokeColors={debugStrokeColors}
        onClearStrokes={onClearStrokes}
        hintTrigger={hintTrigger}
      />
    </>
  )
}

describe('StrokeAnimator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriter.getCharacterData.mockResolvedValue({
      strokes: [
        {
          path: 'M0 0 L10 10',
          points: [
            [0, 0],
            [10, 10],
          ],
        },
      ],
    })
  })

  // Guided mode starts the quiz immediately, but keeps writing blocked until the color overlay finishes.
  it('starts guided cards with a blocking color overlay, then shows the guide overlay after it completes', async () => {
    render(<StrokeAnimatorHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('color-overlay')).toBeInTheDocument()
    })

    expect(mockWriter.quiz).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.stroke-animator__writer')).toHaveStyle({
      pointerEvents: 'none',
    })
    expect(screen.getByRole('button', { name: 'Clear strokes' })).toBeDisabled()

    fireEvent.click(screen.getByTestId('color-overlay'))

    await waitFor(() => {
      expect(screen.getByTestId('guide-overlay')).toBeInTheDocument()
    })

    expect(mockWriter.quiz).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.stroke-animator__writer')).toHaveStyle({
      pointerEvents: 'auto',
    })
    expect(screen.getByRole('button', { name: 'Clear strokes' })).toBeEnabled()
  })

  // Hint replay should reuse the same blocking overlay without restarting the quiz.
  it('replays the blocking color overlay without restarting the quiz', async () => {
    render(<StrokeAnimatorHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('color-overlay')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('color-overlay'))

    await waitFor(() => {
      expect(screen.getByTestId('guide-overlay')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Replay hint' }))

    await waitFor(() => {
      expect(screen.getByTestId('color-overlay')).toBeInTheDocument()
    })
    expect(document.querySelector('.stroke-animator__writer')).toHaveStyle({
      pointerEvents: 'none',
    })
    expect(screen.getByRole('button', { name: 'Clear strokes' })).toBeDisabled()

    fireEvent.click(screen.getByTestId('color-overlay'))

    await waitFor(() => {
      expect(screen.getByTestId('guide-overlay')).toBeInTheDocument()
    })

    expect(document.querySelector('.stroke-animator__writer')).toHaveStyle({
      pointerEvents: 'auto',
    })
    expect(screen.getByRole('button', { name: 'Clear strokes' })).toBeEnabled()
    expect(mockWriter.quiz).toHaveBeenCalledTimes(1)
  })

  // Free-writing mode should start the quiz immediately with no intro/guide overlays.
  it('starts the quiz immediately for free-writing mode', async () => {
    render(<StrokeAnimatorHarness showOutline={false} />)

    await waitFor(() => {
      expect(mockWriter.quiz).toHaveBeenCalledTimes(1)
    })

    expect(screen.queryByTestId('color-overlay')).toBeNull()
    expect(screen.queryByTestId('guide-overlay')).toBeNull()
    expect(screen.getByRole('button', { name: 'Clear strokes' })).toBeEnabled()
  })

  // Debug stroke colors keep the static color overlay visible and block writing.
  it('blocks writing while debug stroke colors are visible', async () => {
    render(<StrokeAnimatorHarness debugStrokeColors={true} />)

    await waitFor(() => {
      expect(screen.getByTestId('static-color-overlay')).toBeInTheDocument()
    })

    expect(mockWriter.quiz).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.stroke-animator__writer')).toHaveStyle({
      pointerEvents: 'none',
    })
    expect(screen.getByRole('button', { name: 'Clear strokes' })).toBeDisabled()
    expect(screen.queryByTestId('guide-overlay')).toBeNull()
  })
})
