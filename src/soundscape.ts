import type { ActivityId } from './room'

const chords = [
  [220.00, 277.18, 329.63, 440.00],
  [196.00, 246.94, 329.63, 392.00],
  [174.61, 220.00, 261.63, 349.23],
  [196.00, 246.94, 293.66, 440.00],
]

const interactionTone: Record<ActivityId, [number, number]> = {
  shelf: [392, 523.25],
  repair: [659.25, 783.99],
  water: [523.25, 880],
  record: [440, 659.25],
  collection: [587.33, 739.99],
  desk: [349.23, 523.25],
  cat: [293.66, 392],
}

export class MusicSoundscape {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: GainNode | null = null
  private rain: AudioBufferSourceNode | null = null
  private rainGain: GainNode | null = null
  private sequenceTimer = 0
  private chordIndex = 0
  private enabled = false
  private purrGain: GainNode | null = null
  private purrOscillators: OscillatorNode[] = []

  private ensure() {
    if (this.context) return this.context
    const context = new AudioContext()
    const master = context.createGain()
    const ambient = context.createGain()
    const compressor = context.createDynamicsCompressor()
    master.gain.value = .7
    ambient.gain.value = .0001
    compressor.threshold.value = -22
    compressor.knee.value = 18
    compressor.ratio.value = 3
    compressor.attack.value = .08
    compressor.release.value = .8
    ambient.connect(master)
    master.connect(compressor).connect(context.destination)
    this.context = context
    this.master = master
    this.ambient = ambient
    this.createRain()
    return context
  }

  private createRain() {
    const context = this.context!
    const frameCount = context.sampleRate * 4
    const buffer = context.createBuffer(2, frameCount, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let smooth = 0
      for (let i = 0; i < frameCount; i++) {
        const drop = Math.random() > .9992 ? (Math.random() * 2 - 1) * .8 : 0
        smooth = smooth * .86 + (Math.random() * 2 - 1) * .14
        data[i] = smooth * .35 + drop
      }
    }
    const source = context.createBufferSource()
    const highpass = context.createBiquadFilter()
    const lowpass = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = buffer
    source.loop = true
    highpass.type = 'highpass'
    highpass.frequency.value = 900
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 6200
    gain.gain.value = .052
    source.connect(highpass).connect(lowpass).connect(gain).connect(this.ambient!)
    source.start()
    this.rain = source
    this.rainGain = gain
  }

  async setAmbient(enabled: boolean) {
    const context = this.ensure()
    this.enabled = enabled
    await context.resume()
    if (this.enabled !== enabled) return
    const now = context.currentTime
    this.ambient!.gain.cancelScheduledValues(now)
    this.ambient!.gain.setValueAtTime(this.ambient!.gain.value, now)
    this.ambient!.gain.linearRampToValueAtTime(enabled ? .82 : 0, now + (enabled ? 1.2 : .08))
    if (enabled) {
      this.scheduleChord()
      window.clearInterval(this.sequenceTimer)
      this.sequenceTimer = window.setInterval(() => this.scheduleChord(), 7200)
    } else {
      window.clearInterval(this.sequenceTimer)
      this.sequenceTimer = 0
    }
  }

  private scheduleChord() {
    if (!this.enabled || !this.context || !this.ambient) return
    const context = this.context
    const now = context.currentTime
    const notes = chords[this.chordIndex++ % chords.length]
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const filter = context.createBiquadFilter()
      oscillator.type = index % 2 ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      oscillator.detune.value = index % 2 ? 3 : -3
      filter.type = 'lowpass'
      filter.frequency.value = 1450
      gain.gain.setValueAtTime(.0001, now)
      gain.gain.exponentialRampToValueAtTime(index === 0 ? .018 : .012, now + 2.2 + index * .12)
      gain.gain.setValueAtTime(index === 0 ? .018 : .012, now + 4.5)
      gain.gain.exponentialRampToValueAtTime(.0001, now + 7.1)
      oscillator.connect(filter).connect(gain).connect(this.ambient!)
      oscillator.start(now)
      oscillator.stop(now + 7.2)
    })
    const melody = [659.25, 783.99, 587.33, 739.99][this.chordIndex % 4]
    window.setTimeout(() => this.bell(melody), 3000)
  }

  private bell(frequency: number) {
    if (!this.enabled || !this.context || !this.ambient) return
    const now = this.context.currentTime
    for (const [ratio, volume] of [[1, .026], [2.01, .009], [3.98, .003]] as const) {
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency * ratio
      gain.gain.setValueAtTime(volume, now)
      gain.gain.exponentialRampToValueAtTime(.0001, now + 2.8)
      oscillator.connect(gain).connect(this.ambient)
      oscillator.start(now)
      oscillator.stop(now + 2.9)
    }
  }

  async interaction(id: ActivityId) {
    const context = this.ensure()
    await context.resume()
    const now = context.currentTime
    const [first, second] = interactionTone[id]
    const output = context.createGain()
    output.gain.value = .22
    output.connect(this.master!)

    ;[first, second].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = index ? 'sine' : 'triangle'
      oscillator.frequency.setValueAtTime(frequency, now)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (id === 'water' ? 1.18 : .94), now + .42)
      gain.gain.setValueAtTime(index ? .025 : .035, now + index * .045)
      gain.gain.exponentialRampToValueAtTime(.0001, now + .48 + index * .06)
      oscillator.connect(gain).connect(output)
      oscillator.start(now + index * .045)
      oscillator.stop(now + .56)
    })

    if (id === 'water' || id === 'shelf' || id === 'desk') this.textureBurst(id)
  }

  async setPurring(enabled: boolean) {
    const context = this.ensure()
    await context.resume()
    const now = context.currentTime

    if (!enabled) {
      if (!this.purrGain) return
      const gain = this.purrGain
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(Math.max(.0001, gain.gain.value), now)
      gain.gain.exponentialRampToValueAtTime(.0001, now + .24)
      const oscillators = this.purrOscillators
      window.setTimeout(() => oscillators.forEach(oscillator => {
        try { oscillator.stop() } catch { /* already stopped */ }
      }), 280)
      this.purrGain = null
      this.purrOscillators = []
      return
    }

    if (this.purrGain) return
    const output = context.createGain()
    const warmth = context.createBiquadFilter()
    output.gain.setValueAtTime(.0001, now)
    output.gain.exponentialRampToValueAtTime(.032, now + .28)
    warmth.type = 'lowpass'
    warmth.frequency.value = 420
    warmth.Q.value = .55
    output.connect(warmth).connect(this.master!)

    const carriers = [[74, 'sine', .015], [111, 'triangle', .006], [148, 'sine', .0035]] as const
    const oscillators: OscillatorNode[] = []
    carriers.forEach(([frequency, type, volume]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      gain.gain.value = volume
      oscillator.connect(gain).connect(output)
      oscillator.start()
      oscillators.push(oscillator)
    })

    const pulse = context.createOscillator()
    const pulseDepth = context.createGain()
    pulse.type = 'sine'
    pulse.frequency.value = 23.5
    pulseDepth.gain.value = .008
    pulse.connect(pulseDepth).connect(output.gain)
    pulse.start()
    oscillators.push(pulse)
    this.purrGain = output
    this.purrOscillators = oscillators
  }

  private textureBurst(id: ActivityId) {
    const context = this.context!
    const duration = id === 'water' ? .65 : .28
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const envelope = Math.pow(1 - i / data.length, id === 'water' ? 1.7 : 3)
      data[i] = (Math.random() * 2 - 1) * envelope
    }
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    filter.type = id === 'water' ? 'bandpass' : 'highpass'
    filter.frequency.value = id === 'water' ? 2400 : 1700
    filter.Q.value = id === 'water' ? .8 : .45
    gain.gain.value = id === 'water' ? .026 : .014
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(this.master!)
    source.start()
  }

  destroy() {
    window.clearInterval(this.sequenceTimer)
    try { this.rain?.stop() } catch { /* already stopped */ }
    this.purrOscillators.forEach(oscillator => { try { oscillator.stop() } catch { /* already stopped */ } })
    void this.context?.close()
  }
}
