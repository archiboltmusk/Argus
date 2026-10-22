import assert from "node:assert/strict";
import test from "node:test";
import { cleanWord, parseDictionaryApi, parseWiktionary } from "../src/lib/dictionary";

test("cleans punctuation, quotes and possessives", () => {
  assert.equal(cleanWord("“Hello,”"), "hello");
  assert.equal(cleanWord("¿Dónde?"), "dónde");
  assert.equal(cleanWord("dog's"), "dog");
  assert.equal(cleanWord("..."), "");
});

test("reads a dictionaryapi.dev entry", () => {
  const entry = parseDictionaryApi("run", [
    {
      phonetic: "/ɹʌn/",
      meanings: [
        { partOfSpeech: "verb", definitions: [{ definition: "To move quickly." }] },
        { partOfSpeech: "noun", definitions: [{ definition: "An act of running." }] },
      ],
    },
  ]);
  assert.equal(entry?.phonetic, "/ɹʌn/");
  assert.equal(entry?.meanings.length, 2);
  assert.equal(parseDictionaryApi("x", { title: "No Definitions Found" }), null);
});

test("reads a Wiktionary entry for the chosen language and strips markup", () => {
  const entry = parseWiktionary("casa", "es", {
    es: [{ partOfSpeech: "Noun", definitions: [{ definition: '<a href="/wiki/house">house</a> &amp; home' }] }],
    pt: [{ partOfSpeech: "Noun", definitions: [{ definition: "other" }] }],
  });
  assert.deepEqual(entry?.meanings, [{ partOfSpeech: "Noun", definition: "house & home" }]);
  assert.equal(parseWiktionary("casa", "fr", { es: [] }), null);
});
