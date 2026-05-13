import {
  type InstrumentPreset,
  INSTRUMENTS,
  DEFAULT_INSTRUMENT,
} from "~/types";

type AudioSource = AudioBufferSourceNode | OscillatorNode;

interface ActiveEntry {
  source: AudioSource;
  gain: GainNode;
}

function semitoneToFrequency(semitone: number): number {
  return 440 * Math.pow(2, (semitone - 9) / 12); // A4=440Hz, semitone 9 relative to C4
}

class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private bufferCache: Map<string, Map<string, AudioBuffer>> = new Map();
  private volume: number = 0.7;
  private reverbLevel: number = 0;
  private activeSources: Map<string, ActiveEntry> = new Map();
  private initPromise: Promise<void> | null = null;
  private loadedCount = 0;
  private currentPreset: InstrumentPreset = INSTRUMENTS[DEFAULT_INSTRUMENT];

  loadingLabel: string = "";
  onProgress: ((loaded: number, total: number, label: string) => void) | null = null;

  get isFullyLoaded(): boolean {
    if (this.currentPreset.synthesis) return true;
    return this.sampleBuffers.size === this.currentPreset.samplePoints.length;
  }

  get isSynthesis(): boolean {
    return !!this.currentPreset.synthesis;
  }

  private ensureContext(): boolean {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.mainGain = this.audioContext.createGain();
      this.mainGain.gain.value = this.volume;

      // Dry/wet split
      this.dryGain = this.audioContext.createGain();
      this.dryGain.gain.value = 1;
      this.mainGain.connect(this.dryGain);
      this.dryGain.connect(this.audioContext.destination);

      // Reverb: feedback delay network
      this.reverbSend = this.audioContext.createGain();
      this.reverbSend.gain.value = 0;
      this.mainGain.connect(this.reverbSend);
      this.buildReverbTail(this.reverbSend);
      return true;
    }
    return true;
  }

  private buildReverbTail(input: GainNode) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const delays = [0.031, 0.037, 0.041, 0.043];
    const gains = [0.6, 0.5, 0.4, 0.3];
    let prev = input;

    for (let i = 0; i < delays.length; i++) {
      const delay = ctx.createDelay(0.1);
      delay.delayTime.value = delays[i];
      const fbGain = ctx.createGain();
      fbGain.gain.value = gains[i];
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 8000 - i * 1500;

      prev.connect(delay);
      delay.connect(filter);
      filter.connect(fbGain);
      fbGain.connect(delay); // feedback
      fbGain.connect(ctx.destination); // output
      prev = fbGain;
    }
  }

  async init(preset?: InstrumentPreset) {
    const target = preset ?? this.currentPreset;

    // Synthesis instrument — no loading needed
    if (target.synthesis) {
      this.currentPreset = target;
      this.ensureContext();
      return;
    }

    // Same sample instrument already loaded or loading — skip
    if (target.id === this.currentPreset.id && this.initPromise) {
      return this.initPromise;
    }

    // Different instrument — save current to cache, try restore from cache
    if (target.id !== this.currentPreset.id) {
      this.bufferCache.set(this.currentPreset.id, new Map(this.sampleBuffers));
      this.initPromise = null;
      this.currentPreset = target;

      const cached = this.bufferCache.get(target.id);
      if (cached && cached.size === target.samplePoints.length) {
        this.sampleBuffers = new Map(cached);
        return;
      }

      this.sampleBuffers.clear();
    }

    if (this.initPromise) return this.initPromise;

    const samplePoints = this.currentPreset.samplePoints;
    const total = samplePoints.length;

    this.initPromise = (async () => {
      this.ensureContext();

      this.loadingLabel = this.currentPreset.label;
      this.loadedCount = 0;
      this.onProgress?.(0, total, this.loadingLabel);

      await Promise.all(
        samplePoints.map(async (sp) => {
          const response = await fetch(
            chrome.runtime.getURL(`assets/sounds/${sp.file}`)
          );
          const arrayBuffer = await response.arrayBuffer();
          const buffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          this.sampleBuffers.set(sp.noteName, buffer);
          this.loadedCount++;
          this.onProgress?.(this.loadedCount, total, this.loadingLabel);
        })
      );
    })().catch((err) => {
      this.initPromise = null;
      this.loadedCount = 0;
      if (err instanceof Error && err.message.includes("context invalidated")) {
        return;
      }
      throw err;
    });

    return this.initPromise;
  }

  private selectSample(targetSemitone: number): {
    buffer: AudioBuffer;
    detuneCents: number;
  } {
    if (!isFinite(targetSemitone)) throw new Error("Invalid semitone");
    const points = this.currentPreset.samplePoints;
    let best = points[0];
    let bestDist = Infinity;

    for (const sp of points) {
      const dist = Math.abs(targetSemitone - sp.semitone);
      if (dist < bestDist) {
        bestDist = dist;
        best = sp;
      }
    }

    const buffer = this.sampleBuffers.get(best.noteName);
    if (!buffer) throw new Error(`Sample buffer not loaded: ${best.noteName}`);
    const detuneCents = (targetSemitone - best.semitone) * 100;
    return { buffer, detuneCents };
  }

  async playNote(noteId: string, totalSemitone: number, velocity: number = 1) {
    if (!isFinite(totalSemitone) || !isFinite(velocity)) return;
    if (!this.audioContext) {
      try {
        await this.init();
      } catch {
        return;
      }
    }

    if (!this.audioContext || !this.mainGain) return;

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.stopNote(noteId);

    const { semitoneMin, semitoneMax } = this.currentPreset;
    const clamped = Math.max(semitoneMin, Math.min(semitoneMax, totalSemitone));

    const noteGain = this.audioContext!.createGain();
    noteGain.gain.value = velocity * (this.currentPreset.baseGain ?? 1);

    if (this.currentPreset.synthesis) {
      const osc = this.audioContext.createOscillator();
      osc.type = "square";
      osc.frequency.value = semitoneToFrequency(clamped);
      osc.connect(noteGain);
      noteGain.connect(this.mainGain);
      osc.start();
      this.activeSources.set(noteId, { source: osc, gain: noteGain });
    } else {
      let buffer: AudioBuffer, detuneCents: number;
      try {
        const result = this.selectSample(clamped);
        buffer = result.buffer;
        detuneCents = result.detuneCents;
      } catch {
        try { await this.init(); } catch { return; }
        try {
          const result = this.selectSample(clamped);
          buffer = result.buffer;
          detuneCents = result.detuneCents;
        } catch { return; }
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.detune.value = detuneCents;
      source.connect(noteGain);
      noteGain.connect(this.mainGain);
      source.start();
      this.activeSources.set(noteId, { source, gain: noteGain });
    }
  }

  stopNote(noteId: string) {
    const entry = this.activeSources.get(noteId);
    if (entry) {
      this.activeSources.delete(noteId);
      try {
        const now = this.audioContext!.currentTime;
        const v = entry.gain.gain.value;
        if (!isFinite(v)) { entry.source.stop(now); return; }
        entry.gain.gain.cancelScheduledValues(now);
        entry.gain.gain.setValueAtTime(v, now);
        entry.gain.gain.linearRampToValueAtTime(0, now + 0.12);
        entry.source.stop(now + 0.26);
      } catch {
        // already stopped
      }
    }
  }

  stopAllNotes() {
    for (const noteId of this.activeSources.keys()) {
      this.stopNote(noteId);
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.mainGain) {
      this.mainGain.gain.value = this.volume;
    }
  }

  setReverb(level: number) {
    this.reverbLevel = Math.max(0, Math.min(1, level));
    if (this.dryGain) {
      this.dryGain.gain.value = 1 - this.reverbLevel * 0.5;
    }
    if (this.reverbSend) {
      this.reverbSend.gain.value = this.reverbLevel * 0.4;
    }
  }
}

export const audioPlayer = new AudioPlayer();
