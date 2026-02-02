// Synthesized points collection sound using Web Audio API
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function playPointsSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // === BASS PUNCH ===
    const bass = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bass.type = 'sine'
    bass.frequency.setValueAtTime(150, now)
    bass.frequency.exponentialRampToValueAtTime(80, now + 0.1)
    bassGain.gain.setValueAtTime(0.3, now)
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    bass.connect(bassGain)
    bassGain.connect(ctx.destination)
    bass.start(now)
    bass.stop(now + 0.2)

    // === MAIN ARPEGGIO (doubled with octave for fullness) ===
    const notes = [880, 1108, 1318] // A5, C#6, E6

    notes.forEach((freq, i) => {
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
    shimmer.frequency.value = 3520 // A7
    shimmerGain.gain.setValueAtTime(0, now + 0.1)
    shimmerGain.gain.linearRampToValueAtTime(0.25, now + 0.12)
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    shimmer.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)
    shimmer.start(now + 0.1)
    shimmer.stop(now + 0.4)
  } catch (e) {
    console.warn('Could not play gem sound:', e)
  }
}
