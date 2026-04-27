import { useCallback, useEffect, useRef, useState } from "react";
import { MicState } from "@/lib/types";
import { SpeechRecognitionManager } from "@/lib/audio/speech-recognition";

export type SpeechRecognitionFinalChunk = {
  id: number;
  text: string;
};

export function useSpeechRecognition() {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalChunks, setFinalChunks] = useState<SpeechRecognitionFinalChunk[]>([]);
  const [micState, setMicState] = useState<MicState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionManager | null>(null);
  const nextChunkIdRef = useRef(0);

  useEffect(() => {
    const manager = new SpeechRecognitionManager(
      (text, finalFlag) => {
        if (finalFlag) {
          setFinalChunks((current) => [
            ...current,
            { id: nextChunkIdRef.current++, text },
          ]);
          setInterimTranscript("");
        } else {
          setInterimTranscript(text);
        }
      },
      () => {
        setMicState("idle");
      },
      setMicState,
    );

    recognitionRef.current = manager;
    setIsSupported(manager.isSupported());

    return () => {
      manager.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startRecognition = useCallback(() => {
    setInterimTranscript("");
    recognitionRef.current?.start();
  }, []);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const abortRecognition = useCallback(() => {
    recognitionRef.current?.abort();
  }, []);

  const clearFinalChunks = useCallback(() => {
    setFinalChunks([]);
  }, []);

  return {
    interimTranscript,
    finalChunks,
    micState,
    isSupported,
    startRecognition,
    stopRecognition,
    abortRecognition,
    clearFinalChunks,
  };
}
