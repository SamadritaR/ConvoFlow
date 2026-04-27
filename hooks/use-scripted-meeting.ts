import { useCallback, useEffect, useRef, useState } from "react";
import { Intervention, InterventionType, Participant } from "@/lib/types";
import { demoSequence } from "@/lib/demo-data";
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

  // (a) Stable onMessage ref — same pattern as use-live-meeting.ts
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // (b) stepIndexRef alongside state to avoid stale closures in the timer callback
  const stepIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const voiceMapRef = useRef<Map<string, SpeechSynthesisVoice>>(new Map());
  const lastSpokenInterventionIdRef = useRef<string | null>(null);
  const waitingInterventionRef = useRef<Intervention | null>(null);

  // (c) Assign voices once: only when voices first become available and the map is still empty
  useEffect(() => {
    if (speechSynthesis.voices.length > 0 && voiceMapRef.current.size === 0) {
      participants.forEach((participant, index) => {
        voiceMapRef.current.set(
          participant.id,
          speechSynthesis.voices[index % speechSynthesis.voices.length],
        );
      });
    }
  }, [participants, speechSynthesis.voices]);

  // (b) Schedule the step at stepIndexRef.current. Reads index from ref to avoid stale
  // closure; sets pendingAdvance to signal the single advancement effect when done.
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
        const voice = voiceMapRef.current.get(step.participantId);
        speechSynthesis.speak(step.text, {
          voice: voice ?? undefined,
          volume: speechSynthesis.volume,
          rate: speechSynthesis.rate,
        });
      }
      // Advance the ref. For message steps the advancement effect waits for synthesis
      // to go idle before proceeding. For spotlight steps synthesis is already idle,
      // so the effect fires on the pendingAdvance state change itself.
      stepIndexRef.current = index + 1;
      setCurrentStepIndex(index + 1);
      setPendingAdvance(true);
    }, step.delay);
  }, [speechSynthesis.speak, speechSynthesis.volume, speechSynthesis.rate]);

  // Keep a stable ref so the advancement effect below doesn't list scheduleStep as a dep
  // (scheduleStep changes when volume/rate/voice change, which would cause spurious firings).
  const scheduleStepRef = useRef(scheduleStep);
  useEffect(() => {
    scheduleStepRef.current = scheduleStep;
  }, [scheduleStep]);

  // (b) Single advancement effect — the only place that calls the next step.
  // Fires when synthesis becomes idle (message step finished speaking) or immediately
  // when pendingAdvance flips true and synthesis is already idle (spotlight step).
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
      speechSynthesis.speak(intervention.text);
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
