import { useCallback, useEffect, useRef, useState } from "react";
import { Intervention, InterventionType, Participant } from "@/lib/types";
import { demoSequence } from "@/lib/demo-data";
import {
  getModeratorVoice,
  getVoiceForParticipant,
  moderatorVoiceProfile,
} from "@/lib/voice-profiles";
import { useSpeechSynthesis } from "./use-speech-synthesis";

const speakableInterventionTypes: Set<InterventionType> = new Set([
  "balance",
  "invite",
  "loop",
  "decision",
]);

export function useScriptedMeeting({
  participants,
  interventions,
  onMessage,
}: {
  participants: Participant[];
  interventions: Intervention[];
  onMessage: (message: { participantId: string; text: string; topic?: string }) => void;
}) {
  const speechSynthesis = useSpeechSynthesis();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  // Stable onMessage ref — avoids stale closures in timer callbacks
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // stepIndexRef alongside state to avoid stale closures in the timer callback
  const stepIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const voiceMapRef = useRef<Map<string, SpeechSynthesisVoice>>(new Map());
  const moderatorVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastSpokenInterventionIdRef = useRef<string | null>(null);
  const waitingInterventionRef = useRef<Intervention | null>(null);

  // Assign participant voices and moderator voice once when voices first become available
  useEffect(() => {
    if (speechSynthesis.voices.length === 0) return;
    if (voiceMapRef.current.size === 0) {
      participants.forEach((participant) => {
        const voice = getVoiceForParticipant(participant.id, speechSynthesis.voices);
        if (voice) voiceMapRef.current.set(participant.id, voice);
      });
    }
    if (!moderatorVoiceRef.current) {
      moderatorVoiceRef.current = getModeratorVoice(speechSynthesis.voices) ?? null;
    }
  }, [participants, speechSynthesis.voices]);

  // Schedule the step at stepIndexRef.current. Sets pendingAdvance when done so the
  // single advancement effect can decide when to move on.
  const scheduleStep = useCallback(() => {
    const index = stepIndexRef.current;
    if (index >= demoSequence.length) {
      setIsPlaying(false);
      return;
    }

    const step = demoSequence[index];
    timerRef.current = window.setTimeout(() => {
      if (step.type === "message") {
        onMessageRef.current({
          participantId: step.participantId,
          text: step.text,
          topic: step.topic,
        });
      }
      stepIndexRef.current = index + 1;
      setCurrentStepIndex(index + 1);
      setPendingAdvance(true);
    }, step.delay);
  }, []);

  // Keep a stable ref so the advancement effect doesn't list scheduleStep as a dep
  const scheduleStepRef = useRef(scheduleStep);
  useEffect(() => {
    scheduleStepRef.current = scheduleStep;
  }, [scheduleStep]);

  // Single advancement effect — the only place that calls the next step.
  useEffect(() => {
    if (!isPlaying || !pendingAdvance || speechSynthesis.state !== "idle") return;
    setPendingAdvance(false);
    scheduleStepRef.current();
  }, [isPlaying, pendingAdvance, speechSynthesis.state]);

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    scheduleStep();
  }, [isPlaying, scheduleStep]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    setPendingAdvance(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    speechSynthesis.stopSpeech();
  }, [speechSynthesis.stopSpeech]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    stepIndexRef.current = 0;
    setPendingAdvance(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    speechSynthesis.stopSpeech();
    lastSpokenInterventionIdRef.current = null;
    waitingInterventionRef.current = null;
  }, [speechSynthesis.stopSpeech]);

  const speakIntervention = useCallback(
    (intervention: Intervention) => {
      if (!speechSynthesis.isSupported) return;
      speechSynthesis.speak(intervention.text, {
        voice: moderatorVoiceRef.current ?? undefined,
        rate: moderatorVoiceProfile.rate,
        pitch: moderatorVoiceProfile.pitch,
      });
      lastSpokenInterventionIdRef.current = intervention.id;
    },
    [speechSynthesis.isSupported, speechSynthesis.speak],
  );

  useEffect(() => {
    if (!interventions.length) return;

    const latest = interventions[interventions.length - 1];
    if (latest.id === lastSpokenInterventionIdRef.current) return;

    if (speechSynthesis.state === "speaking") {
      waitingInterventionRef.current = latest;
      return;
    }

    if (!speakableInterventionTypes.has(latest.type)) {
      lastSpokenInterventionIdRef.current = latest.id;
      return;
    }

    speakIntervention(latest);
  }, [interventions, speechSynthesis.state, speakIntervention]);

  useEffect(() => {
    if (waitingInterventionRef.current && speechSynthesis.state === "idle") {
      speakIntervention(waitingInterventionRef.current);
      waitingInterventionRef.current = null;
    }
  }, [speechSynthesis.state, speakIntervention]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      speechSynthesis.stopSpeech();
    };
  }, [speechSynthesis.stopSpeech]);

  return {
    isPlaying,
    currentStepIndex,
    play,
    pause,
    reset,
    speechSynthesis,
  };
}
