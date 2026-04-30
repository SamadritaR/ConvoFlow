import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechSynthesisManager } from "@/lib/audio/speech-synthesis";
import { SpeechSynthesisState } from "@/lib/types";
import { getModeratorVoice, moderatorVoiceProfile } from "@/lib/voice-profiles";

function filterAndSortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const english = voices.filter((v) => v.lang.startsWith("en"));
  return english.sort((a, b) => {
    const rank = (v: SpeechSynthesisVoice) => {
      if (v.name.startsWith("Google")) return 0;
      if (v.name.startsWith("Microsoft")) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [rate, setRate] = useState(moderatorVoiceProfile.rate);
  const [state, setState] = useState<SpeechSynthesisState>("idle");
  const managerRef = useRef<SpeechSynthesisManager | null>(null);

  useEffect(() => {
    const manager = new SpeechSynthesisManager(setState);
    managerRef.current = manager;

    const load = (raw: SpeechSynthesisVoice[]) => {
      const filtered = filterAndSortVoices(raw);
      setVoices(filtered);
      setSelectedVoice((current) => current ?? getModeratorVoice(filtered) ?? filtered[0] ?? null);
    };

    const initial = manager.getVoices();
    if (initial.length > 0) load(initial);

    manager.onVoicesChanged(() => {
      load(manager.getVoices());
    });

    return () => {
      manager.stop();
      managerRef.current = null;
    };
  }, []);

  const speak = useCallback(
    (
      text: string,
      options?: { voice?: SpeechSynthesisVoice; volume?: number; rate?: number; pitch?: number },
    ) => {
      if (!managerRef.current) return;
      managerRef.current.speak(text, {
        voice: options?.voice ?? selectedVoice ?? undefined,
        volume: options?.volume ?? volume,
        rate: options?.rate ?? rate,
        pitch: options?.pitch,
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
