"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Intervention, Participant } from "@/lib/types";
import { liveSimulationScript } from "@/lib/demo-data";
import { useLiveMeeting } from "@/hooks/use-live-meeting";
import { useScriptedMeeting } from "@/hooks/use-scripted-meeting";
import { MicStatus } from "./mic-status";
import { ModeratorVoiceControls } from "./moderator-voice-controls";
import { SpeakerSelector } from "./speaker-selector";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function LiveAudioControls({
  interventions,
  onMessage,
  participants,
}: {
  interventions: Intervention[];
  onMessage: (msg: { participantId: string; text: string; topic?: string }) => void;
  participants: Participant[];
}) {
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null);
  const [moderatorVoiceEnabled, setModeratorVoiceEnabled] = useState(true);
  const savedVolumeRef = useRef(0.7);

  const liveMeeting = useLiveMeeting({
    interventions,
    selectedSpeakerId,
    onMessage,
  });

  // Scripted demo (existing demoSequence via default)
  const scriptedMeeting = useScriptedMeeting({
    participants,
    interventions: [],
    onMessage,
  });

  // Live simulation uses the longer realistic script
  const liveSim = useScriptedMeeting({
    participants,
    interventions: [],
    onMessage,
    script: liveSimulationScript,
  });

  const { microphone, speechRecognition, speechSynthesis, audioLevel, micState } = liveMeeting;

  const isDenied = microphone.permissionState === "denied";
  const isRecognitionUnsupported = !speechRecognition.isSupported;

  const handleMicToggle = () => {
    if (microphone.isMicOn) {
      microphone.stopMicrophone();
      speechRecognition.stopRecognition();
    } else {
      microphone.startMicrophone();
      speechRecognition.startRecognition();
    }
  };

  const handleSetModeratorEnabled = (enabled: boolean) => {
    if (!enabled) {
      savedVolumeRef.current = speechSynthesis.volume;
      speechSynthesis.setVolume(0);
    } else {
      speechSynthesis.setVolume(savedVolumeRef.current);
    }
    setModeratorVoiceEnabled(enabled);
  };

  return (
    <div className="flex flex-col gap-6 overflow-y-auto bg-white/[0.015] px-5 py-5">

      {/* Mic section */}
      <div>
        <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-mist/70">Live mic</div>

        <AnimatePresence>
          {isRecognitionUnsupported && (
            <motion.div
              key="unsupported"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mb-3 rounded-[12px] border border-[rgba(241,201,106,0.28)] bg-[rgba(241,201,106,0.07)] px-3 py-2 text-[13px] leading-5 text-[rgba(241,201,106,0.82)]"
            >
              Speech recognition is not supported in this browser. Try Chrome or Edge.
            </motion.div>
          )}
          {!isRecognitionUnsupported && isDenied && (
            <motion.div
              key="denied"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mb-3 rounded-[12px] border border-[rgba(255,133,119,0.28)] bg-[rgba(255,133,119,0.07)] px-3 py-2 text-[13px] leading-5 text-[rgba(255,133,119,0.82)]"
            >
              Microphone access was denied. Enable it in your browser settings.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <MicStatus micState={micState} audioLevel={audioLevel.level} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isRecognitionUnsupported}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] transition",
                microphone.isMicOn
                  ? "border-[rgba(255,133,119,0.3)] bg-[rgba(255,133,119,0.1)] text-[rgba(255,133,119,0.88)]"
                  : "border-white/10 bg-white text-slate-950",
                isRecognitionUnsupported && "cursor-not-allowed opacity-38",
              )}
            >
              {microphone.isMicOn ? "Stop mic" : "Start mic"}
            </button>
            <button
              type="button"
              onClick={liveSim.isPlaying ? liveSim.pause : liveSim.play}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] transition",
                liveSim.isPlaying
                  ? "border-white/10 bg-white/[0.06] text-white/70"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white/90",
              )}
            >
              {liveSim.isPlaying ? "Pause sim" : "Play simulation"}
            </button>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={liveSim.reset}
            className="text-[11px] text-white/36 hover:text-white/55 transition"
          >
            Reset simulation
          </button>
        </div>

        <AnimatePresence>
          {speechRecognition.interimTranscript && (
            <motion.div
              key="interim"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mt-3 rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2 text-[13px] italic leading-5 text-white/42"
            >
              {speechRecognition.interimTranscript}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Speaker selector */}
      <SpeakerSelector
        participants={participants}
        selectedId={selectedSpeakerId}
        onSelect={setSelectedSpeakerId}
      />

      {/* Scripted demo */}
      <div>
        <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-mist/70">Scripted demo</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={scriptedMeeting.isPlaying ? scriptedMeeting.pause : scriptedMeeting.play}
            className="rounded-full border border-white/10 bg-white px-4 py-2 text-[13px] text-slate-950 transition"
          >
            {scriptedMeeting.isPlaying ? "Pause" : "Play demo"}
          </button>
          <button
            type="button"
            onClick={scriptedMeeting.reset}
            className="rounded-full border border-white/10 px-4 py-2 text-[13px] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Moderator voice */}
      <ModeratorVoiceControls
        voices={speechSynthesis.voices}
        selectedVoice={speechSynthesis.selectedVoice}
        setSelectedVoice={speechSynthesis.setSelectedVoice}
        volume={speechSynthesis.volume}
        setVolume={speechSynthesis.setVolume}
        rate={speechSynthesis.rate}
        setRate={speechSynthesis.setRate}
        isEnabled={moderatorVoiceEnabled}
        setIsEnabled={handleSetModeratorEnabled}
      />
    </div>
  );
}
