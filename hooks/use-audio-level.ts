import { useEffect, useRef, useState } from "react";
import { AudioLevelAnalyzer } from "@/lib/audio/audio-level";
import { AudioLevel } from "@/lib/types";

const initialLevel: AudioLevel = { level: 0, isActive: false };

export function useAudioLevel(stream: MediaStream | null) {
  const [audioLevel, setAudioLevel] = useState<AudioLevel>(initialLevel);
  const analyzerRef = useRef<AudioLevelAnalyzer | null>(null);

  useEffect(() => {
    if (!stream) {
      setAudioLevel(initialLevel);
      return;
    }

    const analyzer = new AudioLevelAnalyzer(setAudioLevel);
    analyzerRef.current = analyzer;
    analyzer.start(stream).catch((error) => {
      console.error("AudioLevelAnalyzer failed to start:", error);
      setAudioLevel(initialLevel);
    });

    return () => {
      analyzer.stop();
      analyzerRef.current = null;
      setAudioLevel(initialLevel);
    };
  }, [stream]);

  return audioLevel;
}
