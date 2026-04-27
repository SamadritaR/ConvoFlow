import { Participant, Scenario } from "@/lib/types";

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
      { participantId: "jon", text: "Prototype performance is stable on desktop now.", delay: 1000, topic: "performance" },
      { participantId: "maya", text: "Good. I need confidence on the mobile pass too.", delay: 1600, topic: "performance" },
      { participantId: "jon", text: "It needs one more optimization pass for the background field.", delay: 1700, topic: "performance" },
      { participantId: "lena", text: "I can simplify the transition layering if needed.", delay: 1900, topic: "design" },
      { participantId: "maya", text: "Let’s do that if it preserves the calm feel.", delay: 1450, topic: "design" },
      { participantId: "jon", text: "We still haven’t heard the research risk on this.", delay: 2100, topic: "research" },
      { participantId: "sora", text: "Users may miss why the prompts appear unless the timing feels earned.", delay: 2400, topic: "research" }
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
      { participantId: "sora", text: "We’re repeating preference without deciding the condition.", delay: 2200, topic: "decision" },
      { participantId: "lena", text: "Then maybe prompt placement changes with conversation intensity.", delay: 2100, topic: "resolution" }
    ],
  },
];
