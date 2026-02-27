import { useState, useMemo, useEffect } from 'react'
import { useCharacterDataContext } from '../context/CharacterDataContext'
import './styles/CharacterSearch.css'

type CharacterSearchProps = {
  onSearch: (character: string) => void
  initialCharacter?: string | null
  showSlider?: boolean
}

export function CharacterSearch({
  onSearch,
  initialCharacter,
  showSlider = false,
}: CharacterSearchProps) {
  const [debugInput, setDebugInput] = useState(initialCharacter || '')
  const [rthIndex, setRthIndex] = useState(0)
  const { characterData } = useCharacterDataContext()

  const rthList = useMemo(() => {
    return characterData?.getRthList() || []
  }, [characterData])

  // Sync initial character to slider
  useEffect(() => {
    if (initialCharacter && rthList.length > 0) {
      const index = rthList.indexOf(initialCharacter)
      if (index !== -1) {
        setRthIndex(index)
        setDebugInput(initialCharacter)
      }
    }
  }, [initialCharacter, rthList])

  const handleDebugSearch = (val: string = debugInput) => {
    const trimmed = val.trim()
    if (!trimmed) return

    // Check if input is a number
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10)
      // Treat as RTH index (1-based)
      const index = num - 1
      if (rthList.length > 0 && index >= 0 && index < rthList.length) {
        const char = rthList[index]
        setRthIndex(index)
        onSearch(char)
      } else {
        console.warn('RTH index out of range or list empty')
      }
      return
    }

    // Fallback to character search
    const char = trimmed.charAt(0)
    const code = char.charCodeAt(0)
    const isHanzi = code >= 0x4e00 && code <= 0x9fff

    if (isHanzi) {
      const index = rthList.indexOf(char)
      if (index !== -1) {
        setRthIndex(index)
      }
      onSearch(char)
    } else {
      console.warn('Character not in Hanzi range:', char)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10)
    setRthIndex(index)
    const char = rthList[index]

    if (char) {
      const code = char.charCodeAt(0)
      const isHanzi = code >= 0x4e00 && code <= 0x9fff
      if (isHanzi) {
        setDebugInput(char)
        onSearch(char)
      } else {
        console.warn('Slider mapped to non-Hanzi character:', char)
      }
    }
  }

  return (
    <div className="character-search-container">
      <div className="character-search-input-group">
        <input
          type="text"
          className="character-search-input"
          placeholder="Char or RTH #"
          value={debugInput}
          onChange={(e) => setDebugInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDebugSearch()}
        />
        <button
          type="button"
          className="character-search-button"
          onClick={() => handleDebugSearch()}
        >
          Preview
        </button>
      </div>

      {showSlider && rthList.length > 0 && (
        <div className="character-search-slider-group">
          <label htmlFor="rth-slider" className="character-search-slider-label">
            RTH Order: {rthIndex + 1} / {rthList.length}
          </label>
          <input
            id="rth-slider"
            type="range"
            min="0"
            max={rthList.length - 1}
            value={rthIndex}
            onChange={handleSliderChange}
            className="character-search-slider"
          />
        </div>
      )}
    </div>
  )
}
