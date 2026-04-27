# ConvoFlow

ConvoFlow is a frontend prototype for an AI-mediated conversation interface. It does not summarize or transcribe meetings. It demonstrates how an ambient system can improve group discussion quality in real time by sensing participation patterns, detecting imbalance, and introducing minimal moderation prompts.

## What it demonstrates

- A live meeting environment with four participants
- Three guided demo scenarios:
  - dominant speaker
  - silent participant
  - circular discussion
- Manual mode for injecting messages as different participants
- A visual intelligence layer that reacts to participation balance, silence, repetition, and convergence
- A lightweight intervention engine that produces subtle prompts without turning the system into a chatbot

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Product concept

Most tools capture conversations after the fact. ConvoFlow focuses on the quality of interaction while the conversation is still happening.

The prototype uses:

- a central conversation stream as the live room
- a dynamic visual field to express energy, balance, and drift
- a side intelligence layer for ambient prompts and state shifts

The goal is that a user understands the product through motion, timing, and structure within seconds.

## Architecture

- `app/`: App Router entrypoints and global styling
- `components/convoflow-app.tsx`: primary experience, layout, motion, and interaction flow
- `lib/demo-data.ts`: participants and demo scenarios
- `lib/conversation-engine.ts`: rules-based metrics, insights, and interventions
- `lib/types.ts`: shared types

## Future vision

This MVP is intentionally frontend-first, but the structure leaves room for:

- live Zoom or Teams ingestion
- real-time voice or turn-taking analysis
- adaptive prompt timing from model-driven signals
- ambient room hardware or display surfaces
- enterprise collaboration workflows and analytics layers

The current rules engine can be replaced with richer AI inference later without changing the visual and interaction model.
