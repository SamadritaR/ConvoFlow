"use client";

import { Participant } from "@/lib/types";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SpeakerSelector({
  participants,
  selectedId,
  onSelect,
}: {
  participants: Participant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-mist/70">Speaking as</div>
      <div className="flex flex-wrap gap-1.5">
        {participants.map((participant) => (
          <button
            key={participant.id}
            type="button"
            onClick={() => onSelect(participant.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition",
              selectedId === participant.id
                ? "border-teal/40 bg-teal/[0.08] text-white ring-1 ring-teal/30"
                : "border-white/8 bg-white/[0.02] text-white/48 hover:border-white/14 hover:text-white/78",
            )}
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: participant.color, filter: "saturate(0.6)" }}
            />
            {participant.name}
          </button>
        ))}
      </div>
      {!selectedId && (
        <p className="mt-2 text-[11px] text-white/28">No one selected — tap a name above</p>
      )}
    </div>
  );
}
