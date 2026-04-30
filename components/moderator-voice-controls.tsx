"use client";

import { motion } from "framer-motion";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ModeratorVoiceControls({
  voices,
  selectedVoice,
  setSelectedVoice,
  volume,
  setVolume,
  rate,
  setRate,
  isEnabled,
  setIsEnabled,
}: {
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  volume: number;
  setVolume: (v: number) => void;
  rate: number;
  setRate: (r: number) => void;
  isEnabled: boolean;
  setIsEnabled: (v: boolean) => void;
}) {
  const visibleVoices = voices;

  return (
    <div className="rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-mist/70">Moderator voice</div>

        <button
          type="button"
          aria-label={isEnabled ? "Disable moderator voice" : "Enable moderator voice"}
          onClick={() => setIsEnabled(!isEnabled)}
          className={cn(
            "relative h-5 w-9 flex-shrink-0 rounded-full border transition",
            isEnabled ? "border-teal/40 bg-teal/20" : "border-white/10 bg-white/[0.04]",
          )}
        >
          <motion.span
            animate={{ x: isEnabled ? 16 : 2 }}
            className="absolute top-0.5 block h-4 w-4 rounded-full bg-white shadow-sm"
            transition={{ duration: 0.18, ease }}
          />
        </button>
      </div>

      <motion.div
        animate={{ opacity: isEnabled ? 1 : 0.28 }}
        transition={{ duration: 0.18 }}
        className="mt-3 space-y-3"
      >
        {visibleVoices.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] text-white/36">Voice</div>
            <select
              disabled={!isEnabled}
              value={selectedVoice?.name ?? ""}
              onChange={(e) => {
                const found = visibleVoices.find((v) => v.name === e.target.value);
                if (found) setSelectedVoice(found);
              }}
              className="w-full rounded-[10px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-2 py-1.5 text-[12px] text-white/72 outline-none disabled:cursor-not-allowed"
            >
              {visibleVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-white/36">Volume</span>
            <span className="text-[11px] text-white/36">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            disabled={!isEnabled}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-teal disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-white/36">Speed</span>
            <span className="text-[11px] text-white/36">{rate.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={rate}
            disabled={!isEnabled}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-teal disabled:cursor-not-allowed"
          />
        </div>
      </motion.div>
    </div>
  );
}
