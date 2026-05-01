"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { participants, scenarios, demoSequence, SpotlightTone } from "@/lib/demo-data";
import { buildInsights, buildIntervention, buildMetrics } from "@/lib/conversation-engine";
import { ConversationMetrics, Intervention, Message, Mode, Participant, ScenarioKey } from "@/lib/types";
import { LiveAudioControls } from "@/components/live-audio-controls";
import { ModeratorMessage } from "@/components/moderator-message";


const motionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const calmTransition = { duration: 0.72, ease: motionEase };
type Spotlight = {
  id: string;
  title: string;
  note: string;
  tone: SpotlightTone;
};


function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type StatusPillVariant = "aligned" | "diverging" | "converging" | "quiet";

const pillVariantStyles: Record<StatusPillVariant, string> = {
  aligned: "border-teal/30 bg-teal/10 text-teal/80",
  diverging: "border-coral/30 bg-coral/10 text-coral/80",
  converging: "border-sky/30 bg-sky/10 text-sky/80",
  quiet: "border-white/8 bg-white/[0.03] text-white/42",
};

function StatusPill({ variant, label }: { variant: StatusPillVariant; label: string }) {
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-1 font-variant-numeric text-eyebrow uppercase tracking-[0.18em]",
        pillVariantStyles[variant],
      )}
    >
      {label}
    </div>
  );
}

function phaseToVariant(phase: string): StatusPillVariant {
  if (phase === "converging" || phase === "deciding") return "converging";
  if (phase === "diverging") return "diverging";
  if (phase === "exploring") return "quiet";
  return "aligned";
}

function createMessage(participantId: string, text: string, topic: string): Message {
  return {
    id: `${participantId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    participantId,
    text,
    timestamp: Date.now(),
    topic,
  };
}

function createPreviewMessages() {
  const base = Date.now() - 12000;
  return [
    {
      id: `preview-maya-${base}`,
      participantId: "maya",
      text: "Friday is still our target.",
      timestamp: base,
      topic: "launch",
    },
    {
      id: `preview-jon-${base + 1200}`,
      participantId: "jon",
      text: "Performance is holding steady.",
      timestamp: base + 1200,
      topic: "performance",
    },
    {
      id: `preview-lena-${base + 2400}`,
      participantId: "lena",
      text: "The room feels calm when signals stay subtle.",
      timestamp: base + 2400,
      topic: "design",
    },
  ] satisfies Message[];
}

function getVisibleIntervention(
  interventions: Intervention[],
  metrics: ConversationMetrics,
) {
  return (
    interventions.find((intervention) => {
      if (intervention.type === "invite" || intervention.type === "balance") {
        return Boolean(metrics.dominantParticipantId) && metrics.balanceScore < 0.8;
      }
      if (intervention.type === "loop") {
        return metrics.loopScore > 0.58;
      }
      if (intervention.type === "decision") {
        return metrics.decisionReadiness > 0.62;
      }
      return true;
    }) ?? null
  );
}

export function ConvoFlowApp() {
  const [mode, setMode] = useState<Mode>("scenario");
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("dominant");
  const [messages, setMessages] = useState<Message[]>(() => createPreviewMessages());
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(participants[0].id);
  const [draft, setDraft] = useState("");
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [spotlight, setSpotlight] = useState<Spotlight | null>({
    id: "ready",
    title: "Demo ready",
    note: "Press play or let the room begin.",
    tone: "signal",
  });
  const [focusPulse, setFocusPulse] = useState(0);
  const [now, setNow] = useState(Date.now());
  const timersRef = useRef<number[]>([]);
  const autoDemoRef = useRef(false);
  const streamRef = useRef<HTMLDivElement | null>(null);

  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.key === scenarioKey) ?? scenarios[0],
    [scenarioKey],
  );

  const metrics = useMemo<ConversationMetrics>(
    () => buildMetrics(messages, participants, now),
    [messages, now],
  );
  const insights = useMemo(() => buildInsights(metrics, participants), [metrics]);
  const visibleIntervention = useMemo(
    () => getVisibleIntervention(interventions, metrics),
    [interventions, metrics],
  );

  const groupFieldPill = useMemo(() => {
    const total = participants.reduce(
      (sum, p) => sum + (metrics.messageCountByParticipant[p.id] ?? 0),
      0,
    );
    if (total < 3) return null;
    if (metrics.loopScore > 0.58) return { variant: "converging" as StatusPillVariant, label: "DISCUSSION LOOPING" };
    if (metrics.dominantParticipantId && metrics.balanceScore < 0.8)
      return { variant: "diverging" as StatusPillVariant, label: "IMBALANCE FORMS" };
    const hasSilent =
      total >= 5 && participants.some((p) => (metrics.messageCountByParticipant[p.id] ?? 0) === 0);
    if (hasSilent) return { variant: "quiet" as StatusPillVariant, label: "VOICE FADING" };
    if (metrics.convergenceScore > 0.5) return { variant: "aligned" as StatusPillVariant, label: "ROOM ALIGNED" };
    return null;
  }, [metrics]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!streamRef.current) {
      return;
    }
    streamRef.current.scrollTo({
      top: streamRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, visibleIntervention?.id]);

  useEffect(() => {
    const nextIntervention = buildIntervention(metrics, participants, interventions, now);
    if (!nextIntervention) {
      return;
    }
    setInterventions((current) => [nextIntervention, ...current].slice(0, 6));
    if (nextIntervention.confidence >= 0.7) {
      setMessages((current) => [
        ...current,
        createMessage("moderator", nextIntervention.text, "moderation"),
      ]);
    }
  }, [metrics, interventions, now]);

  useEffect(() => {
    if (autoDemoRef.current) {
      return;
    }
    autoDemoRef.current = true;
    const timer = window.setTimeout(() => {
      startGuidedDemo();
    }, 1100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const triggerSpotlight = (next: Spotlight) => {
    setSpotlight(next);
    setFocusPulse((value) => value + 1);
  };

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const runMessageScript = (
    script: Array<{ participantId: string; text: string; topic: string; delay: number }>,
  ) => {
    let elapsed = 0;
    for (const step of script) {
      elapsed += step.delay;
      const timer = window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          createMessage(step.participantId, step.text, step.topic),
        ]);
      }, elapsed);
      timersRef.current.push(timer);
    }
    const stopTimer = window.setTimeout(() => setIsPlaying(false), elapsed + 300);
    timersRef.current.push(stopTimer);
  };

  const startScenario = () => {
    clearTimers();
    setMessages([]);
    setInterventions([]);
    triggerSpotlight({
      id: `scenario-${activeScenario.key}`,
      title: activeScenario.label,
      note: activeScenario.pulse,
      tone: "signal",
    });
    setMode("scenario");
    setIsPlaying(true);
    runMessageScript(activeScenario.script);
  };

  const startGuidedDemo = () => {
    clearTimers();
    setMode("scenario");
    setScenarioKey("dominant");
    setMessages([]);
    setInterventions([]);
    setIsPlaying(true);
    triggerSpotlight({
      id: "demo-start",
      title: "Play Demo",
      note: "Watch the room rebalance itself.",
      tone: "signal",
    });

    let elapsed = 0;
    for (const step of demoSequence) {
      elapsed += step.delay;
      const timer = window.setTimeout(() => {
        if (step.type === "message") {
          setMessages((current) => [
            ...current,
            createMessage(step.participantId, step.text, step.topic),
          ]);
          return;
        }

        triggerSpotlight({
          id: `${step.title}-${Date.now()}`,
          title: step.title,
          note: step.note,
          tone: step.tone,
        });
      }, elapsed);
      timersRef.current.push(timer);
    }

    const stopTimer = window.setTimeout(() => {
      setIsPlaying(false);
      triggerSpotlight({
        id: "demo-end",
        title: "Room aligned",
        note: "The system helped the conversation close cleanly.",
        tone: "decision",
      });
    }, elapsed + 400);
    timersRef.current.push(stopTimer);
  };

  const resetRoom = () => {
    clearTimers();
    setMessages(createPreviewMessages());
    setInterventions([]);
    setSpotlight({
      id: "ready-reset",
      title: "Demo ready",
      note: "The room stays warm between runs.",
      tone: "signal",
    });
    setIsPlaying(false);
  };

  const handleManualSend = () => {
    if (!draft.trim()) {
      return;
    }
    setMode("manual");
    setIsPlaying(false);
    setMessages((current) => [
      ...current,
      createMessage(selectedParticipantId, draft.trim(), inferTopic(draft)),
    ]);
    setDraft("");
  };

  return (
    <motion.main
      animate={{ opacity: 1 }}
      className="relative min-h-screen overflow-hidden bg-canvas text-ink"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <DynamicField metrics={metrics} messages={messages} />
      <div className="absolute inset-0 bg-grain opacity-100" />
      <motion.div
        animate={{
          opacity: 0.16 + metrics.convergenceScore * 0.08,
          scale: 0.985 + metrics.phaseConfidence * 0.025,
        }}
        className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_58%)] blur-3xl"
        transition={calmTransition}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-5 pb-5 pt-5 md:px-8">
        <TopBar
          activeScenarioLabel={activeScenario.label}
          isPlaying={isPlaying}
          mode={mode}
          onPlayDemo={startGuidedDemo}
          onPlay={startScenario}
          onReset={resetRoom}
          onScenarioChange={setScenarioKey}
          scenarioKey={scenarioKey}
          setMode={setMode}
        />

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_360px]">
          <motion.section
            animate={{ scale: spotlight ? 1.002 : 1 }}
            className="relative flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,18,28,0.86),rgba(7,14,22,0.74))] shadow-ambient backdrop-blur-2xl"
            transition={calmTransition}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_26%)]" />
            <AnimatePresence mode="wait">
              {spotlight ? (
                <motion.div
                  key={spotlight.id}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="pointer-events-none absolute left-1/2 top-5 z-20 w-[min(420px,calc(100%-40px))] -translate-x-1/2"
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  initial={{ opacity: 0, y: -14, scale: 0.98 }}
                  transition={calmTransition}
                >
                  <div
                    className={cn(
                      "rounded-[12px] border px-4 py-3 shadow-[0_18px_50px_rgba(3,10,18,0.28)] backdrop-blur-xl",
                      spotlight.tone === "signal" && "border-sky/30 bg-[rgba(141,185,255,0.12)]",
                      spotlight.tone === "balance" && "border-teal/30 bg-[rgba(99,230,216,0.12)]",
                      spotlight.tone === "decision" && "border-gold/30 bg-[rgba(241,201,106,0.12)]",
                    )}
                  >
                    <div className="text-eyebrow uppercase tracking-[0.18em] text-white/48">
                      {spotlight.title}
                    </div>
                    <div className="mt-1 text-body-sm text-white/82">{spotlight.note}</div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              <motion.div
                key={focusPulse}
                animate={{ opacity: [0, 0.28, 0], scale: [0.985, 1.012, 1.02] }}
                className="pointer-events-none absolute inset-0 z-10 rounded-[12px] border border-white/8"
                initial={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 1.2, ease: motionEase }}
              />
            </AnimatePresence>
            <div className="border-b border-white/8 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-eyebrow uppercase tracking-[0.24em] text-mist/70">
                    Group field
                  </div>
                  <div className="mt-1 text-headline leading-none text-ink">
                    Live room
                  </div>
                </div>
                {groupFieldPill && (
                  <StatusPill variant={groupFieldPill.variant} label={groupFieldPill.label} />
                )}
              </div>
            </div>

            <ParticipantRibbon metrics={metrics} />

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
              <ConversationStream
                messages={messages}
                participants={participants}
                streamRef={streamRef}
              />
              {mode === "live" ? (
                <LiveAudioControls
                  interventions={interventions}
                  onMessage={(msg) => {
                    setMessages((current) => [
                      ...current,
                      createMessage(msg.participantId, msg.text, msg.topic ?? inferTopic(msg.text)),
                    ]);
                  }}
                  participants={participants}
                />
              ) : mode === "manual" ? (
                <ManualComposer
                  draft={draft}
                  mode={mode}
                  onDraftChange={setDraft}
                  onModeChange={setMode}
                  onParticipantChange={setSelectedParticipantId}
                  onSend={handleManualSend}
                  participants={participants}
                  selectedParticipantId={selectedParticipantId}
                />
              ) : null}
            </div>
          </motion.section>

          <aside className="flex min-h-[640px] min-w-0 flex-col rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,17,26,0.9),rgba(8,14,22,0.82))] px-5 py-5 shadow-ambient backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <div className="text-eyebrow uppercase tracking-[0.24em] text-mist/70">Signals</div>
                <div className="mt-1 text-headline leading-none">Quiet guidance</div>
              </div>
              <StatusPill
                variant={phaseToVariant(metrics.phase)}
                label={`${metrics.phase} ${Math.round(metrics.phaseConfidence * 100)}`}
              />
            </div>

            <IntelligencePanel
              insights={insights}
              intervention={visibleIntervention}
              metrics={metrics}
              participants={participants}
            />
          </aside>
        </div>
      </div>
    </motion.main>
  );
}

function TopBar({
  activeScenarioLabel,
  isPlaying,
  mode,
  onPlayDemo,
  onPlay,
  onReset,
  onScenarioChange,
  scenarioKey,
  setMode,
}: {
  activeScenarioLabel: string;
  isPlaying: boolean;
  mode: Mode;
  onPlayDemo: () => void;
  onPlay: () => void;
  onReset: () => void;
  onScenarioChange: (scenarioKey: ScenarioKey) => void;
  scenarioKey: ScenarioKey;
  setMode: (mode: Mode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,19,29,0.84),rgba(9,15,24,0.72))] px-4 py-3 shadow-[0_18px_60px_rgba(3,10,18,0.28)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-eyebrow uppercase tracking-[0.24em] text-mist/70">ConvoFlow</div>
          <div className="mt-1 text-body leading-none text-ink">AI moderator for group conversations</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            className={cn(
              "rounded-full px-4 py-2 text-[13px] transition",
              mode === "scenario" ? "bg-white text-slate-950" : "text-white/70",
            )}
            onClick={() => setMode("scenario")}
            type="button"
          >
            Scenario
          </button>
          <button
            className={cn(
              "rounded-full px-4 py-2 text-[13px] transition",
              mode === "manual" ? "bg-white text-slate-950" : "text-white/70",
            )}
            onClick={() => setMode("manual")}
            type="button"
          >
            Manual
          </button>
          <button
            className={cn(
              "rounded-full px-4 py-2 text-[13px] transition",
              mode === "live" ? "bg-white text-slate-950" : "text-white/70",
            )}
            onClick={() => setMode("live")}
            type="button"
          >
            Live
          </button>
        </div>

        {mode === "scenario" && (
          <>
            <button
              className="rounded-full bg-white px-5 py-2.5 text-[13px] text-slate-950 transition"
              onClick={onPlayDemo}
              type="button"
            >
              {isPlaying ? "Playing demo" : "Play Demo"}
            </button>

            <button
              className="cursor-default rounded-full border border-white/8 px-4 py-2.5 text-[13px] text-white/40"
              onClick={onPlay}
              type="button"
            >
              {activeScenarioLabel}
            </button>

            <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.key}
                  className={cn(
                    "rounded-full px-3 py-2 text-[12px] transition",
                    scenarioKey === scenario.key
                      ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)]"
                      : "text-white/55 hover:text-white/80",
                  )}
                  onClick={() => onScenarioChange(scenario.key)}
                  type="button"
                >
                  {scenario.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          className="rounded-full border border-white/10 px-5 py-2.5 text-[13px] text-white/75 transition hover:border-white/25 hover:text-white"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function ParticipantRibbon({ metrics }: { metrics: ConversationMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-white/8 px-5 py-4 md:grid-cols-4">
      {participants.map((participant) => {
        const share = metrics.dominanceScoreByParticipant[participant.id] ?? 0;
        const isDominant = metrics.dominantParticipantId === participant.id;
        const silence = metrics.silenceByParticipant[participant.id] ?? 0;
        const silenceFade = Math.min(silence / 90000, 0.55);

        return (
          <motion.div
            animate={{ opacity: Math.max(0.42, 0.92 - silenceFade) }}
            className="flex flex-col gap-1.5"
            key={participant.id}
            transition={calmTransition}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: participant.color, filter: "saturate(0.6)" }}
                />
                <span className="text-body leading-none text-white">{participant.name}</span>
                <span className="text-eyebrow uppercase tracking-[0.16em] text-mist/60">
                  {participant.role}
                </span>
              </div>
              <span className="text-body-sm tabular-nums text-white/60">
                {Math.round(share * 100)}%
              </span>
            </div>

            <div className="h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                animate={{ width: `${Math.max(4, share * 100)}%` }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: isDominant ? "#63e6d8" : `${participant.color}cc`,
                }}
                transition={calmTransition}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ConversationStream({
  messages,
  participants,
  streamRef,
}: {
  messages: Message[];
  participants: Participant[];
  streamRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative min-h-0 border-r border-white/8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[rgba(7,15,24,0.96)] to-transparent" />
      <div
        className="scrollbar-thin relative flex h-full min-h-[340px] flex-col gap-[12px] overflow-y-auto px-5 py-5"
        ref={streamRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <p className="max-w-sm text-center text-body-sm leading-7 text-white/40">
              The room is already reading who leads, who drifts, and when a nudge helps.
            </p>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            if (message.participantId === "moderator") {
              return <ModeratorMessage key={message.id} text={message.text} />;
            }
            const participant = participants.find(({ id }) => id === message.participantId);
            if (!participant) {
              return null;
            }
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const speakerChanged = prevMessage && prevMessage.participantId !== message.participantId;
            const alignRight = index % 3 === 1;
            return (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", alignRight ? "justify-end" : "justify-start")}
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: 6 }}
                key={message.id}
                layout
                style={{ marginTop: speakerChanged ? "16px" : undefined }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="max-w-[84%] rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: participant.color, filter: "saturate(0.6)" }}
                    />
                    <span className="text-body-sm text-white">{participant.name}</span>
                    <span className="text-eyebrow uppercase tracking-[0.16em] text-white/35">
                      {participant.role}
                    </span>
                  </div>
                  <div className="mt-1.5 text-body leading-[1.5] text-white/82">{message.text}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ManualComposer({
  draft,
  mode,
  onDraftChange,
  onModeChange,
  onParticipantChange,
  onSend,
  participants,
  selectedParticipantId,
}: {
  draft: string;
  mode: Mode;
  onDraftChange: (value: string) => void;
  onModeChange: (mode: Mode) => void;
  onParticipantChange: (participantId: string) => void;
  onSend: () => void;
  participants: Participant[];
  selectedParticipantId: string;
}) {
  return (
    <div className="flex min-h-[300px] flex-col justify-between bg-white/[0.015]">
      <div className="px-5 py-5">
        <div className="text-eyebrow uppercase tracking-[0.24em] text-mist/70">Inject voice</div>
        <div className="mt-2 max-w-xs text-body-sm leading-6 text-white/60">
          Add a voice and watch the room respond.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {participants.map((participant) => (
            <button
              className={cn(
                "rounded-[12px] border px-3 py-3 text-left transition",
                selectedParticipantId === participant.id
                  ? "border-white/20 bg-white/[0.08]"
                  : "border-white/8 bg-white/[0.02]",
              )}
              key={participant.id}
              onClick={() => {
                onModeChange("manual");
                onParticipantChange(participant.id);
              }}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: participant.color, filter: "saturate(0.6)" }}
                />
                <span className="text-body-sm text-white">{participant.name}</span>
              </div>
              <div className="mt-1 text-eyebrow text-mist/60">{participant.role}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-5">
        <div className="rounded-[12px] border border-white/8 bg-black/10 p-4">
          <textarea
            className="min-h-[128px] w-full resize-none border-0 bg-transparent text-body leading-6 text-white outline-none placeholder:text-white/28"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={
              mode === "manual"
                ? "Type as this participant..."
                : "Switch to manual to add a voice..."
            }
            value={draft}
          />
          <div className="mt-3 flex items-center justify-end">
            <button
              className="rounded-full border border-white/10 bg-white px-4 py-2 text-body-sm text-slate-950 transition"
              onClick={onSend}
              type="button"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelligencePanel({
  insights,
  intervention,
  metrics,
  participants,
}: {
  insights: ReturnType<typeof buildInsights>;
  intervention: Intervention | null;
  metrics: ConversationMetrics;
  participants: Participant[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pt-5">
      <SignalConstellation metrics={metrics} participants={participants} />

      <div className="grid gap-3">
        <AnimatePresence initial={false}>
          {intervention ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[12px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              layout
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-eyebrow uppercase tracking-[0.24em] text-mist/62">Prompt</div>
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-eyebrow tabular-nums text-white/40">
                  {Math.round(intervention.confidence * 100)}
                </span>
              </div>
              <div className="mt-1 text-eyebrow uppercase tracking-[0.16em] text-white/30">
                {intervention.type}
              </div>
              <div className="mt-3 text-body leading-[1.5] text-white/88">
                {intervention.text}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {insights.map((insight) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[12px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5"
            initial={{ opacity: 0, y: 6 }}
            key={insight.id}
            layout
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-body-sm text-white/88">{insight.label}</div>
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-eyebrow tabular-nums text-white/40">
                {Math.round(insight.severity * 100)}
              </span>
            </div>
            <div className="mt-2 text-body-sm leading-[1.5] text-white/50">{insight.detail}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SignalConstellation({
  metrics,
  participants,
}: {
  metrics: ConversationMetrics;
  participants: Participant[];
}) {
  return (
    <div className="rounded-[12px] border border-white/8 bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-eyebrow uppercase tracking-[0.24em] text-mist/70">Room state</div>
        <div className="text-eyebrow uppercase tracking-[0.18em] text-white/42">{metrics.phase}</div>
      </div>

      <div className="relative mt-4 h-[220px] overflow-hidden rounded-[12px] border border-white/8 bg-[rgba(255,255,255,0.02)]">
        <motion.div
          animate={{
            opacity: 0.12 + metrics.convergenceScore * 0.08,
            scale: 1 - metrics.convergenceScore * 0.03,
          }}
          className="absolute inset-5 rounded-full border border-white/6"
          transition={calmTransition}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 220" fill="none">
          {participants.map((participant, index) => {
            const share = metrics.dominanceScoreByParticipant[participant.id] ?? 0;
            const x = 64 + index * 66;
            const symmetryPull = metrics.convergenceScore * (index < 2 ? 8 : -8);
            const y = 110 - share * 46 + (index % 2 === 0 ? -10 : 10) + symmetryPull;
            const centerX = 160;
            const centerY = 110;
            return (
              <motion.g
                animate={{ opacity: share > 0 ? 1 : 0.45 }}
                key={participant.id}
                transition={calmTransition}
              >
                <motion.path
                  animate={{
                    d: `M ${x} ${y} Q ${(x + centerX) / 2} ${centerY - 24 + share * 18} ${centerX} ${centerY}`,
                    strokeOpacity: metrics.loopScore > 0.58 ? 0.5 : 0.25 + share * 0.75,
                  }}
                  d={`M ${x} ${y} Q ${(x + centerX) / 2} ${centerY} ${centerX} ${centerY}`}
                  stroke={participant.color}
                  strokeWidth={1.4 + share * 4}
                />
              </motion.g>
            );
          })}
        </svg>

        {participants.map((participant, index) => {
          const share = metrics.dominanceScoreByParticipant[participant.id] ?? 0;
          const messageCount = metrics.messageCountByParticipant[participant.id] ?? 0;
          const top =
            76 + (index % 2 === 0 ? 14 : 92) - share * 34 - metrics.convergenceScore * 10;
          const left =
            28 + index * 70 + (metrics.convergenceScore - 0.5) * (index - 1.5) * -14;
          return (
            <motion.div
              animate={{
                scale: 0.8 + share * 1.62,
                opacity: Math.max(0.35, 0.55 + share),
              }}
              className="absolute flex h-12 w-12 items-center justify-center rounded-full border border-white/8 text-eyebrow tabular-nums text-white"
              key={participant.id}
              style={{
                background: `${participant.color}18`,
                left,
                top,
              }}
              transition={calmTransition}
            >
              {messageCount}
            </motion.div>
          );
        })}

        <motion.div
          animate={{
            scale: 0.92 + metrics.convergenceScore * 0.22,
            opacity: 0.38 + metrics.convergenceScore * 0.32,
          }}
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(255,255,255,0.04),transparent_62%)]"
          transition={calmTransition}
        />
      </div>
    </div>
  );
}

function DynamicField({
  metrics,
  messages,
}: {
  metrics: ConversationMetrics;
  messages: Message[];
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {participants.map((participant, index) => {
        const share = metrics.dominanceScoreByParticipant[participant.id] ?? 0;
        const silence = metrics.silenceByParticipant[participant.id] ?? 0;
        const intensity = Math.max(0.12, share * 1.26 - Math.min(silence / 120000, 0.62));
        return (
          <motion.div
            animate={{
              opacity: 0.06 + intensity * 0.18 - metrics.convergenceScore * 0.03,
              scale: 0.92 + intensity * 0.32,
            }}
            className="absolute rounded-full blur-3xl"
            key={participant.id}
            style={{
              background: participant.color,
              height: 220 + intensity * 140,
              width: 220 + intensity * 140,
              left: `${8 + index * 22}%`,
              top: `${14 + (index % 2) * 32}%`,
            }}
            transition={calmTransition}
          />
        );
      })}

      {messages.slice(-10).map((message, index) => {
        const participant = participants.find(({ id }) => id === message.participantId);
        if (!participant) {
          return null;
        }
        return (
          <motion.div
            animate={{
              opacity: [0, 0.28 + metrics.convergenceScore * 0.06, 0],
              scaleX: [0.88, 1.05, metrics.loopScore > 0.58 ? 1.08 : 1.18],
            }}
            className="absolute left-[18%] right-[18%] h-px origin-center"
            initial={{ opacity: 0 }}
            key={message.id}
            style={{
              background: `linear-gradient(90deg, transparent, ${participant.color}, transparent)`,
              top: `${22 + (index % 8) * 9}%`,
            }}
            transition={{ duration: 3.2, ease: motionEase }}
          />
        );
      })}
    </div>
  );
}

function inferTopic(text: string) {
  const value = text.toLowerCase();
  if (value.includes("decid") || value.includes("choose")) {
    return "decision";
  }
  if (value.includes("launch") || value.includes("date")) {
    return "launch";
  }
  if (value.includes("risk") || value.includes("concern")) {
    return "risk";
  }
  if (value.includes("design") || value.includes("layout")) {
    return "design";
  }
  return "general";
}
