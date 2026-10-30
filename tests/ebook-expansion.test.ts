import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  INDIC_LITERARY_VAULT,
  STANDARD_EBOOKS_OPDS,
  OPEN_LIBRARY_API,
  NDLI_PORTAL,
} from "../src/lib/ebook/expansion/shadow-libraries.ts";
import {
  addStandardEbooks,
  hasStandardEbooks,
  addIndicLibrary,
  hasIndicLibrary,
  addAnnasArchive,
  hasAnnasArchive,
  listEBookSources,
} from "../src/lib/ebook/sources.ts";

test("INDIC_LITERARY_VAULT contains curated Bengali & Indian literature masterworks", () => {
  assert.ok(INDIC_LITERARY_VAULT.length >= 7, "Vault must contain curated classics");

  const titles = INDIC_LITERARY_VAULT.map((b) => b.title);
  assert.ok(titles.some((t) => t.includes("Gitanjali")), "Must include Tagore's Gitanjali");
  assert.ok(titles.some((t) => t.includes("Gora")), "Must include Tagore's Gora");
  assert.ok(titles.some((t) => t.includes("Anandamath")), "Must include Bankim's Anandamath");
  assert.ok(titles.some((t) => t.includes("Devdas")), "Must include Sarat Chandra's Devdas");
  assert.ok(titles.some((t) => t.includes("Pather Panchali")), "Must include Bibhutibhushan's Pather Panchali");
  assert.ok(titles.some((t) => t.includes("Feluda")), "Must include Satyajit Ray's Complete Feluda Adventures");
  assert.ok(titles.some((t) => t.includes("Abol Tabol")), "Must include Sukumar Ray's Abol Tabol");

  for (const book of INDIC_LITERARY_VAULT) {
    assert.ok(book.downloadUrl?.startsWith("http"), `${book.id} must have a valid download URL`);
    assert.ok(book.coverUrl?.startsWith("http"), `${book.id} must have a valid cover image URL`);
  }
});

test("Canonical endpoints and OPDS addresses are properly defined", () => {
  assert.equal(STANDARD_EBOOKS_OPDS, "https://standardebooks.org/opds/all");
  assert.equal(OPEN_LIBRARY_API, "https://openlibrary.org");
  assert.equal(NDLI_PORTAL, "https://ndl.iitkgp.ac.in");
});

test("EBook sources helper functions toggle and persist OPDS catalogs", () => {
  const addedStandard = addStandardEbooks();
  assert.equal(addedStandard, true, "Standard Ebooks should be added successfully");
  assert.equal(hasStandardEbooks(), true, "hasStandardEbooks should report true");

  const addedIndic = addIndicLibrary();
  assert.equal(addedIndic, true, "Indic Library should be added successfully");
  assert.equal(hasIndicLibrary(), true, "hasIndicLibrary should report true");

  const addedAnna = addAnnasArchive();
  assert.equal(addedAnna, true, "Anna's Archive should be added successfully");
  assert.equal(hasAnnasArchive(), true, "hasAnnasArchive should report true");

  const sources = listEBookSources();
  assert.ok(sources.some((s) => s.name.includes("Standard Ebooks")));
  assert.ok(sources.some((s) => s.name.includes("Indic")));
  assert.ok(sources.some((s) => s.name.includes("Anna")));
});
