import {
  ConversationMetrics,
  ConversationPhase,
  Insight,
  Intervention,
  InterventionType,
  Message,
  Participant,
} from "@/lib/types";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "here",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "may",
  "more",
  "need",
  "not",
  "of",
  "on",
  "or",
  "our",
  "so",
  "still",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "this",
  "to",
  "too",
  "we",
  "will",
  "with",
  "yet",
  "you",
]);

const interventionCopy: Record<InterventionType, string[]> = {
  balance: [
    "Let’s widen the circle before this settles.",
    "There’s room for another perspective here.",
    "Let’s open this up a touch before we narrow it.",
  ],
  invite: [
    "We have not heard enough from {name} yet.",
    "{name} may have an angle worth bringing into the room.",
    "It may help to draw {name} in before this settles.",
  ],
  loop: [
    "We may be circling the same point from slightly different angles.",
    "This feels close to repeating itself. A sharper frame could help.",
    "The room is revisiting familiar ground. It may be time to shift the question.",
  ],
  decision: [
    "The conversation seems ready for a choice.",
    "There may be enough signal here to decide.",
    "It feels like the room could move from discussion into commitment.",
  ],
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function keywords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function overlapScore(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(left.size, right.size);
}

function phraseLabel(phase: ConversationPhase) {
  switch (phase) {
    case "exploring":
      return "The room is still opening possibilities";
    case "diverging":
      return "The discussion is spreading into multiple directions";
    case "looping":
      return "The room is revisiting the same ground";
    case "converging":
      return "Signals are beginning to align";
    case "deciding":
      return "The conversation is close to commitment";
  }
}

function phraseDetail(phase: ConversationPhase) {
  switch (phase) {
    case "exploring":
      return "Different threads are still entering the conversation.";
    case "diverging":
      return "The group is expanding outward rather than compressing yet.";
    case "looping":
      return "Momentum is present, but it is not producing new movement.";
    case "converging":
      return "The room is starting to compress around fewer paths.";
    case "deciding":
      return "The discussion has enough shape that a choice may be timely.";
  }
}

export function buildMetrics(
  messages: Message[],
  participants: Participant[],
  now: number,
): ConversationMetrics {
  const totalMessages = messages.length;
  const messageCountByParticipant = Object.fromEntries(
    participants.map((participant) => [participant.id, 0]),
  );
  const totalWordsByParticipant = Object.fromEntries(
    participants.map((participant) => [participant.id, 0]),
  );
  const averageWordsByParticipant = Object.fromEntries(
    participants.map((participant) => [participant.id, 0]),
  );

  for (const message of messages) {
    messageCountByParticipant[message.participantId] += 1;
    totalWordsByParticipant[message.participantId] += words(message.text);
  }

  for (const participant of participants) {
    const count = messageCountByParticipant[participant.id];
    averageWordsByParticipant[participant.id] = count
      ? totalWordsByParticipant[participant.id] / count
      : 0;
  }

  const shareByParticipant = Object.fromEntries(
    participants.map((participant) => [
      participant.id,
      totalMessages ? messageCountByParticipant[participant.id] / totalMessages : 0,
    ]),
  );

  const silenceByParticipant = Object.fromEntries(
    participants.map((participant) => {
      const lastMessage = [...messages]
        .reverse()
        .find((message) => message.participantId === participant.id);
      return [participant.id, lastMessage ? now - lastMessage.timestamp : now];
    }),
  );

  const recentWindow = messages.slice(-6);
  const recentWeights = recentWindow.map((_, index) => (index + 1) / recentWindow.length);
  const recencyScoreByParticipant = Object.fromEntries(
    participants.map((participant) => {
      let weighted = 0;
      recentWindow.forEach((message, index) => {
        if (message.participantId === participant.id) {
          weighted += recentWeights[index];
        }
      });
      return [participant.id, clamp(weighted / 2.4)];
    }),
  );

  const maxAverageWords = Math.max(
    1,
    ...participants.map((participant) => averageWordsByParticipant[participant.id]),
  );
  const interruptionScoreByParticipant = Object.fromEntries(
    participants.map((participant) => [participant.id, 0]),
  );

  for (let index = 1; index < messages.length; index += 1) {
    const message = messages[index];
    const previous = messages[index - 1];
    const gap = message.timestamp - previous.timestamp;
    if (message.participantId === previous.participantId) {
      continue;
    }

    if (gap < 2100) {
      interruptionScoreByParticipant[message.participantId] += 0.5;
    }

    const previousTwo = messages.slice(Math.max(0, index - 2), index);
    const reclaimCount = previousTwo.filter(
      (entry) => entry.participantId === message.participantId,
    ).length;
    if (reclaimCount > 0 && gap < 3200) {
      interruptionScoreByParticipant[message.participantId] += 0.4;
    }
  }

  const maxInterruptions = Math.max(
    1,
    ...participants.map((participant) => interruptionScoreByParticipant[participant.id]),
  );

  const dominanceScoreByParticipant = Object.fromEntries(
    participants.map((participant) => {
      const frequency = shareByParticipant[participant.id];
      const length = averageWordsByParticipant[participant.id] / maxAverageWords;
      const recency = recencyScoreByParticipant[participant.id];
      const interruption =
        interruptionScoreByParticipant[participant.id] / maxInterruptions;
      const score = clamp(
        frequency * 0.42 + length * 0.18 + recency * 0.24 + interruption * 0.16,
      );
      return [participant.id, score];
    }),
  );

  const sortedDominance = [...participants]
    .map((participant) => ({
      participantId: participant.id,
      score: dominanceScoreByParticipant[participant.id],
    }))
    .sort((left, right) => right.score - left.score);

  const dominantParticipantId =
    totalMessages >= 4 &&
    sortedDominance[0].score > 0.56 &&
    sortedDominance[0].score - (sortedDominance[1]?.score ?? 0) > 0.08
      ? sortedDominance[0].participantId
      : null;

  const dominanceSpread =
    (sortedDominance[0]?.score ?? 0) - (sortedDominance[sortedDominance.length - 1]?.score ?? 0);
  const balanceScore = clamp(1 - dominanceSpread * 0.92);

  const recentTopics = messages.slice(-6).map((message) => message.topic);
  const repeatedTopics = [...new Set(recentTopics)].filter((topic) => {
    const hits = recentTopics.filter((item) => item === topic).length;
    return hits >= 3;
  });

  const messageKeywords = messages.map((message) => keywords(message.text));
  const adjacentOverlap = [];
  for (let index = 1; index < messageKeywords.length; index += 1) {
    adjacentOverlap.push(
      overlapScore(messageKeywords[index - 1], messageKeywords[index]),
    );
  }

  const recentOverlap = average(adjacentOverlap.slice(-5));
  const topicInertia = recentTopics.length
    ? Math.max(...repeatedTopics.map((topic) => recentTopics.filter((item) => item === topic).length), 0) /
      recentTopics.length
    : 0;
  const stagnationScore = clamp(topicInertia * 0.55 + recentOverlap * 0.45);
  const loopScore = clamp(stagnationScore * 0.72 + (repeatedTopics.length > 0 ? 0.18 : 0));

  const uniqueRecentTopics = new Set(recentTopics).size;
  const participantSpread = clamp(
    new Set(messages.slice(-6).map((message) => message.participantId)).size /
      participants.length,
  );
  const decisionLanguage = clamp(
    average(
      messages.slice(-4).map((message) => {
        const value = message.text.toLowerCase();
        return /(decid|choose|yes|no|commit|lock|move|agree)/.test(value) ? 1 : 0;
      }),
    ),
  );
  const convergenceScore = clamp(
    (1 - Math.min(uniqueRecentTopics / Math.max(recentTopics.length, 1), 1)) * 0.34 +
      (1 - loopScore) * 0.16 +
      participantSpread * 0.14 +
      decisionLanguage * 0.2 +
      (1 - Math.abs(balanceScore - 0.72)) * 0.16,
  );
  const decisionReadiness = clamp(
    convergenceScore * 0.45 + decisionLanguage * 0.35 + participantSpread * 0.2,
  );

  const explorationScore = clamp((3 - Math.min(totalMessages, 3)) / 3 + uniqueRecentTopics * 0.08);
  const divergenceScore = clamp((uniqueRecentTopics / 4) * 0.6 + (1 - recentOverlap) * 0.4);
  const phaseCandidates = [
    { phase: "exploring", score: totalMessages < 3 ? 0.9 : explorationScore * 0.72 },
    { phase: "diverging", score: totalMessages >= 3 ? divergenceScore : 0.2 },
    { phase: "looping", score: totalMessages >= 5 ? loopScore : 0.1 },
    {
      phase: "converging",
      score: totalMessages >= 4 ? convergenceScore * (1 - decisionLanguage * 0.25) : 0.1,
    },
    {
      phase: "deciding",
      score: totalMessages >= 5 ? decisionReadiness * 0.92 : 0.08,
    },
  ] satisfies Array<{ phase: ConversationPhase; score: number }>;
  phaseCandidates.sort((left, right) => right.score - left.score);

  const phase = phaseCandidates[0]?.phase ?? "exploring";
  const phaseConfidence = clamp(
    (phaseCandidates[0]?.score ?? 0) - (phaseCandidates[1]?.score ?? 0) + 0.45,
  );

  return {
    shareByParticipant,
    messageCountByParticipant,
    averageWordsByParticipant,
    dominanceScoreByParticipant,
    totalMessages,
    silenceByParticipant,
    dominantParticipantId,
    balanceScore,
    phase,
    phaseConfidence,
    loopScore,
    stagnationScore,
    repeatedTopics,
    convergenceScore,
    decisionReadiness,
  };
}

export function buildInsights(
  metrics: ConversationMetrics,
  participants: Participant[],
): Insight[] {
  const insights: Insight[] = [];
  const quietParticipants = [...participants]
    .filter((participant) => metrics.messageCountByParticipant[participant.id] <= 1)
    .sort(
      (left, right) =>
        metrics.silenceByParticipant[right.id] - metrics.silenceByParticipant[left.id],
    );

  if (metrics.dominantParticipantId) {
    const participant = participants.find(
      ({ id }) => id === metrics.dominantParticipantId,
    );
    if (participant) {
      insights.push({
        id: "dominance",
        kind: "balance",
        label: `${participant.name} is carrying the room's momentum`,
        detail: "Influence is clustering around one voice rather than distributing evenly.",
        severity: metrics.dominanceScoreByParticipant[participant.id],
      });
    }
  }

  if (quietParticipants.length > 0 && metrics.totalMessages >= 5) {
    insights.push({
      id: "silence",
      kind: "silence",
      label: `${quietParticipants[0].name} remains at the edge of the discussion`,
      detail: "A quieter perspective is present, but not yet shaping the conversation.",
      severity: clamp(
        quietParticipants.length / participants.length * 0.45 +
          metrics.silenceByParticipant[quietParticipants[0].id] / 180000,
      ),
    });
  }

  if (metrics.loopScore > 0.56) {
    insights.push({
      id: "loop",
      kind: "loop",
      label: "The room is orbiting familiar ground",
      detail: "The topic is recurring with similar language and limited forward movement.",
      severity: metrics.loopScore,
    });
  }

  insights.push({
    id: "convergence",
    kind: "convergence",
    label: phraseLabel(metrics.phase),
    detail: phraseDetail(metrics.phase),
    severity: metrics.phaseConfidence,
  });

  if (metrics.decisionReadiness > 0.62 && metrics.phase !== "looping") {
    insights.push({
      id: "decision",
      kind: "decision",
      label: "The discussion is gathering enough shape to decide",
      detail: "Signals are consolidating and the room may be ready for commitment.",
      severity: metrics.decisionReadiness,
    });
  }

  return insights;
}

function chooseCopy(
  type: InterventionType,
  interventions: Intervention[],
  participantName?: string,
) {
  const previous = interventions.find((intervention) => intervention.type === type)?.text;
  const options = interventionCopy[type];
  const offset = interventions.filter((intervention) => intervention.type === type).length;
  const text =
    options.find((option) => option !== previous) ??
    options[offset % options.length] ??
    options[0];

  if (participantName && type === "invite") {
    return text.replaceAll("{name}", participantName);
  }

  return text;
}

export function buildIntervention(
  metrics: ConversationMetrics,
  participants: Participant[],
  interventions: Intervention[],
  now: number,
): Intervention | null {
  const latestIntervention = interventions[0] ?? null;
  if (metrics.totalMessages < 5) {
    return null;
  }

  // Cross-type cooldown: 8 seconds between any two interventions
  if (latestIntervention && now - latestIntervention.timestamp < 8000) {
    return null;
  }

  const quietParticipants = [...participants]
    .filter((participant) => metrics.messageCountByParticipant[participant.id] <= 1)
    .sort((left, right) => {
      const silenceGap =
        metrics.silenceByParticipant[right.id] - metrics.silenceByParticipant[left.id];
      if (silenceGap !== 0) {
        return silenceGap;
      }
      return (
        metrics.dominanceScoreByParticipant[left.id] -
        metrics.dominanceScoreByParticipant[right.id]
      );
    });

  const signals: Array<{
    type: InterventionType;
    confidence: number;
    text: string;
    tone: Intervention["tone"];
  }> = [];

  if (metrics.dominantParticipantId) {
    const leadScore = metrics.dominanceScoreByParticipant[metrics.dominantParticipantId];
    signals.push({
      type: quietParticipants.length > 0 ? "invite" : "balance",
      confidence: clamp(
        leadScore * 0.68 +
          (quietParticipants.length > 0 ? 0.14 : 0.04) +
          (1 - metrics.balanceScore) * 0.22,
      ),
      text:
        quietParticipants.length > 0
          ? chooseCopy("invite", interventions, quietParticipants[0].name)
          : chooseCopy("balance", interventions),
      tone: "soft",
    });
  }

  // Standalone silence invite — fires when a participant is absent even without a dominant speaker
  if (quietParticipants.length > 0 && !metrics.dominantParticipantId && metrics.totalMessages >= 7) {
    const silentParticipant = quietParticipants[0];
    const silenceSec = metrics.silenceByParticipant[silentParticipant.id] / 1000;
    const silenceFactor = clamp(silenceSec / 60);
    signals.push({
      type: "invite",
      confidence: clamp(
        0.5 + silenceFactor * 0.32 + (quietParticipants.length / participants.length) * 0.18,
      ),
      text: chooseCopy("invite", interventions, silentParticipant.name),
      tone: "soft",
    });
  }

  if (metrics.loopScore > 0.64 && metrics.phase === "looping") {
    signals.push({
      type: "loop",
      confidence: clamp(metrics.loopScore * 0.78 + metrics.stagnationScore * 0.2),
      text: chooseCopy("loop", interventions),
      tone: "focus",
    });
  }

  if (
    metrics.decisionReadiness > 0.68 &&
    (metrics.phase === "converging" || metrics.phase === "deciding")
  ) {
    signals.push({
      type: "decision",
      confidence: clamp(metrics.decisionReadiness * 0.8 + metrics.phaseConfidence * 0.12),
      text: chooseCopy("decision", interventions),
      tone: "decision",
    });
  }

  // Per-type cooldown: 20 seconds before the same signal type can fire again
  const eligibleSignals = signals.filter((signal) => {
    const lastOfType = interventions.find((i) => i.type === signal.type);
    return !lastOfType || now - lastOfType.timestamp >= 20000;
  });

  const winner = eligibleSignals.sort((left, right) => right.confidence - left.confidence)[0];
  if (!winner || winner.confidence < 0.7) {
    return null;
  }

  return {
    id: `intervention-${now}`,
    type: winner.type,
    text: winner.text,
    tone: winner.tone,
    confidence: winner.confidence,
    timestamp: now,
  };
}
