import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useCharacterDataContext } from '../context/CharacterDataContext'
import type { CharacterData as HanziWriterCharacterData } from 'hanzi-writer'

const STROKE_COLOR = '#000'

export interface ColoredOutlinePath {
  path: string
  color: string
  key: string
}

type UseStrokeColorAnimationOptions = {
  character: string
}

export type StrokeColorOverlayProps = {
  staticColors?: boolean
  onComplete?: () => void
}

type StartColorParams = {
  characterStrokeData: HanziWriterCharacterData
}

/**
 * Hook that manages the colored stroke overlay.
 * Generates per-stroke colors from the character decomposition data
 * and exposes a StrokeColorOverlay component for rendering inside an SVG.
 */
export function useStrokeColorAnimation({
  character,
}: UseStrokeColorAnimationOptions) {
  const [characterStrokeData, setCharacterStrokeData] =
    useState<HanziWriterCharacterData | null>(null)

  const { characterData } = useCharacterDataContext()

  const start = useCallback(({ characterStrokeData }: StartColorParams) => {
    setCharacterStrokeData(characterStrokeData)
  }, [])

  const coloredOutlinePaths = useMemo<ColoredOutlinePath[]>(() => {
    if (characterData && characterStrokeData) {
      const { strokeColors } = characterData.getCharacterColorInfo(character)

      return characterStrokeData.strokes.map((stroke, index) => {
        let color = STROKE_COLOR

        if (index < strokeColors.length) {
          color = strokeColors[index]
        } else {
          // TODO: investigate — this branch may be dead code since getCharacterColorInfo
          // already maps all strokes via matches.map(). If so, remove this fallback.
          const directComp = characterData.getComponent(character, index)
          if (directComp) {
            color = characterData.assignColors([directComp])[0]
          }
        }

        return {
          path: stroke.path,
          color,
          key: `stroke-outline-${index}`,
        }
      })
    }
    return []
  }, [characterData, characterStrokeData, character])

  const stop = useCallback(() => {
    setCharacterStrokeData(null)
  }, [])

  // Overlay component rendered inside an SVG
  const StrokeColorOverlay = useCallback(
    ({ staticColors = false, onComplete }: StrokeColorOverlayProps) => {
      if (coloredOutlinePaths.length === 0) return null

      return (
        <motion.g
          initial={{ opacity: 1 }}
          animate={{ opacity: staticColors ? 1 : [1, 1, 0] }}
          transition={
            staticColors
              ? { duration: 0 }
              : {
                  duration: 2,
                  times: [0, 0.83, 1], // Hold for 83%, then fade out
                  ease: 'easeOut',
                }
          }
          onAnimationComplete={() => !staticColors && onComplete?.()}
        >
          {coloredOutlinePaths.map((outline) => (
            <path
              key={outline.key}
              d={outline.path}
              fill={outline.color}
              stroke="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </motion.g>
      )
    },
    [coloredOutlinePaths],
  )

  return {
    StrokeColorOverlay,
    start,
    stop,
  }
}
