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

export type Intervention = {
  id: string;
  text: string;
  tone: "soft" | "focus" | "decision";
  timestamp: number;
};

export type ConversationMetrics = {
  shareByParticipant: Record<string, number>;
  messageCountByParticipant: Record<string, number>;
  totalMessages: number;
  silenceByParticipant: Record<string, number>;
  dominantParticipantId: string | null;
  balanceScore: number;
  repeatedTopics: string[];
  convergenceScore: number;
};
