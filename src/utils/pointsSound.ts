// Synthesized points collection sound using Web Audio API
let audioContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export const initAudio = () => {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
}

// Output variants for consumers
export const PointsSoundVariant = {
  Standard: 'standard',
  Good: 'good',
  Great: 'great',
  Perfect: 'perfect',
} as const

export type PointsSoundVariant =
  (typeof PointsSoundVariant)[keyof typeof PointsSoundVariant]

export function playPointsSound(
  variant: PointsSoundVariant = PointsSoundVariant.Standard,
) {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    let pitchMultiplier = 1.0
    // switch (variant) works with the values string
    switch (variant) {
      case PointsSoundVariant.Perfect:
        pitchMultiplier = 1.335 // +5 semitones (Perfect 4th)
        break
      case PointsSoundVariant.Great:
        pitchMultiplier = 1.26 // +4 semitones (Major 3rd)
        break
      case PointsSoundVariant.Good:
        pitchMultiplier = 1.122 // +2 semitones (Major 2nd)
        break
      case PointsSoundVariant.Standard:
      default:
        pitchMultiplier = 1.0 // Root
        break
    }

    // === BASS PUNCH ===
    const bass = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bass.type = 'sine'
    bass.frequency.setValueAtTime(150 * pitchMultiplier, now)
    bass.frequency.exponentialRampToValueAtTime(80 * pitchMultiplier, now + 0.1)
    bassGain.gain.setValueAtTime(0.3, now)
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    bass.connect(bassGain)
    bassGain.connect(ctx.destination)
    bass.start(now)
    bass.stop(now + 0.2)

    // === MAIN ARPEGGIO (doubled with octave for fullness) ===
    const notes = [880, 1108, 1318] // A5, C#6, E6

    notes.forEach((baseFreq, i) => {
      const freq = baseFreq * pitchMultiplier
      // Main tone
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq * 0.94, now + i * 0.05)
      osc.frequency.exponentialRampToValueAtTime(freq, now + i * 0.05 + 0.03)
      gain.gain.setValueAtTime(0, now + i * 0.05)
      gain.gain.linearRampToValueAtTime(0.5, now + i * 0.05 + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.05)
      osc.stop(now + i * 0.05 + 0.3)

      // Octave harmonic layer
      const oct = ctx.createOscillator()
      const octGain = ctx.createGain()
      oct.type = 'triangle'
      oct.frequency.value = freq * 2
      octGain.gain.setValueAtTime(0, now + i * 0.05)
      octGain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.01)
      octGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2)
      oct.connect(octGain)
      octGain.connect(ctx.destination)
      oct.start(now + i * 0.05)
      oct.stop(now + i * 0.05 + 0.25)
    })

    // === SPARKLE SHIMMER ===
    const shimmer = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmer.type = 'sine'
    shimmer.frequency.value = 3520 * pitchMultiplier // A7
    shimmerGain.gain.setValueAtTime(0, now + 0.1)
    shimmerGain.gain.linearRampToValueAtTime(0.25, now + 0.12)
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    shimmer.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)
    shimmer.start(now + 0.1)
    shimmer.stop(now + 0.4)

    // === TA-DA FANFARE (Perfect only) ===
    // Brassy, celebratory major arpeggio (A Major)
    if (variant === PointsSoundVariant.Perfect) {
      const tadaNotes = [
        { freq: 440, time: 0 }, // A4
        { freq: 554.37, time: 0.1 }, // C#5
        { freq: 659.25, time: 0.2 }, // E5
        { freq: 880, time: 0.3 }, // A5 (Octave)
      ]

      tadaNotes.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()
        osc.type = 'sawtooth' // Brassy tone
        osc.frequency.setValueAtTime(freq * pitchMultiplier, now + time)

        // Lowpass filter to smooth the harsh sawtooth
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000, now + time)

        oscGain.gain.setValueAtTime(0, now + time)
        oscGain.gain.linearRampToValueAtTime(0.1, now + time + 0.05) // Quick attack
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.6) // Short-medium decay

        osc.connect(filter)
        filter.connect(oscGain)
        oscGain.connect(ctx.destination)

        osc.start(now + time)
        osc.stop(now + time + 0.8)
      })
    }
  } catch (e) {
    console.warn('Could not play points sound:', e)
  }
}
