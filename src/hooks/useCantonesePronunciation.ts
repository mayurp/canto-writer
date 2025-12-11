import { useCallback, useEffect, useMemo, useState } from 'react'

const getIsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const selectVoice = (voices: SpeechSynthesisVoice[]) => {
  const lower = (lang?: string) => lang?.toLowerCase() ?? ''

  return (
    voices.find((voice) => lower(voice.lang).includes('yue')) ??
    voices.find((voice) => lower(voice.lang).includes('zh-hk')) ??
    voices.find((voice) => lower(voice.lang).includes('zh')) ??
    voices[0] ??
    null
  )
}

export const useCantonesePronunciation = () => {
  const isSupported = useMemo(() => getIsSupported(), [])
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!isSupported) return
    const synth = window.speechSynthesis

    const hydrateVoices = () => {
      const voices = synth.getVoices()
      setVoice(selectVoice(voices))
    }

    hydrateVoices()
    synth.addEventListener('voiceschanged', hydrateVoices)

    return () => {
      synth.removeEventListener('voiceschanged', hydrateVoices)
    }
  }, [isSupported])

  const playPronunciation = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return
      const synth = window.speechSynthesis
      synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      if (voice) {
        utterance.voice = voice
      }
      utterance.lang = voice?.lang ?? 'zh-HK'
      utterance.rate = 0.9
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      synth.speak(utterance)
    },
    [isSupported, voice],
  )

  const stopPronunciation = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [isSupported])

  return {
    playPronunciation,
    stopPronunciation,
    speaking,
    isSupported,
  }
}
