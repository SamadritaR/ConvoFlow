import { MicState } from "@/lib/types";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

export class SpeechRecognitionManager {
  private recognition: SpeechRecognition | null = null;
  private supported: boolean;
  private onResult: (transcript: string, isFinal: boolean) => void;
  private onError: (error: string) => void;
  private onStateChange: (state: MicState) => void;

  constructor(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onStateChange: (state: MicState) => void,
  ) {
    this.supported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    this.onResult = onResult;
    this.onError = onError;
    this.onStateChange = onStateChange;

    if (this.supported) {
      const SpeechRecognitionCtor = (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition;
      if (SpeechRecognitionCtor) {
        this.recognition = new SpeechRecognitionCtor();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onstart = () => this.onStateChange("listening");
        this.recognition.onend = () => this.onStateChange("idle");
        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          this.onError(event.error);
          this.onStateChange("idle");
        };
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            this.onResult(finalTranscript, true);
          } else if (interimTranscript) {
            this.onResult(interimTranscript, false);
          }
        };
      }
    } else {
      this.onStateChange("unsupported");
    }
  }

  start(): void {
    if (!this.supported || !this.recognition) {
      this.onStateChange("unsupported");
      return;
    }
    try {
      this.recognition.start();
    } catch {
      this.onError("Failed to start recognition");
    }
  }

  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  isSupported(): boolean {
    return this.supported;
  }
}