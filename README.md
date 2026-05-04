# ConvoFlow

A perceptual instrument for group conversations.

Most meetings fail on structure, not content. One voice takes over. A quieter person checks out. The group circles the same idea three times without landing. These patterns are visible in real time to anyone trained to watch for them, and invisible to everyone else. ConvoFlow makes them visible, and when the moment is right, audible.

## What this actually is

This is not a meeting analytics tool. It does not summarize, transcribe, or score your meeting after the fact. It watches the *shape* of a conversation as it happens, and intervenes only when intervention is warranted. Think of it less as a productivity app and more as a sense organ the group did not previously have.

The hard problem here is not detection. The hard problem is **presence**. An AI that can speak into a human conversation has to know when to stay silent. Most of ConvoFlow's design is about restraint, not capability. The engine continuously scores three structural failure modes. Below a confidence threshold, signals stay quiet in the host's peripheral vision. Above it, the moderator speaks. Once. Briefly. Then it goes back to listening.

## What it watches for

**Dominance.** When one voice's share of the talking gets too large for the group's size and balance.

**Silence.** When a participant stays out of the conversation past the point where their input would normally land.

**Circularity.** When the discussion keeps returning to the same point without converging on a decision.

These three are not arbitrary. They are the structural failure modes a skilled human facilitator catches by instinct, and the ones that quietly degrade meeting quality more than any content level problem.

## How presence works

Two layers, on purpose.

**Quiet guidance.** Lower confidence signals (anywhere in the 0.5 to 0.8 range) appear in the side panel as small cards. The host sees them. The room does not. This is the moderator thinking out loud, not speaking out loud. It catches things a real moderator would also notice but might not act on.

**Intervention.** When confidence crosses 0.8, ConvoFlow speaks. The moderator card moves into the conversation column itself, distinct from participants, and in Live mode it speaks aloud through the moderator voice. One short sentence. Never a paragraph. Never two interventions in a row.

The threshold is the whole product. Tune it too low and the AI becomes a backseat driver and the room resents it. Tune it too high and it never earns its keep. 0.8 is where v1 lands. v2 will calibrate per team based on how often interventions are accepted versus dismissed.

## The three demo scenarios

The current build ships with three scripted scenarios that each isolate one failure mode, so you can see the engine react to a clean signal.

**Dominant.** Maya stacks four messages back to back about a launch deadline. Other voices get one sentence each. The engine catches the imbalance forming and the moderator surfaces a redistribution.

**Silent.** Lena drops out of the conversation while the group keeps going on a topic where her input matters. The engine surfaces a gentle invite to bring her back in before her absence calcifies.

**Circular.** The group returns to the same point three times without resolving. The engine names the loop and pushes toward a decision rather than letting it run for another cycle.

There is also a Live mode where you talk into the mic as one of the participants and the engine responds in real time, with the moderator speaking through the browser's speech synthesis.

## Why I am building this

Most attempts at AI for meetings have been transcription tools wearing different costumes. They sit outside the conversation, write things down, and hand you a summary later. None of them are *in* the conversation. None of them are accountable for what happens next.

I wanted to build the version that is in the room. That requires answering a question almost nobody in this space has answered well: what should an AI presence in a human conversation actually feel like? Not a tool. Not a participant either. Something more like a quiet fifth person whose only job is to notice what the room cannot notice about itself.

The interesting work in ConvoFlow is not the signal detection. The interesting work is the design of restraint.

## Roadmap

**v1, current prototype.** Web based demo of the engine across the three scenario types. Real time signal scoring with the two layer presence model. Visual room state mapping. Browser based moderator voice in Live mode.

**v2, browser extension (next 3 months).** Chrome and Edge extension that runs over Google Meet and Zoom Web. Captures tab audio, runs the engine, surfaces signals to the host's side panel, optionally speaks interventions through the host's audio output. Premium voice through ElevenLabs so the moderator stops sounding like a robot. Per team threshold calibration based on which interventions get accepted versus dismissed.

**v3, bot participant (6+ months).** ConvoFlow joins the call as its own participant with audio in and out. Speaks interventions directly into the room rather than through the host. Native integrations with Zoom, Meet, and Teams. Post meeting summaries focused on conversation health, not content recap.

## Tech

Next.js 14, TypeScript, Tailwind CSS. The engine is custom signal detection logic written in TypeScript, with a clean upgrade path to learned models in v2. Voice in v1 runs on the browser's Web Speech API. The dashboard is built to be readable at a glance during a live conversation, which is a different design constraint than most analytics UI.

## Status

Submitted as part of the Handshake Codex Challenge. Initially aimed at engineering standups, cross functional product meetings, and group facilitators.
