import { isReactionOnly } from "@/lib/together/chat-extras";
import type { ChatMessage } from "@/lib/together/provider";
import { useEffect, useState } from "react";

interface FloatingReaction {
  id: string;
  emoji: string;
  xPercent: number; // horizontal placement 0..100
}

export function FloatingReactions({ messages }: { messages: ChatMessage[] }) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (!messages.length) return;
    const latest = messages[messages.length - 1];
    if (!latest) return;

    // Check if the message is an emoji reaction
    const trimmed = latest.text.trim();
    if (isReactionOnly(trimmed) || /^(👍|😂|😮|😢|❤️|🔥|🎉|🍿|😱)$/u.test(trimmed)) {
      const id = `${latest.from}-${latest.at}-${Math.random()}`;
      // Random horizontal position clustered in bottom-right (between 68% and 92%)
      const xPercent = 70 + Math.random() * 22;
      setReactions((prev) => [...prev.slice(-15), { id, emoji: trimmed, xPercent }]);

      // Automatically prune after 2.8s animation completes
      const timer = window.setTimeout(() => {
        setReactions((curr) => curr.filter((r) => r.id !== id));
      }, 2800);
      return () => window.clearTimeout(timer);
    }
  }, [messages]);

  if (!reactions.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {reactions.map((r) => (
        <span
          key={r.id}
          style={{ left: `${r.xPercent}%` }}
          className="absolute bottom-28 animate-[floatUpFade_2.6s_ease-out_forwards] text-4xl select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
