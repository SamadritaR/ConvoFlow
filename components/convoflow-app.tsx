"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { participants, scenarios } from "@/lib/demo-data";
import { buildInsights, buildIntervention, buildMetrics } from "@/lib/conversation-engine";
import { ConversationMetrics, Intervention, Message, Participant, ScenarioKey } from "@/lib/types";

const scenarioAccent: Record<ScenarioKey, string> = {
  dominant: "#ff8577",
  silent: "#f1c96a",
  loop: "#8db9ff",
};

type Mode = "scenario" | "manual";
const motionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const calmTransition = { duration: 0.72, ease: motionEase };

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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

export function ConvoFlowApp() {
  const [mode, setMode] = useState<Mode>("scenario");
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("dominant");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(participants[0].id);
  const [draft, setDraft] = useState("");
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [now, setNow] = useState(Date.now());
  const timersRef = useRef<number[]>([]);
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
  }, [messages.length, interventions.length]);

  useEffect(() => {
    const nextIntervention = buildIntervention(metrics, participants, interventions, now);
    if (!nextIntervention) {
      return;
    }
    setInterventions((current) => [nextIntervention, ...current].slice(0, 6));
  }, [metrics, interventions, now]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const startScenario = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setMessages([]);
    setInterventions([]);
    setMode("scenario");
    setIsPlaying(true);

    let elapsed = 0;
    for (const step of activeScenario.script) {
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

  const resetRoom = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setMessages([]);
    setInterventions([]);
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
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
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
          onPlay={startScenario}
          onReset={resetRoom}
          onScenarioChange={setScenarioKey}
          scenarioKey={scenarioKey}
          setMode={setMode}
        />

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_360px]">
          <section className="relative flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,28,0.86),rgba(7,14,22,0.74))] shadow-ambient backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_26%)]" />
            <div className="border-b border-white/8 px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-mist/70">
                    Ambient meeting field
                  </div>
                  <div className="mt-2 text-[28px] leading-none text-ink">
                    Conversation in motion
                  </div>
                </div>
                <motion.div
                  animate={{
                    borderColor: scenarioAccent[scenarioKey],
                    boxShadow: `0 0 26px ${scenarioAccent[scenarioKey]}22`,
                    opacity: isPlaying ? 1 : 0.72,
                  }}
                  className="rounded-full border bg-white/[0.025] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/72"
                  transition={calmTransition}
                >
                  {mode === "manual" ? "Manual room" : activeScenario.pulse}
                </motion.div>
              </div>
            </div>

            <ParticipantRibbon metrics={metrics} />

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
              <ConversationStream
                messages={messages}
                participants={participants}
                streamRef={streamRef}
              />
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
            </div>
          </section>

          <aside className="flex min-h-[640px] min-w-0 flex-col rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,26,0.9),rgba(8,14,22,0.82))] px-5 py-5 shadow-ambient backdrop-blur-2xl">
            <div className="flex items-end justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist/70">
                  Intelligence layer
                </div>
                <div className="mt-2 text-[22px] leading-none">Subtle guidance</div>
              </div>
              <motion.div
                animate={{
                  backgroundColor:
                    metrics.convergenceScore > 0.68
                      ? "rgba(99,230,216,0.12)"
                      : "rgba(141,185,255,0.1)",
                }}
                className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/68"
                transition={calmTransition}
              >
                {metrics.phase} {Math.round(metrics.phaseConfidence * 100)}
              </motion.div>
            </div>

            <IntelligencePanel
              insights={insights}
              interventions={interventions}
              metrics={metrics}
              participants={participants}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function TopBar({
  activeScenarioLabel,
  isPlaying,
  mode,
  onPlay,
  onReset,
  onScenarioChange,
  scenarioKey,
  setMode,
}: {
  activeScenarioLabel: string;
  isPlaying: boolean;
  mode: Mode;
  onPlay: () => void;
  onReset: () => void;
  onScenarioChange: (scenarioKey: ScenarioKey) => void;
  scenarioKey: ScenarioKey;
  setMode: (mode: Mode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,19,29,0.84),rgba(9,15,24,0.72))] px-4 py-4 shadow-[0_18px_60px_rgba(3,10,18,0.28)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-mist/70">ConvoFlow</div>
          <div className="mt-1 text-[20px] leading-none text-ink">AI-moderated group dynamics</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {scenarios.map((scenario) => (
            <button
              key={scenario.key}
              className={cn(
                "min-w-[138px] rounded-full px-4 py-2 text-[13px] transition",
                scenarioKey === scenario.key
                  ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)]"
                  : "text-white/68 hover:text-white",
              )}
              onClick={() => onScenarioChange(scenario.key)}
              type="button"
            >
              {scenario.label}
            </button>
          ))}
        </div>

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
        </div>

        <button
          className="rounded-full border border-white/10 bg-white px-5 py-2.5 text-[13px] text-slate-950 transition hover:scale-[1.01]"
          onClick={onPlay}
          type="button"
        >
          {isPlaying ? `Replaying ${activeScenarioLabel}` : `Play ${activeScenarioLabel}`}
        </button>

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
    <div className="grid grid-cols-2 gap-3 border-b border-white/8 px-5 py-4 md:grid-cols-4">
      {participants.map((participant) => {
        const share = metrics.dominanceScoreByParticipant[participant.id] ?? 0;
        const isDominant = metrics.dominantParticipantId === participant.id;
        const silence = metrics.silenceByParticipant[participant.id] ?? 0;
        const silenceFade = Math.min(silence / 90000, 0.55);
        const activity = Math.max(0.28, share - silenceFade * 0.35);

        return (
          <motion.div
            animate={{
              scale: isDominant ? 1.035 + share * 0.06 : 0.985 - silenceFade * 0.04,
              opacity: Math.max(0.42, 0.92 - silenceFade),
              filter: `saturate(${0.82 + activity * 0.55})`,
            }}
            className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            key={participant.id}
            transition={calmTransition}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: 0.86 + activity * 1.55,
                    boxShadow: `0 0 ${18 + activity * 34}px ${participant.color}`,
                    opacity: Math.max(0.45, 0.95 - silenceFade),
                  }}
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: participant.color }}
                  transition={calmTransition}
                />
                <div>
                  <div className="text-[13px] text-white">{participant.name}</div>
                  <div className="text-xs text-mist/70">{participant.role}</div>
                </div>
              </div>
              <div className="text-[13px] text-white/72">{Math.round(share * 100)}%</div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                animate={{ width: `${Math.max(8, share * 100)}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: participant.color }}
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(7,15,24,0.96)] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_28%)]" />
      <div
        className="scrollbar-thin relative flex h-full min-h-[340px] flex-col gap-3 overflow-y-auto px-5 py-5"
        ref={streamRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5], y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="max-w-sm text-center text-sm leading-7 text-white/48"
            >
              Start a scenario or send a message. The room will begin to reveal who is driving,
              who is fading, and when momentum turns into a loop.
            </motion.div>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const participant = participants.find(({ id }) => id === message.participantId);
            if (!participant) {
              return null;
            }

            const alignRight = index % 3 === 1;
            return (
              <motion.div
                animate={{ opacity: 1, x: 0, y: 0 }}
                className={cn("flex", alignRight ? "justify-end" : "justify-start")}
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, x: alignRight ? 20 : -20, y: 16 }}
                key={message.id}
                layout
                transition={{ duration: 0.52, ease: motionEase }}
              >
                <div
                  className="max-w-[84%] rounded-[24px] border border-white/10 px-4 py-3 shadow-[0_22px_60px_rgba(2,8,16,0.34)] backdrop-blur-md"
                  style={{
                    background: `linear-gradient(180deg, ${participant.color}18, rgba(255,255,255,0.04))`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: participant.color }}
                    />
                    <div className="text-[13px] text-white">{participant.name}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/35">
                      {participant.role}
                    </div>
                  </div>
                  <div className="mt-2 text-[14px] leading-6 text-white/86">{message.text}</div>
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
        <div className="text-xs uppercase tracking-[0.24em] text-mist/70">Manual input</div>
        <div className="mt-2 max-w-xs text-[13px] leading-6 text-white/60">
          Drop into the room as any participant and watch the field react in real time.
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {participants.map((participant) => (
            <button
              className={cn(
                "rounded-[18px] border px-3 py-3 text-left transition",
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
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: participant.color }}
                />
                <div className="text-[13px] text-white">{participant.name}</div>
              </div>
              <div className="mt-1 text-xs text-mist/70">{participant.role}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-5">
        <div className="rounded-[22px] border border-white/8 bg-black/10 p-3">
          <textarea
            className="min-h-[128px] w-full resize-none border-0 bg-transparent text-[14px] leading-6 text-white outline-none placeholder:text-white/28"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={
              mode === "manual"
                ? "Type as this participant..."
                : "Switch to manual mode to inject a new voice..."
            }
            value={draft}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              Mode {mode}
            </div>
            <button
              className="rounded-full border border-white/10 bg-white px-4 py-2 text-[13px] text-slate-950 transition hover:scale-[1.01]"
              onClick={onSend}
              type="button"
            >
              Send into room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelligencePanel({
  insights,
  interventions,
  metrics,
  participants,
}: {
  insights: ReturnType<typeof buildInsights>;
  interventions: Intervention[];
  metrics: ConversationMetrics;
  participants: Participant[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pt-5">
      <SignalConstellation metrics={metrics} participants={participants} />

      <div className="grid gap-3">
        <AnimatePresence initial={false}>
          {interventions.length > 0 ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 14 }}
              layout
            >
              <div className="text-[11px] uppercase tracking-[0.24em] text-mist/62">Prompt</div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-white/30">
                <span>{interventions[0].type}</span>
                <span>{Math.round(interventions[0].confidence * 100)} confidence</span>
              </div>
              <div className="mt-3 max-w-[26ch] text-[15px] leading-7 text-white/88">
                {interventions[0].text}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {insights.map((insight) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4"
            initial={{ opacity: 0, y: 10 }}
            key={insight.id}
            layout
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] text-white/88">{insight.label}</div>
              <div className="text-[11px] text-white/34">{Math.round(insight.severity * 100)}</div>
            </div>
            <div className="mt-2 text-[13px] leading-6 text-white/50">{insight.detail}</div>
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
    <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.24em] text-mist/70">Room state</div>
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/42">{metrics.phase}</div>
      </div>

      <div className="relative mt-4 h-[220px] overflow-hidden rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.02)]">
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
                y: metrics.loopScore > 0.58 ? [0, -6, 0, 6, 0] : 0,
              }}
              className="absolute flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-xs text-white"
              key={participant.id}
              style={{
                background: `${participant.color}22`,
                boxShadow: `0 0 ${18 + share * 32}px ${participant.color}40`,
                left,
                top,
              }}
              transition={{
                duration: metrics.loopScore > 0.58 ? 3.2 : 0.5,
                ease: "easeInOut",
                repeat: metrics.loopScore > 0.58 ? Infinity : 0,
              }}
            >
              {messageCount}
            </motion.div>
          );
        })}

        <motion.div
          animate={{
            scale: 0.92 + metrics.convergenceScore * 0.22,
            opacity: 0.38 + metrics.convergenceScore * 0.32,
            rotate: metrics.loopScore > 0.58 ? 360 : 0,
          }}
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,0.04),transparent_62%)]"
          transition={{
            duration: metrics.loopScore > 0.58 ? 8 : 0.8,
            repeat: metrics.loopScore > 0.58 ? Infinity : 0,
            ease: "linear",
          }}
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
              opacity: 0.08 + intensity * 0.3 - metrics.convergenceScore * 0.04,
              scale: 0.92 + intensity * 0.42,
              x: metrics.loopScore > 0.58 ? [0, 18, 0, -18, 0] : [0, 8, 0, -8, 0],
              y: index % 2 === 0 ? [0, -10, 0, 10, 0] : [0, 10, 0, -10, 0],
            }}
            className="absolute rounded-full blur-3xl"
            key={participant.id}
            style={{
              background: participant.color,
              height: 220 + intensity * 180,
              width: 220 + intensity * 180,
              left: `${8 + index * 22}%`,
              top: `${14 + (index % 2) * 32}%`,
            }}
            transition={{
              duration: metrics.loopScore > 0.58 ? 7 : 10 + index,
              repeat: Infinity,
              ease: "easeInOut",
            }}
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
