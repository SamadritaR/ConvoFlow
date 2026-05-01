"use client";

export function ModeratorMessage({ text }: { text: string }) {
  return (
    <div className="mx-auto my-1 w-full max-w-[84%]">
      <div
        className="rounded-[12px] border border-teal/30 px-4 py-3 text-center"
        style={{ background: "rgba(94, 234, 212, 0.05)" }}
      >
        <div className="text-eyebrow uppercase tracking-[0.18em] text-teal/60">Moderator</div>
        <div className="mt-1.5 text-body leading-[1.5] text-white/82">{text}</div>
      </div>
    </div>
  );
}
