"use client";

import { motion } from "framer-motion";
import { MicState } from "@/lib/types";

const stateLabel: Record<MicState, string> = {
  idle: "Mic off",
  listening: "Listening…",
  muted: "Muted",
  unsupported: "Not supported",
};

export function MicStatus({
  micState,
  audioLevel,
}: {
  micState: MicState;
  audioLevel: number;
}) {
  const isListening = micState === "listening";
  const isUnsupported = micState === "unsupported";

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center">
        {isListening && (
          <motion.div
            animate={{
              scale: 1 + audioLevel * 2.4,
              opacity: 0.12 + audioLevel * 0.52,
            }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "#63e6d8" }}
            transition={{ duration: 0.08, ease: "linear" }}
          />
        )}
        <motion.div
          animate={{
            scale: isListening ? 1 + audioLevel * 0.28 : 1,
            opacity: isUnsupported ? 0.24 : 1,
          }}
          className="h-3 w-3 rounded-full"
          style={{
            backgroundColor: isListening
              ? "#63e6d8"
              : isUnsupported
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.42)",
          }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      <span
        className={
          isUnsupported
            ? "text-[13px] text-white/28"
            : isListening
              ? "text-[13px] text-white/88"
              : "text-[13px] text-white/52"
        }
      >
        {stateLabel[micState]}
      </span>
    </div>
  );
}
