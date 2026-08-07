"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="ml-2 inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white text-sm font-bold text-[var(--muted-foreground)]"
            aria-label="What does this mean?"
          >
            ?
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-sm rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--foreground)] shadow-lg"
            sideOffset={6}
          >
            <p className="font-semibold">What does this mean?</p>
            <p className="mt-1 leading-relaxed">{text}</p>
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
