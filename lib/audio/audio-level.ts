import { AudioLevel } from "@/lib/types";

export class AudioLevelAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrame: number | null = null;
  private onLevelChange: (level: AudioLevel) => void;
  private isActive = false;
  private lastLevel = 0;
  private smoothingFactor = 0.3;
  private lastEmit = 0;

  constructor(onLevelChange: (level: AudioLevel) => void) {
    this.onLevelChange = onLevelChange;
  }

  async start(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isActive = true;
      this.lastEmit = performance.now();
      this.analyze();
    } catch (error) {
      console.error("Failed to start audio level analysis:", error);
      this.onLevelChange({ level: 0, isActive: false });
    }
  }

  stop(): void {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this.onLevelChange({ level: 0, isActive: false });
  }

  private analyze = (): void => {
    if (!this.isActive) {
      return;
    }

    const now = performance.now();
    if (now - this.lastEmit >= 33) {
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate average level
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const rawLevel = average / 255; // Normalize to 0-1

        // Apply exponential smoothing
        this.lastLevel = this.smoothingFactor * rawLevel + (1 - this.smoothingFactor) * this.lastLevel;

        this.onLevelChange({ level: this.lastLevel, isActive: true });
        this.lastEmit = now;
      }
    }

    this.animationFrame = requestAnimationFrame(this.analyze);
  };
}