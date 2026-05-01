# ConvoFlow

AI moderator for group conversations.

ConvoFlow watches how a group is talking and steps in when the conversation breaks down. It catches the three things that quietly ruin most meetings: one person taking over, someone going quiet, and the group looping on the same point without deciding anything.

## Why I'm building this

Most meetings don't fail because people are unprepared. They fail because the structure of the conversation falls apart. One voice dominates. A quieter person checks out. The group circles the same idea three times without landing. A good human moderator catches all of this without thinking. Most meetings don't have a good human moderator.

ConvoFlow is meant to do that job. Quietly, in real time, without taking over the room.

## What it does

The engine watches three signals as the conversation runs:

Dominance, when one person's share of the talking gets too large for the group.

Silence, when a participant stays out of it past the point where they should have weighed in.

Circularity, when the conversation keeps coming back to the same point without converging on a decision.

When the engine is confident enough about a signal (0.8 or higher), ConvoFlow steps in. You see it as a moderator card right in the conversation, and in Live mode you hear it speak. Lower confidence signals stay in the side panel as quieter guidance, so the host can see them without the room being interrupted.

## Demo

The current build ships three scripted scenarios that show each pattern:

Dominant. Maya stacks four messages back to back. The engine catches the imbalance and intervenes.

Silent. Lena drops out of the conversation while the group keeps going. The engine surfaces a gentle invite to bring her back in.

Circular. The group hits the same point three times without resolving. The engine names the loop and pushes toward a decision.

There's also a Live mode with mic input and a browser based moderator voice.

## Roadmap

**v1, current prototype (web).** Browser based demo of the engine across the three scenario types. Real time signal scoring. Moderator presence visible in the conversation and audible in Live mode. Visual room state mapping.

**v2, browser extension (next 3 months).** Chrome and Edge extension for Google Meet and Zoom Web. Listens to the meeting tab, surfaces signals to the host's side panel, optionally speaks interventions through the host's audio. Real TTS through ElevenLabs so the moderator voice actually sounds human.

**v3, bot participant (6+ months).** ConvoFlow joins the meeting as its own participant with audio in and out. Speaks interventions directly into the call. Learns each team's specific dynamics over time. Native integrations with Zoom, Meet, and Teams. Post meeting summaries with conversation health metrics.

## Tech

Next.js 14, TypeScript, Tailwind. Engine is custom signal detection logic written in TypeScript, with an ML upgrade path planned for v2. Voice in v1 is the Web Speech API, moving to ElevenLabs in v2. Design is Linear inspired, built to read at a glance while a real conversation is happening.

## Status

Submitted as part of the Handshake Codex Challenge.
