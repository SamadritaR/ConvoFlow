import { Participant, Scenario } from "@/lib/types";

export type SpotlightTone = "signal" | "balance" | "decision";

export type DemoStep =
  | { type: "message"; participantId: string; text: string; topic: string; delay: number }
  | { type: "spotlight"; delay: number; title: string; note: string; tone: SpotlightTone };

export const participants: Participant[] = [
  { id: "maya", name: "Maya", role: "Product", color: "#63e6d8" },
  { id: "jon", name: "Jon", role: "Engineering", color: "#8db9ff" },
  { id: "sora", name: "Sora", role: "Research", color: "#f1c96a" },
  { id: "lena", name: "Lena", role: "Design", color: "#ff8577" },
];

export const scenarios: Scenario[] = [
  {
    key: "dominant",
    label: "Dominant speaker",
    pulse: "Pressure rises around one voice",
    description: "One participant fills the space until the system opens the circle.",
    script: [
      { participantId: "maya", text: "We should lock the launch date this week.", delay: 900, topic: "launch" },
      { participantId: "maya", text: "If we keep circling, marketing loses runway.", delay: 1600, topic: "launch" },
      { participantId: "jon", text: "The infra work is close, but I still need two days.", delay: 1800, topic: "timeline" },
      { participantId: "maya", text: "Two days is fine, but the date still needs to hold.", delay: 1450, topic: "launch" },
      { participantId: "maya", text: "I want a yes or no so we can move.", delay: 1350, topic: "decision" },
      { participantId: "lena", text: "I have a concern on onboarding clarity.", delay: 2200, topic: "risk" },
      { participantId: "maya", text: "Noted, though I think we can patch that later.", delay: 1300, topic: "risk" },
      { participantId: "sora", text: "We still have unanswered feedback from pilot users.", delay: 2300, topic: "evidence" }
    ],
  },
  {
    key: "silent",
    label: "Silent participant",
    pulse: "A voice fades from the room",
    description: "The room seems fine until absence becomes visible.",
    script: [
      { participantId: "jon", text: "Prototype performance is stable on desktop now.", delay: 900, topic: "performance" },
      { participantId: "jon", text: "Background rendering is optimized — render time down 40%.", delay: 1100, topic: "performance" },
      { participantId: "maya", text: "Does that hold on mobile?", delay: 1400, topic: "performance" },
      { participantId: "jon", text: "Not yet — one more pass before we can commit.", delay: 1000, topic: "performance" },
      { participantId: "jon", text: "I'd strip the transition layering to get there.", delay: 1100, topic: "performance" },
      { participantId: "lena", text: "That might soften the feel though.", delay: 2000, topic: "design" },
      { participantId: "sora", text: "Users may miss why the prompts appear if the timing shifts.", delay: 2600, topic: "research" },
    ],
  },
  {
    key: "loop",
    label: "Circular discussion",
    pulse: "The group keeps orbiting the same point",
    description: "A familiar loop appears and the system nudges toward resolution.",
    script: [
      { participantId: "lena", text: "Should the prompt surface in the side rail or near the thread?", delay: 1100, topic: "placement" },
      { participantId: "maya", text: "Near the thread feels more actionable.", delay: 1500, topic: "placement" },
      { participantId: "jon", text: "Side rail is cleaner because it avoids interrupting flow.", delay: 1600, topic: "placement" },
      { participantId: "lena", text: "I worry the side rail gets ignored when energy spikes.", delay: 1550, topic: "placement" },
      { participantId: "maya", text: "Near the thread feels more actionable.", delay: 1500, topic: "placement" },
      { participantId: "jon", text: "Side rail is cleaner because it avoids interrupting flow.", delay: 1600, topic: "placement" },
      { participantId: "sora", text: "We're repeating preference without deciding the condition.", delay: 2200, topic: "decision" },
      { participantId: "lena", text: "Then maybe prompt placement changes with conversation intensity.", delay: 2100, topic: "resolution" }
    ],
  },
];

export const demoSequence: DemoStep[] = [
  { type: "message", participantId: "maya", text: "We need a launch call by Friday.", topic: "launch", delay: 700 },
  { type: "message", participantId: "jon", text: "Infra can make that if scope stays tight.", topic: "launch", delay: 1100 },
  { type: "message", participantId: "lena", text: "The entry flow is close, but onboarding still needs one pass.", topic: "design", delay: 1200 },
  { type: "spotlight", title: "Balanced room", note: "Several voices shape the start.", tone: "signal", delay: 850 },
  { type: "message", participantId: "maya", text: "I still want the date locked now.", topic: "launch", delay: 1200 },
  { type: "message", participantId: "maya", text: "If we wait longer, marketing loses the window.", topic: "launch", delay: 950 },
  { type: "message", participantId: "maya", text: "I need a yes or no today.", topic: "decision", delay: 900 },
  { type: "spotlight", title: "Imbalance forms", note: "One voice starts to compress the room.", tone: "signal", delay: 900 },
  { type: "message", participantId: "jon", text: "We can do it, but that leaves less room for testing.", topic: "risk", delay: 1700 },
  { type: "message", participantId: "sora", text: "Pilot feedback still points to confusion in the first minute.", topic: "evidence", delay: 2200 },
  { type: "spotlight", title: "Gentle intervention", note: "The system invites the missing perspective in.", tone: "balance", delay: 800 },
  { type: "message", participantId: "lena", text: "If we simplify the first-run path, the date feels safer.", topic: "resolution", delay: 1600 },
  { type: "message", participantId: "maya", text: "That works. Lock Friday if the first-run path ships with it.", topic: "decision", delay: 1400 },
  { type: "spotlight", title: "Balance returns", note: "The room widens, then settles.", tone: "balance", delay: 850 },
  { type: "message", participantId: "jon", text: "Engineering can commit to that version.", topic: "decision", delay: 1500 },
  { type: "message", participantId: "sora", text: "Research is aligned if the simpler path is explicit.", topic: "decision", delay: 1350 },
  { type: "spotlight", title: "Clear convergence", note: "Detection, guidance, alignment.", tone: "decision", delay: 900 },
];
