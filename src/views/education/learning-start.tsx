import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { extractYouTubeId, extractYouTubeTimestamp } from "@/lib/education/btr-youtube-bridge";

type VideoSession = { videoId: string; start: number; goal: string; recall: string };

function readSession(key: string): VideoSession | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    return saved && /^[\w-]{11}$/.test(saved.videoId) &&
      Number.isFinite(saved.start) && saved.start >= 0 &&
      typeof saved.goal === "string" && typeof saved.recall === "string" ? saved : null;
  } catch {
    return null;
  }
}

const questions = [
  {
    prompt: "You want to remember how to change a bicycle tyre. Which is the better check?",
    choices: ["Rewatch the demonstration", "Describe the steps with the video closed"],
    correct: 1,
    explanation: "Recalling the steps exposes where you get stuck. Reopen the video at that point and check what you missed.",
  },
  {
    prompt: "You just watched someone build a spreadsheet formula. How would you test whether you can use it?",
    choices: ["Write the formula for a different table without looking", "Copy the formula from the video"],
    correct: 0,
    explanation: "A different table tests whether you know when and how to apply the formula. Copying it can hide the parts you still need to learn.",
  },
];

export function LearningStart({ profileId, onOpenLibrary }: {
  profileId?: string | null;
  onOpenLibrary: () => void;
}) {
  const storageKey = `argus.education.video-session.${encodeURIComponent(profileId || "local")}`;
  const [saved, setSaved] = useState(() => readSession(storageKey));
  const [screen, setScreen] = useState<"home" | "sample" | "video">("home");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [link, setLink] = useState("");
  const [goal, setGoal] = useState("");
  const [notice, setNotice] = useState("");
  const question = questions[questionIndex];

  function save(session: VideoSession) {
    setSaved(session);
    try {
      localStorage.setItem(storageKey, JSON.stringify(session));
      setNotice("");
    } catch {
      setNotice("Progress is available while this screen stays open. Device storage is unavailable.");
    }
  }

  function startVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const videoId = extractYouTubeId(link);
    if (!videoId || !goal.trim()) {
      setNotice("Enter a YouTube video link and a learning goal.");
      return;
    }
    const timestamp = extractYouTubeTimestamp(link);
    const start = Number.isFinite(timestamp) ? Math.max(0, timestamp) : 0;
    save({ videoId, start, goal: goal.trim(), recall: "" });
    setScreen("video");
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-2xl border border-edge bg-surface p-6 sm:p-9" aria-label="Learning session">
      {screen !== "home" && (
        <button type="button" onClick={() => setScreen("home")} className="flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={15} /> Back to learning
        </button>
      )}
      {screen === "home" && (
        <>
          <div>
            <h2 className="text-2xl font-semibold text-ink">{saved ? saved.goal : "Learn by trying"}</h2>
            <p className="mt-2 text-sm text-ink-muted">{saved ? "Open your video or pick up your recall notes." : "Try a short lesson about remembering and applying what you watch."}</p>
          </div>
          <button type="button" className="edu-pill-button primary w-fit" onClick={() => setScreen(saved ? "video" : "sample")}>
            {saved ? "Continue learning" : "Start learning"} <ArrowRight size={16} />
          </button>
          <details className="text-sm">
            <summary className="w-fit cursor-pointer font-medium text-ink">Learn from a YouTube video</summary>
            <form onSubmit={startVideo} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">YouTube link
                <input required value={link} onChange={(event) => setLink(event.target.value)} className="rounded-lg border border-edge bg-canvas p-2" placeholder="https://www.youtube.com/watch?v=…" />
              </label>
              <label className="flex flex-col gap-1">What do you want to be able to do?
                <input required maxLength={200} value={goal} onChange={(event) => setGoal(event.target.value)} className="rounded-lg border border-edge bg-canvas p-2" />
              </label>
              <button type="submit" className="edu-pill-button w-fit">Save video and goal</button>
            </form>
          </details>
          <button type="button" onClick={onOpenLibrary} className="w-fit text-sm font-medium text-ink-muted hover:text-ink">Open study library</button>
        </>
      )}
      {screen === "sample" && (complete ? (
        <>
          <h2 className="text-2xl font-semibold">Try it on your next video</h2>
          <p className="text-sm text-ink-muted">Close the video, do a new example from memory, and revisit the part that stopped you.</p>
          <button type="button" className="edu-pill-button w-fit" onClick={() => setScreen("home")}>Done</button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">{question.prompt}</h2>
          <div className="flex flex-col gap-2">
            {question.choices.map((choice, index) => (
              <button type="button" key={choice} disabled={answer !== null} aria-pressed={answer === index} className="rounded-xl border border-edge px-4 py-3 text-start aria-pressed:border-accent" onClick={() => setAnswer(index)}>{choice}</button>
            ))}
          </div>
          {answer !== null && (
            <>
              <p role="status" className="text-sm">{answer === question.correct ? "Correct. " : "Try the active option. "}{question.explanation}</p>
              <button type="button" className="edu-pill-button primary w-fit" onClick={() => {
                if (questionIndex + 1 === questions.length) setComplete(true);
                else { setQuestionIndex(questionIndex + 1); setAnswer(null); }
              }}>{questionIndex + 1 === questions.length ? "Finish" : "Try another example"}</button>
            </>
          )}
        </>
      ))}
      {screen === "video" && saved && (
        <>
          <h2 className="text-2xl font-semibold">{saved.goal}</h2>
          <a href={`https://www.youtube.com/watch?v=${saved.videoId}&t=${Math.floor(saved.start)}s`} target="_blank" rel="noopener noreferrer" className="edu-pill-button primary w-fit">Watch on YouTube</a>
          <label className="flex flex-col gap-2 text-sm">
            After watching, try your goal from memory. What worked? Where did you get stuck?
            <textarea rows={4} maxLength={4000} value={saved.recall} onChange={(event) => save({ ...saved, recall: event.target.value })} className="rounded-lg border border-edge bg-canvas p-3" />
          </label>
        </>
      )}
      {notice && <p role="status" className="text-sm text-ink-muted">{notice}</p>}
    </section>
  );
}
