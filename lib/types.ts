export type Participant = {
  id: string;
  name: string;
  role: string;
  color: string;
};

export type ScenarioKey = "dominant" | "silent" | "loop";

export type Message = {
  id: string;
  participantId: string;
  text: string;
  timestamp: number;
  topic: string;
};

export type ScenarioMessage = {
  participantId: string;
  text: string;
  delay: number;
  topic: string;
};

export type Scenario = {
  key: ScenarioKey;
  label: string;
  pulse: string;
  description: string;
  script: ScenarioMessage[];
};

export type Insight = {
  id: string;
  kind: "balance" | "silence" | "loop" | "decision" | "convergence";
  label: string;
  detail: string;
  severity: number;
};

export type ConversationPhase =
  | "exploring"
  | "diverging"
  | "looping"
  | "converging"
  | "deciding";

export type InterventionType =
  | "balance"
  | "invite"
  | "loop"
  | "decision";

export type Intervention = {
  id: string;
  type: InterventionType;
  text: string;
  tone: "soft" | "focus" | "decision";
  confidence: number;
  timestamp: number;
};

export type ConversationMetrics = {
  shareByParticipant: Record<string, number>;
  messageCountByParticipant: Record<string, number>;
  averageWordsByParticipant: Record<string, number>;
  dominanceScoreByParticipant: Record<string, number>;
  totalMessages: number;
  silenceByParticipant: Record<string, number>;
  dominantParticipantId: string | null;
  balanceScore: number;
  phase: ConversationPhase;
  phaseConfidence: number;
  loopScore: number;
  stagnationScore: number;
  repeatedTopics: string[];
  convergenceScore: number;
  decisionReadiness: number;
};

export type Mode = "scenario" | "manual" | "live";

export type MicState = "idle" | "listening" | "muted" | "unsupported";

export type SpeechSynthesisState = "idle" | "speaking" | "paused" | "error";

export type AudioLevel = { level: number; isActive: boolean };
