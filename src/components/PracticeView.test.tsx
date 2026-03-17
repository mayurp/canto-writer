import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PracticeView } from './PracticeView'
import { ReviewRating } from '../srs/types'

type MockCard = {
  id: string
  character: string
  meaning: string
  order: number
  story?: string
  learnedOutline?: boolean
  rthOrder?: number
}

const mockGradeCard = vi.fn()
const mockTriggerPointsAnimation = vi.fn()

let mockCurrentCard: MockCard | null = null
let mockDueCount = 1
let mockShouldShowOutline = true

vi.mock('../context/SchedulerContext', () => ({
  useSchedulerContext: () => ({
    currentCard: mockCurrentCard,
    gradeCard: mockGradeCard,
    shouldShowOutline: vi.fn(() => mockShouldShowOutline),
    nextDueDate: null,
    dueCount: mockDueCount,
  }),
}))

vi.mock('../context/SettingsContext', () => ({
  useSettingsContext: () => ({
    settings: {
      debug: false,
      orderMode: 'opt',
    },
  }),
}))

vi.mock('../context/VocabExamplesContext', () => ({
  useVocabExamplesContext: () => ({
    examples: {},
  }),
}))

vi.mock('../context/UserStatsContext', () => ({
  useUserStatsContext: () => ({
    animationState: {
      trigger: mockTriggerPointsAnimation,
      pending: [],
      isGlowing: false,
      pillRef: { current: null },
      complete: vi.fn(),
    },
  }),
}))

vi.mock('../context/CharacterDataContext', () => ({
  useCharacterDataContext: () => ({
    characterData: null,
  }),
}))

vi.mock('../utils/pointsSound', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/pointsSound')>()
  return {
    ...actual,
    playPointsSound: vi.fn(),
  }
})

vi.mock('./PointsAnimation', () => ({
  PointsAnimationLayer: () => <div data-testid="points-layer" />,
}))

vi.mock('./CharacterSearch', () => ({
  CharacterSearch: () => null,
}))

vi.mock('./AudioButton', () => ({
  AudioButton: ({
    onClick,
    disabled,
  }: {
    onClick: () => void
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      Play audio
    </button>
  ),
}))

vi.mock('./ComponentCards', () => ({
  ComponentCards: ({
    visible,
    onClick,
  }: {
    visible?: boolean
    onClick?: () => void
  }) =>
    visible ? (
      <button
        type="button"
        data-testid="component-cards"
        disabled={!onClick}
        onClick={onClick}
      >
        Components
      </button>
    ) : null,
}))

vi.mock('./StrokeAnimator', () => ({
  StrokeAnimator: ({
    showOutline,
    sessionKey,
    onQuizComplete,
    onClearStrokes,
  }: {
    showOutline?: boolean
    sessionKey?: number
    onQuizComplete?: (summary: { totalMistakes: number }) => void
    onClearStrokes?: () => void
  }) => (
    <div
      data-testid="stroke-animator"
      data-outline={String(Boolean(showOutline))}
      data-session-key={String(sessionKey ?? 0)}
    >
      <button
        type="button"
        onClick={() => onQuizComplete?.({ totalMistakes: 0 })}
      >
        Finish quiz perfect
      </button>
      <button
        type="button"
        onClick={() => onQuizComplete?.({ totalMistakes: 3 })}
      >
        Finish quiz with mistakes
      </button>
      {onClearStrokes && (
        <button type="button" onClick={onClearStrokes}>
          Clear strokes
        </button>
      )}
    </div>
  ),
}))

class MockResizeObserver {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 260,
            height: 260,
          },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }

  disconnect() {}

  unobserve() {}
}

const baseCard = (): MockCard => ({
  id: 'card-1',
  character: '好',
  meaning: 'good',
  order: 12,
  story: 'A story',
  learnedOutline: false,
})

describe('PracticeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentCard = baseCard()
    mockDueCount = 1
    mockShouldShowOutline = true
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  // Guided cards should show component cards while the parent still keeps Next disabled.
  it('guided cards show component cards and start with Next disabled', () => {
    render(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    expect(screen.getByTestId('component-cards')).toBeEnabled()
    expect(screen.getByTestId('stroke-animator')).toHaveAttribute(
      'data-outline',
      'true',
    )
    expect(
      screen.getByRole('button', { name: 'Clear strokes' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  // Free-writing cards skip intro entirely and hide the component cards.
  it('free-writing cards start active with no component cards', () => {
    mockShouldShowOutline = false

    render(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    expect(screen.queryByTestId('component-cards')).toBeNull()
    expect(screen.getByTestId('stroke-animator')).toHaveAttribute(
      'data-outline',
      'false',
    )
    expect(
      screen.getByRole('button', { name: 'Clear strokes' }),
    ).toBeInTheDocument()
  })

  // Completing the quiz should store pending grading, trigger points, and enable Next.
  it('quiz completion enables Next and grades the card with pending grading', () => {
    mockShouldShowOutline = false

    render(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz perfect' }))

    expect(mockTriggerPointsAnimation).toHaveBeenCalledWith(60)
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(mockGradeCard).toHaveBeenCalledWith('card-1', {
      rating: ReviewRating.Easy,
      learnedOutline: true,
    })
  })

  // Clearing after completion should discard pending grading and disable Next again.
  it('clear removes pending grading and disables Next again', () => {
    mockShouldShowOutline = false

    render(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz perfect' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Clear strokes' }))

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  // A new card should clear the parent-managed grading even if the mode stays the same.
  it('resets pending grading for the next guided card even when outline mode stays true', () => {
    const { rerender } = render(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz perfect' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()

    mockCurrentCard = {
      ...baseCard(),
      id: 'card-2',
      character: '學',
      meaning: 'learn',
    }

    rerender(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  // Next should reset the writer session even if the scheduler keeps the same card current.
  it('resets the writer session when Next keeps the same card current', () => {
    render(
      <PracticeView
        playPronunciation={vi.fn()}
        speaking={false}
        isSupported={false}
        voiceRate={1}
      />,
    )

    expect(screen.getByTestId('stroke-animator')).toHaveAttribute(
      'data-session-key',
      '0',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz perfect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByTestId('stroke-animator')).toHaveAttribute(
      'data-session-key',
      '1',
    )
  })
})
