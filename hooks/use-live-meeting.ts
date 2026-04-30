import { useCallback, useEffect, useRef, useState } from "react";
import { Intervention, InterventionType, MicState } from "@/lib/types";
import { getModeratorVoice, moderatorVoiceProfile } from "@/lib/voice-profiles";
import { useAudioLevel } from "./use-audio-level";
import { useMicrophone } from "./use-microphone";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useSpeechSynthesis } from "./use-speech-synthesis";

export type LiveMeetingState = {
  microphone: ReturnType<typeof useMicrophone>;
  speechRecognition: ReturnType<typeof useSpeechRecognition>;
  speechSynthesis: ReturnType<typeof useSpeechSynthesis>;
  audioLevel: ReturnType<typeof useAudioLevel>;
  micState: MicState;
  isReady: boolean;
};

const speakableInterventionTypes: Set<InterventionType> = new Set([
  "balance",
  "invite",
  "loop",
  "decision",
]);

export function useLiveMeeting({
  interventions,
  selectedSpeakerId,
  onMessage,
}: {
  interventions: Intervention[];
  selectedSpeakerId: string | null;
  onMessage: (message: { participantId: string; text: string }) => void;
}) {
  const microphone = useMicrophone();
  const speechRecognition = useSpeechRecognition();
  const speechSynthesis = useSpeechSynthesis();
  const audioLevel = useAudioLevel(microphone.stream);
  const [lastSpokenInterventionId, setLastSpokenInterventionId] = useState<string | null>(null);
  const [lastUserSpeechAt, setLastUserSpeechAt] = useState<number>(0);
  const retryTimerRef = useRef<number | null>(null);
  const skippedInterventionsRef = useRef<Set<string>>(new Set());
  const [retryTrigger, setRetryTrigger] = useState(0);
  const moderatorVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (speechSynthesis.voices.length > 0 && !moderatorVoiceRef.current) {
      moderatorVoiceRef.current = getModeratorVoice(speechSynthesis.voices) ?? null;
    }
  }, [speechSynthesis.voices]);

  const isReady =
    microphone.isMicOn &&
    speechRecognition.isSupported &&
    speechSynthesis.isSupported;

  const speakIntervention = useCallback(
    (intervention: Intervention) => {
      if (!speechSynthesis.isSupported) return;
      speechSynthesis.speak(intervention.text, {
        voice: moderatorVoiceRef.current ?? undefined,
        rate: moderatorVoiceProfile.rate,
        pitch: moderatorVoiceProfile.pitch,
      });
      setLastSpokenInterventionId(intervention.id);
    },
    [speechSynthesis.isSupported, speechSynthesis.speak],
  );

  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRetryTimer();
    };
  }, [clearRetryTimer]);

  useEffect(() => {
    if (!selectedSpeakerId || speechRecognition.finalChunks.length === 0) {
      return;
    }

    for (const chunk of speechRecognition.finalChunks) {
      onMessageRef.current({ participantId: selectedSpeakerId, text: chunk.text });
    }

    speechRecognition.clearFinalChunks();
  }, [selectedSpeakerId, speechRecognition.finalChunks, speechRecognition.clearFinalChunks]);

  useEffect(() => {
    if (speechRecognition.interimTranscript || speechRecognition.finalChunks.length > 0) {
      setLastUserSpeechAt(Date.now());
    }
  }, [speechRecognition.interimTranscript, speechRecognition.finalChunks.length]);

  useEffect(() => {
    clearRetryTimer();

    const candidate = [...interventions]
      .reverse()
      .find((intervention) => {
        if (intervention.id === lastSpokenInterventionId) {
          return false;
        }

        if (skippedInterventionsRef.current.has(intervention.id)) {
          return false;
        }

        if (!speakableInterventionTypes.has(intervention.type)) {
          skippedInterventionsRef.current.add(intervention.id);
          return false;
        }

        return true;
      });

    if (!candidate) {
      return;
    }

    if (speechSynthesis.state === "speaking") {
      return;
    }

    const silenceElapsed = Date.now() - lastUserSpeechAt;
    if (silenceElapsed <= 1000) {
      retryTimerRef.current = window.setTimeout(() => {
        setRetryTrigger((current) => current + 1);
      }, 1000 - silenceElapsed + 50);
      return;
    }

    speakIntervention(candidate);
  }, [
    interventions,
    lastSpokenInterventionId,
    lastUserSpeechAt,
    retryTrigger,
    speechRecognition.finalChunks.length,
    speechRecognition.interimTranscript,
    speechSynthesis.isSupported,
    speechSynthesis.state,
    speakIntervention,
    clearRetryTimer,
  ]);

  return {
    microphone,
    speechRecognition,
    speechSynthesis,
    audioLevel,
    micState: speechRecognition.micState,
    isReady,
  } satisfies LiveMeetingState;
}
