import { SpeechSynthesisState } from "@/lib/types";

export class SpeechSynthesisManager {
  private synth: SpeechSynthesis | null = null;
  private supported: boolean;
  private onStateChange: (state: SpeechSynthesisState) => void;
  private voicesChangedCallback?: () => void;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(onStateChange: (state: SpeechSynthesisState) => void) {
    this.supported = typeof window !== "undefined" && "speechSynthesis" in window;
    this.onStateChange = onStateChange;

    if (this.supported) {
      this.synth = window.speechSynthesis;
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.voicesChangedCallback?.();
        };
      }
    } else {
      this.onStateChange("error");
    }
  }

  onVoicesChanged(callback: () => void): void {
    this.voicesChangedCallback = callback;
  }

  speak(text: string, options: { volume?: number; rate?: number; pitch?: number; voice?: SpeechSynthesisVoice } = {}): void {
    if (!this.supported || !this.synth) {
      this.onStateChange("error");
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = options.volume ?? 0.7;
    utterance.rate = options.rate ?? 0.8;
    utterance.pitch = options.pitch ?? 1;

    if (options.voice) {
      utterance.voice = options.voice;
    }

    utterance.onstart = () => this.onStateChange("speaking");
    utterance.onend = () => this.onStateChange("idle");
    utterance.onerror = () => this.onStateChange("error");

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.onStateChange("idle");
    }
  }

  pause(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.onStateChange("paused");
    }
  }

  resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.onStateChange("speaking");
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth ? this.synth.getVoices() : [];
  }

  isSupported(): boolean {
    return this.supported;
  }
}