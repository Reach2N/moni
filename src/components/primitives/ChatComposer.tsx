"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/* ─────────────────────────────────────────────────────────
 * CHAT — interactive panel with tabs, replies, and composer.
 * The reply sequence begins only after the user sends.
 * ───────────────────────────────────────────────────────── */

type Phase = "idle" | "sent" | "reply1" | "reply2" | "done";

/* one scripted agent reply in the thread */
export type ChatMessage = {
  label: string;
  sub: string;
  time: string;
  body: string;
};

const MESSAGES: ChatMessage[] = [
  {
    label: "Sales History",
    sub: "Flavor Data",
    time: "4s",
    body: "Pulled 3 summers of mint chip sales for comparison.",
  },
  {
    label: "Comparison",
    sub: "Trend Detection",
    time: "2s",
    body: "Mint chip is up 12% with stronger weekend peaks.",
  },
];

const SUGGESTIONS = ["Flavors", "Suppliers"];

export type ChatComposerLabels = {
  /** the pre-filled prompt shown in the first user bubble */
  initialPrompt: string;
  /** accessible label for the compact scripted-example action */
  runAction: string;
};

const DEFAULT_LABELS: ChatComposerLabels = {
  initialPrompt: "Compare mint chip to last summer",
  runAction: "Run the example",
};

function Section({
  label,
  sub,
  time,
  body,
  resolving,
}: {
  label: string;
  sub: string;
  time: string;
  body: string;
  resolving?: boolean;
}) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 transition-[opacity,filter,transform] duration-400"
      style={{
        opacity: resolving ? 0.55 : 1,
        filter: resolving ? "blur(0.5px)" : "blur(0)",
        transform: resolving ? "scale(0.985)" : "scale(1)",
        transformOrigin: "top left",
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] leading-[1.5]">
        <span className="font-medium text-ink">{label}</span>
        {sub ? <span className="text-ink-2">{sub}</span> : null}
        {time ? <span className="text-ink-3">{time}</span> : null}
      </div>
      <p className="text-[13px] leading-normal text-ink">{body}</p>
    </div>
  );
}

export default function ChatComposer({
  messages = MESSAGES,
  suggestions = SUGGESTIONS,
  labels,
  onSend,
  className,
}: {
  variant?: string;
  /** scripted agent replies revealed in sequence after the user sends */
  messages?: ChatMessage[];
  /** header chips (tabs) for switching context */
  suggestions?: string[];
  /** prominent copy strings */
  labels?: Partial<ChatComposerLabels>;
  /** fired with the trimmed prompt text when the user sends */
  onSend?: (text: string) => void;
  /** layout-only hook; the interaction remains owned by this source component */
  className?: string;
} = {}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [phase, setPhase] = useState<Phase>("idle");
  const [submitted, setSubmitted] = useState(l.initialPrompt);
  const [tab, setTab] = useState(suggestions[0] ?? "");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "sent") t = setTimeout(() => setPhase("reply1"), 500);
    else if (phase === "reply1") t = setTimeout(() => setPhase("reply2"), 1400);
    else if (phase === "reply2") t = setTimeout(() => setPhase("done"), 1200);
    else return;
    return () => clearTimeout(t);
  }, [phase]);

  const runExample = () => {
    setSubmitted(l.initialPrompt);
    onSend?.(l.initialPrompt);
    setPhase("sent");
  };

  return (
    <div className={`flex min-h-[360px] w-full max-w-95 flex-col self-start overflow-hidden rounded-[14px] bg-surface shadow-card sm:min-h-[320px]${className ? ` ${className}` : ""}`}>
      {/* header — tabs + actions */}
      <div className="flex shrink-0 items-center justify-between border-b border-line p-1.5">
        <div className="flex items-center">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-[6px] px-2 py-[3px] text-[13px] text-ink transition-[background-color,opacity] duration-100 ${tab === item ? "bg-field" : "opacity-50 hover:opacity-75"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {[
            <path key="p" d="M12 5v14M5 12h14" />,
            <g key="h"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
            <g key="e" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></g>,
          ].map((icon, i) => (
            <button
              key={i}
              type="button"
              aria-label="Action"
              className="flex size-6 items-center justify-center rounded-[6px] text-ink-3
                transition-colors duration-100 hover:bg-hover hover:text-ink-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* conversation — fixed region so the card never changes shape */}
      <div className="flex min-h-[15rem] flex-1 flex-col gap-2.5 px-3 pt-2.5 pb-2 sm:min-h-[13rem]">
        {/* user bubble — right aligned, soft block */}
        <div className="flex justify-end pl-8 sm:pl-14">
          <div
            className="rounded-xl bg-field px-3 py-1.5 text-[13px] leading-[1.4] text-ink
              transition-[opacity,transform] duration-300"
            style={{
              opacity: 1,
              transform: "translateY(0)",
              transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            {submitted}
          </div>
        </div>

        {messages[0] && (phase === "reply1" || phase === "reply2" || phase === "done") ? (
          <Section
            label={messages[0].label}
            sub={messages[0].sub}
            time={messages[0].time}
            body={messages[0].body}
          />
        ) : null}
        {messages[1] && (phase === "reply2" || phase === "done") ? (
          <Section
            label={messages[1].label}
            sub={messages[1].sub}
            time={messages[1].time}
            body={messages[1].body}
            resolving={phase === "reply2"}
          />
        ) : null}
      </div>

      {/* The customer turn is already prepared. One compact action runs it. */}
      <div className="mt-auto flex shrink-0 justify-center border-t border-line p-2">
        <button
          type="button"
          aria-label={l.runAction}
          onClick={runExample}
          className="flex size-9 items-center justify-center rounded-full bg-ink text-surface transition-[transform,opacity] duration-200 hover:opacity-85 active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
