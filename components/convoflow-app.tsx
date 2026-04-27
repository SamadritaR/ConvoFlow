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
  const latestIntervention = interventions[0] ?? null;

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
    const nextIntervention = buildIntervention(
      metrics,
      participants,
      latestIntervention,
      now,
    );
    if (!nextIntervention) {
      return;
    }
    setInterventions((current) => [nextIntervention, ...current].slice(0, 6));
  }, [metrics, latestIntervention, now]);

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
          <section className="relative flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[rgba(7,15,24,0.72)] shadow-ambient backdrop-blur-xl">
            <div className="border-b border-white/8 px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-mist/70">
                    Ambient meeting field
                  </div>
                  <div className="mt-2 text-[30px] leading-none text-ink">
                    Conversation in motion
                  </div>
                </div>
                <motion.div
                  animate={{ borderColor: scenarioAccent[scenarioKey], opacity: isPlaying ? 1 : 0.7 }}
                  className="rounded-full border px-4 py-2 text-sm text-white/80"
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

          <aside className="flex min-h-[640px] min-w-0 flex-col rounded-[28px] border border-white/8 bg-[rgba(8,16,24,0.82)] px-5 py-5 shadow-ambient backdrop-blur-xl">
            <div className="flex items-end justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist/70">
                  Intelligence layer
                </div>
                <div className="mt-2 text-2xl leading-none">Subtle guidance</div>
              </div>
              <motion.div
                animate={{
                  backgroundColor:
                    metrics.balanceScore > 0.72 ? "rgba(99,230,216,0.18)" : "rgba(255,133,119,0.18)",
                }}
                className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/70"
              >
                Balance {Math.round(metrics.balanceScore * 100)}
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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/8 bg-[rgba(10,17,27,0.74)] px-4 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-mist/70">ConvoFlow</div>
          <div className="mt-1 text-[22px] leading-none text-ink">AI-moderated group dynamics</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {scenarios.map((scenario) => (
            <button
              key={scenario.key}
              className={cn(
                "min-w-[138px] rounded-full px-4 py-2 text-sm transition",
                scenarioKey === scenario.key
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:text-white",
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
              "rounded-full px-4 py-2 text-sm transition",
              mode === "scenario" ? "bg-white text-slate-950" : "text-white/70",
            )}
            onClick={() => setMode("scenario")}
            type="button"
          >
            Scenario
          </button>
          <button
            className={cn(
              "rounded-full px-4 py-2 text-sm transition",
              mode === "manual" ? "bg-white text-slate-950" : "text-white/70",
            )}
            onClick={() => setMode("manual")}
            type="button"
          >
            Manual
          </button>
        </div>

        <button
          className="rounded-full border border-white/10 bg-white px-5 py-2.5 text-sm text-slate-950 transition hover:scale-[1.01]"
          onClick={onPlay}
          type="button"
        >
          {isPlaying ? `Replaying ${activeScenarioLabel}` : `Play ${activeScenarioLabel}`}
        </button>

        <button
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
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
        const share = metrics.shareByParticipant[participant.id] ?? 0;
        const isDominant = metrics.dominantParticipantId === participant.id;

        return (
          <motion.div
            animate={{
              scale: isDominant ? 1.03 : 1,
              opacity: share > 0 || isDominant ? 1 : 0.7,
            }}
            className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3"
            key={participant.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: 0.95 + share * 1.3,
                    boxShadow: `0 0 ${16 + share * 32}px ${participant.color}`,
                  }}
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: participant.color }}
                />
                <div>
                  <div className="text-sm text-white">{participant.name}</div>
                  <div className="text-xs text-mist/70">{participant.role}</div>
                </div>
              </div>
              <div className="text-sm text-white/80">{Math.round(share * 100)}%</div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                animate={{ width: `${Math.max(8, share * 100)}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: participant.color }}
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(7,15,24,0.94)] to-transparent" />
      <div
        className="scrollbar-thin relative flex h-full min-h-[340px] flex-col gap-3 overflow-y-auto px-5 py-5"
        ref={streamRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5], y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="max-w-sm text-center text-white/48"
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
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div
                  className="max-w-[86%] rounded-[24px] border border-white/8 px-4 py-3 shadow-[0_18px_50px_rgba(2,8,16,0.28)]"
                  style={{
                    background: `linear-gradient(180deg, ${participant.color}16, rgba(255,255,255,0.03))`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: participant.color }}
                    />
                    <div className="text-sm text-white">{participant.name}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/35">
                      {participant.role}
                    </div>
                  </div>
                  <div className="mt-2 text-[15px] leading-6 text-white/86">{message.text}</div>
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
        <div className="mt-2 max-w-xs text-sm leading-6 text-white/62">
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
                <div className="text-sm text-white">{participant.name}</div>
              </div>
              <div className="mt-1 text-xs text-mist/70">{participant.role}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-5">
        <div className="rounded-[22px] border border-white/8 bg-black/10 p-3">
          <textarea
            className="min-h-[128px] w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-white outline-none placeholder:text-white/28"
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
              className="rounded-full border border-white/10 bg-white px-4 py-2 text-sm text-slate-950 transition hover:scale-[1.01]"
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
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 14 }}
              layout
            >
              <div className="text-xs uppercase tracking-[0.24em] text-mist/70">Prompt</div>
              <div className="mt-3 text-lg leading-7 text-white/92">{interventions[0].text}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {insights.map((insight) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
            initial={{ opacity: 0, y: 10 }}
            key={insight.id}
            layout
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-white/90">{insight.label}</div>
              <div className="text-xs text-white/36">{Math.round(insight.severity * 100)}</div>
            </div>
            <div className="mt-2 text-sm leading-6 text-white/52">{insight.detail}</div>
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
    <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.24em] text-mist/70">Room state</div>
        <div className="text-sm text-white/48">
          {metrics.repeatedTopics.length > 0 ? "Loop detected" : "Live"}
        </div>
      </div>

      <div className="relative mt-4 h-[220px] overflow-hidden rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.02)]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 220" fill="none">
          {participants.map((participant, index) => {
            const share = metrics.shareByParticipant[participant.id] ?? 0;
            const x = 64 + index * 66;
            const y = 110 - share * 46 + (index % 2 === 0 ? -10 : 10);
            const centerX = 160;
            const centerY = 110;
            return (
              <motion.g
                animate={{ opacity: share > 0 ? 1 : 0.45 }}
                key={participant.id}
                transition={{ duration: 0.5 }}
              >
                <motion.path
                  animate={{
                    d: `M ${x} ${y} Q ${(x + centerX) / 2} ${centerY - 24 + share * 18} ${centerX} ${centerY}`,
                    strokeOpacity: metrics.repeatedTopics.length ? 0.5 : 0.25 + share * 0.75,
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
          const share = metrics.shareByParticipant[participant.id] ?? 0;
          const messageCount = metrics.messageCountByParticipant[participant.id] ?? 0;
          const top = 76 + (index % 2 === 0 ? 14 : 92) - share * 34;
          const left = 28 + index * 70;
          return (
            <motion.div
              animate={{
                scale: 0.85 + share * 1.5,
                opacity: Math.max(0.35, 0.55 + share),
                y: metrics.repeatedTopics.length > 0 ? [0, -6, 0, 6, 0] : 0,
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
                duration: metrics.repeatedTopics.length > 0 ? 3.2 : 0.5,
                ease: "easeInOut",
                repeat: metrics.repeatedTopics.length > 0 ? Infinity : 0,
              }}
            >
              {messageCount}
            </motion.div>
          );
        })}

        <motion.div
          animate={{
            scale: 0.95 + metrics.convergenceScore * 0.22,
            opacity: 0.5 + metrics.convergenceScore * 0.35,
            rotate: metrics.repeatedTopics.length > 0 ? 360 : 0,
          }}
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          transition={{
            duration: metrics.repeatedTopics.length > 0 ? 8 : 0.8,
            repeat: metrics.repeatedTopics.length > 0 ? Infinity : 0,
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
        const share = metrics.shareByParticipant[participant.id] ?? 0;
        const silence = metrics.silenceByParticipant[participant.id] ?? 0;
        const intensity = Math.max(0.15, share * 1.2 - Math.min(silence / 120000, 0.6));
        return (
          <motion.div
            animate={{
              opacity: 0.12 + intensity * 0.35,
              scale: 0.9 + intensity * 0.45,
              x: metrics.repeatedTopics.length > 0 ? [0, 18, 0, -18, 0] : [0, 8, 0, -8, 0],
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
              duration: metrics.repeatedTopics.length > 0 ? 7 : 10 + index,
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
            animate={{ opacity: [0, 0.34, 0], scaleX: [0.88, 1.06, 1.22] }}
            className="absolute left-[18%] right-[18%] h-px origin-center"
            initial={{ opacity: 0 }}
            key={message.id}
            style={{
              background: `linear-gradient(90deg, transparent, ${participant.color}, transparent)`,
              top: `${22 + (index % 8) * 9}%`,
            }}
            transition={{ duration: 3.2, ease: "easeOut" }}
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
