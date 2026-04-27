import {
  ConversationMetrics,
  Insight,
  Intervention,
  Message,
  Participant,
} from "@/lib/types";

export function buildMetrics(
  messages: Message[],
  participants: Participant[],
  now: number,
): ConversationMetrics {
  const totalMessages = messages.length;
  const messageCountByParticipant = Object.fromEntries(
    participants.map((participant) => [participant.id, 0]),
  );

  for (const message of messages) {
    messageCountByParticipant[message.participantId] += 1;
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

  let dominantParticipantId: string | null = null;
  let dominantShare = 0;
  for (const participant of participants) {
    const share = shareByParticipant[participant.id];
    if (share > dominantShare) {
      dominantShare = share;
      dominantParticipantId = participant.id;
    }
  }

  const counts = participants.map(
    (participant) => messageCountByParticipant[participant.id],
  );
  const average = totalMessages / participants.length || 0;
  const variance =
    counts.reduce((sum, count) => sum + (count - average) ** 2, 0) /
    participants.length;
  const normalizedVariance = average ? Math.min(variance / (average ** 2 + 1), 1) : 0;
  const balanceScore = Math.max(0, 1 - normalizedVariance);

  const topicCounts = new Map<string, number>();
  for (const message of messages) {
    topicCounts.set(message.topic, (topicCounts.get(message.topic) ?? 0) + 1);
  }
  const recentTopicWindow = messages.slice(-5).map((message) => message.topic);
  const repeatedTopics = [...topicCounts.entries()]
    .filter(([topic, count]) => {
      const recentHits = recentTopicWindow.filter((item) => item === topic).length;
      return count >= 4 && recentHits >= 3;
    })
    .map(([topic]) => topic);

  const recentTopics = messages.slice(-4).map((message) => message.topic);
  const uniqueRecentTopics = new Set(recentTopics).size;
  const convergenceScore =
    recentTopics.length < 3
      ? 0.5
      : Math.max(0, Math.min(1, 1 - (uniqueRecentTopics - 1) / 4 + repeatedTopics.length * 0.05));

  return {
    shareByParticipant,
    messageCountByParticipant,
    totalMessages,
    silenceByParticipant,
    dominantParticipantId:
      dominantShare >= 0.45 && totalMessages >= 4 ? dominantParticipantId : null,
    balanceScore,
    repeatedTopics,
    convergenceScore,
  };
}

export function buildInsights(
  metrics: ConversationMetrics,
  participants: Participant[],
): Insight[] {
  const insights: Insight[] = [];
  const nowSilent = participants
    .filter((participant) => metrics.silenceByParticipant[participant.id] > 90000)
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
        label: `${participant.name} is shaping most of the space`,
        detail: "The conversation is leaning toward one voice.",
        severity: 0.87,
      });
    }
  }

  if (nowSilent.length > 0 && metrics.totalMessages >= 4) {
    insights.push({
      id: "silence",
      kind: "silence",
      label: `${nowSilent[0].name} has not entered recently`,
      detail: "A missing perspective is becoming structurally visible.",
      severity: 0.72,
    });
  }

  if (metrics.repeatedTopics.length > 0) {
    insights.push({
      id: "loop",
      kind: "loop",
      label: "The room is revisiting the same point",
      detail: "Repeated topics suggest a loop instead of forward motion.",
      severity: 0.8,
    });
  }

  insights.push({
    id: "convergence",
    kind: "convergence",
    label:
      metrics.convergenceScore > 0.66
        ? "Signals are settling toward alignment"
        : "The discussion is still spreading outward",
    detail:
      metrics.convergenceScore > 0.66
        ? "Ideas are beginning to compress into fewer directions."
        : "Multiple directions remain open at once.",
    severity: Math.abs(metrics.convergenceScore - 0.5),
  });

  if (metrics.totalMessages >= 6 && metrics.convergenceScore < 0.58) {
    insights.push({
      id: "decision",
      kind: "decision",
      label: "The group may need a decision frame",
      detail: "Momentum is present, but not yet resolving.",
      severity: 0.7,
    });
  }

  return insights;
}

export function buildIntervention(
  metrics: ConversationMetrics,
  participants: Participant[],
  lastIntervention: Intervention | null,
  now: number,
): Intervention | null {
  if (lastIntervention && now - lastIntervention.timestamp < 8000) {
    return null;
  }

  if (metrics.dominantParticipantId) {
    const silentParticipant = [...participants]
      .filter((participant) => participant.id !== metrics.dominantParticipantId)
      .sort((left, right) => {
        const countDifference =
          metrics.messageCountByParticipant[left.id] -
          metrics.messageCountByParticipant[right.id];
        if (countDifference !== 0) {
          return countDifference;
        }
        return metrics.silenceByParticipant[right.id] - metrics.silenceByParticipant[left.id];
      })[0];
    if (silentParticipant) {
      return {
        id: `intervention-${now}`,
        text: `Let’s hear from ${silentParticipant.name} before we narrow this.`,
        tone: "soft",
        timestamp: now,
      };
    }
    return {
      id: `intervention-${now}`,
      text: "Let’s hear from others before this hardens.",
      tone: "soft",
      timestamp: now,
    };
  }

  if (metrics.repeatedTopics.length > 0) {
    return {
      id: `intervention-${now}`,
      text: "This topic is repeating. We may need a sharper choice.",
      tone: "focus",
      timestamp: now,
    };
  }

  if (metrics.totalMessages >= 6 && metrics.convergenceScore < 0.58) {
    return {
      id: `intervention-${now}`,
      text: "We may need to decide here.",
      tone: "decision",
      timestamp: now,
    };
  }

  const silentParticipant = participants.find(
    (participant) => metrics.silenceByParticipant[participant.id] > 90000,
  );
  if (silentParticipant && metrics.totalMessages >= 4) {
    return {
      id: `intervention-${now}`,
      text: `We have not heard from ${silentParticipant.name} yet.`,
      tone: "soft",
      timestamp: now,
    };
  }

  return null;
}
