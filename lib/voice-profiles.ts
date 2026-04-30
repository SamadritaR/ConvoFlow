export type VoiceProfile = { rate: number; pitch: number };

// Rate and pitch tuning per participant — makes voices sound distinct even when
// the browser only has one or two available English voices.
export const participantVoiceProfiles: Record<string, VoiceProfile> = {
  maya: { rate: 1.08, pitch: 1.12 }, // Product — fast, assertive, higher
  jon:  { rate: 0.88, pitch: 0.86 }, // Engineering — deliberate, lower
  sora: { rate: 0.96, pitch: 1.06 }, // Research — measured, slightly higher
  lena: { rate: 1.02, pitch: 1.0  }, // Design — natural, balanced
};

// Moderator reads more slowly and calmly than any participant.
export const moderatorVoiceProfile: VoiceProfile = { rate: 0.82, pitch: 0.96 };

// Ordered name fragments to match against the filtered voice list.
// First match wins; these are tuned for Chrome/macOS + Chrome/Windows + Safari.
export const participantVoicePreferences: Record<string, string[]> = {
  maya: ["Google UK English Female", "Samantha", "Microsoft Aria",  "Karen"   ],
  jon:  ["Google UK English Male",   "Daniel",   "Microsoft David", "Fred"    ],
  sora: ["Karen",   "Victoria", "Microsoft Zira", "Google US English"          ],
  lena: ["Moira",   "Tessa",    "Microsoft Jenny", "Google US English"         ],
};

export const moderatorVoicePreferences: string[] = [
  "Alex", "Google UK English Male", "Microsoft Mark", "Daniel",
];

export function getVoiceForParticipant(
  participantId: string,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const prefs = participantVoicePreferences[participantId] ?? [];
  for (const fragment of prefs) {
    const match = voices.find((v) => v.name.includes(fragment));
    if (match) return match;
  }
  // Deterministic fallback so the same participant always gets the same voice
  const order = ["maya", "jon", "sora", "lena"];
  const idx = order.indexOf(participantId);
  return voices[(idx >= 0 ? idx : 0) % voices.length];
}

export function getModeratorVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  for (const fragment of moderatorVoicePreferences) {
    const match = voices.find((v) => v.name.includes(fragment));
    if (match) return match;
  }
  // Fallback: last in the sorted list so it differs from participant voices
  return voices[voices.length - 1];
}
