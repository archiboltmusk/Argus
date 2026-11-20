import { useState } from "react";
import type { ClinicalQuestion, QBankPack } from "@/lib/education/qbank-types";
import { reviewQBankQuestion } from "@/lib/education/qbank-store";

export function QuestionReview({ packs }: { packs: QBankPack[] }) {
  const editable = packs.filter((pack) => pack.id !== "argus-starter-pack");
  const [selection, setSelection] = useState("");
  const selected = editable
    .flatMap((pack) => pack.questions.map((question) => ({ pack, question })))
    .find(({ pack, question }) => JSON.stringify([pack.id, question.id]) === selection);
  return (
    <details className="p-3 border border-edge rounded-xl text-sm">
      <summary>Review sources and correct a question</summary>
      <p className="text-xs text-ink-muted py-2">
        Reviews are recorded on this device. Imported reviewer claims remain unverified until you
        review them here.
      </p>
      <label>
        Question{" "}
        <select
          aria-label="Question to review"
          className="bg-surface p-2 max-w-full"
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
        >
          <option value="">Choose an imported or authored question</option>
          {editable.flatMap((pack) =>
            pack.questions.map((question) => (
              <option
                key={JSON.stringify([pack.id, question.id])}
                value={JSON.stringify([pack.id, question.id])}
              >
                {pack.title}: {question.topic} — {question.vignette.slice(0, 65)}
              </option>
            )),
          )}
        </select>
      </label>
      {selected && (
        <ReviewForm key={selection} packId={selected.pack.id} question={selected.question} />
      )}
    </details>
  );
}
function ReviewForm({ packId, question }: { packId: string; question: ClinicalQuestion }) {
  const [source, setSource] = useState(question.provenance?.source ?? "");
  const [edition, setEdition] = useState(question.provenance?.edition ?? "");
  const [reviewer, setReviewer] = useState("");
  const [rationale, setRationale] = useState(question.explanation.correctRationale);
  const [reason, setReason] = useState("");
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex);
  const [notice, setNotice] = useState("");
  return (
    <form
      className="flex flex-col gap-2 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          reviewQBankQuestion(packId, question.id, {
            source,
            edition,
            reviewer,
            rationale,
            reason,
            correctIndex,
          });
          setNotice("Review saved with correction history.");
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Review could not be saved.");
        }
      }}
    >
      <p>{question.vignette}</p>
      <label>
        Reference / source{" "}
        <input
          required
          className="block w-full bg-surface p-2"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      </label>
      <label>
        Edition / publication date{" "}
        <input
          className="block w-full bg-surface p-2"
          value={edition}
          onChange={(event) => setEdition(event.target.value)}
        />
      </label>
      <label>
        Reviewer{" "}
        <input
          required
          className="block w-full bg-surface p-2"
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
        />
      </label>
      {(!question.answerSpec || question.answerSpec.kind === "single") && (
        <label>
          Correct option{" "}
          <select
            className="block w-full bg-surface p-2"
            value={correctIndex}
            onChange={(event) => setCorrectIndex(Number(event.target.value))}
          >
            {question.options.map((option, index) => (
              <option key={index} value={index}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Explanation{" "}
        <textarea
          required
          className="block w-full bg-surface p-2"
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
        />
      </label>
      <label>
        Reason for review / correction{" "}
        <input
          required
          className="block w-full bg-surface p-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button className="edu-pill-button" type="submit">
        Save local review
      </button>
      <p role="status">{notice}</p>
      {!!question.provenance?.corrections?.length && (
        <details>
          <summary>Correction history ({question.provenance.corrections.length})</summary>
          <ul>
            {question.provenance.corrections.map((entry, index) => (
              <li key={index}>
                {entry.date} · {entry.reviewer}: {entry.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}
