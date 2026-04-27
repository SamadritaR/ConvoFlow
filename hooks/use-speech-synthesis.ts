import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechSynthesisManager } from "@/lib/audio/speech-synthesis";
import { SpeechSynthesisState } from "@/lib/types";

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [rate, setRate] = useState(0.9);
  const [state, setState] = useState<SpeechSynthesisState>("idle");
  const managerRef = useRef<SpeechSynthesisManager | null>(null);

  useEffect(() => {
    const manager = new SpeechSynthesisManager(setState);
    managerRef.current = manager;

    const availableVoices = manager.getVoices();
    setVoices(availableVoices);
    if (availableVoices.length > 0) {
      setSelectedVoice((current) => current ?? availableVoices[0]);
    }

    manager.onVoicesChanged(() => {
      const updated = manager.getVoices();
      setVoices(updated);
      setSelectedVoice((current) => current ?? updated[0] ?? null);
    });

    return () => {
      manager.stop();
      managerRef.current = null;
    };
  }, []);

  const speak = useCallback(
    (text: string, options?: { voice?: SpeechSynthesisVoice; volume?: number; rate?: number }) => {
      if (!managerRef.current) {
        return;
      }

      managerRef.current.speak(text, {
        voice: options?.voice ?? selectedVoice ?? undefined,
        volume: options?.volume ?? volume,
        rate: options?.rate ?? rate,
      });
    },
    [rate, selectedVoice, volume],
  );

  const stopSpeech = useCallback(() => {
    managerRef.current?.stop();
  }, []);

  const pauseSpeech = useCallback(() => {
    managerRef.current?.pause();
  }, []);

  const resumeSpeech = useCallback(() => {
    managerRef.current?.resume();
  }, []);

  const isSupported = managerRef.current?.isSupported() ?? false;

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    volume,
    setVolume,
    rate,
    setRate,
    state,
    isSupported,
    speak,
    stopSpeech,
    pauseSpeech,
    resumeSpeech,
  };
}
