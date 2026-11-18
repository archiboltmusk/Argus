import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ExplanationText({ text }: { text: string }) {
  const markdown = text
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?p\b[^>]*>/gi, "\n\n")
    .replace(/<\/?(?:strong|b)>/gi, "**")
    .replace(/<\/?(?:em|i)>/gi, "*")
    .replace(/&nbsp;/gi, " ")
    .replace(/^\s*@[\w]+\s*$/gm, "").trim();
  return <div className="min-w-0 overflow-x-auto text-sm leading-relaxed text-white/90 [&_table]:my-3 [&_table]:w-full [&_th]:text-start [&_td]:align-top [&_td]:border-t [&_td]:border-white/15 [&_td]:p-2 [&_th]:p-2">
    <Markdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img", "a"]} unwrapDisallowed>{markdown}</Markdown>
  </div>;
}
