import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { QBankRunner } from "../src/views/education/qbank-drill.tsx";
import { DailyWateringDeck } from "../src/views/education/daily-watering-deck.tsx";
import { CLINICAL_QBANK_STARTER } from "../src/lib/education/qbank-data.ts";
import { saveStudyNote } from "../src/lib/education/notes.ts";

test("study UI survives remount, grades multiple answers and shows quota failures", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://argus.invalid/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: dom.window.localStorage,
  });
  const { createRoot } = await import("react-dom/client");
  let root = createRoot(document.getElementById("root")!);
  const questions = [
    {
      ...CLINICAL_QBANK_STARTER[0],
      id: "ui-multiple",
      answerSpec: { kind: "multiple" as const, correctIndices: [0, 2] },
    },
  ];
  const render = () => root.render(createElement(QBankRunner, { questions, onClose() {} }));
  const button = (label: string) =>
    [...document.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(label),
    )!;
  const option = (index: number) =>
    document.querySelectorAll<HTMLElement>('[role="button"][aria-pressed]')[index];
  try {
    await act(render);
    await act(() => option(0).click());
    await act(() => option(2).click());
    assert.equal(option(0).getAttribute("aria-pressed"), "true");
    await act(() => root.unmount());
    root = createRoot(document.getElementById("root")!);
    await act(render);
    assert.equal(option(0).getAttribute("aria-pressed"), "true");
    assert.equal(option(2).getAttribute("aria-pressed"), "true");
    await act(() => button("Confirm Answer").click());
    assert.match(document.body.textContent!, /Correct answer:/);
    await act(() => button("Submit Module").click());
    assert.match(document.body.textContent!, /Start a new attempt/);
    const resultText = document.body.textContent;
    await act(() => root.unmount());
    root = createRoot(document.getElementById("root")!);
    await act(render);
    assert.equal(document.body.textContent, resultText);
    await act(() => button("Start a new attempt").click());
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });
    await act(() => option(1).click());
    assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /not saved/);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).localStorage;
  }
});

test("reactive FSRS deck does not skip a card when the first review removes it from due notes", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://argus.invalid/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: dom.window.localStorage,
  });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.getElementById("root")!);
  const first = saveStudyNote({
    itemId: "deck1",
    itemTitle: "First recall",
    timestampSec: 0,
    timestampLabel: "0",
    markdown: "First",
  });
  const second = saveStudyNote({
    itemId: "deck2",
    itemTitle: "Second recall",
    timestampSec: 0,
    timestampLabel: "0",
    markdown: "Second",
  });
  try {
    await act(() =>
      root.render(createElement(DailyWateringDeck, { notes: [first, second], onClose() {} })),
    );
    const click = async (label: string) => {
      const button = [...document.querySelectorAll("button")].find((element) =>
        element.textContent?.includes(label),
      );
      assert.ok(button, label);
      await act(() => button.click());
    };
    await click("Show Answer");
    await click("Good");
    await act(() =>
      root.render(createElement(DailyWateringDeck, { notes: [second], onClose() {} })),
    );
    assert.match(document.body.textContent!, /Second recall/);
    assert.doesNotMatch(document.body.textContent!, /Tree Watered/);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
  }
});

test("expired custom deadline finishes after reopening without resetting the timer", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://argus.invalid/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: dom.window.localStorage,
  });
  const { attemptKey, newAttempt, saveAttempt } = await import("../src/lib/education/attempts.ts");
  const questions = [{ ...CLINICAL_QBANK_STARTER[0], id: "expired" }];
  const state = { ...newAttempt(Date.now() - 120000), deadlineAt: Date.now() - 60000 };
  state.selectedAnswers.expired = questions[0].correctIndex;
  saveAttempt(attemptKey(questions, true, 1), questions, state);
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.getElementById("root")!);
  let finishes = 0;
  try {
    await act(() =>
      root.render(
        createElement(QBankRunner, {
          questions,
          examMode: true,
          durationMinutes: 1,
          onClose() {},
          onFinish(result) {
            finishes++;
            assert.equal(result.correct, 1);
          },
        }),
      ),
    );
    assert.match(document.body.textContent!, /Start a new attempt/);
    assert.equal(finishes, 1);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
  }
});
