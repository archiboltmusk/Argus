import assert from "node:assert/strict";
import test from "node:test";
import { matchGameChannels, norm } from "../src/lib/sports/match-channels.ts";

const ch = (id: string, name: string, group: string | null = null) => ({
  id,
  tvgId: null,
  name,
  logo: null,
  group,
  url: `http://x/${id}`,
  catchupSource: null,
  durationSec: null,
  attrs: {},
});

const game = {
  home: { name: "Real Madrid", abbr: "RMA" },
  away: { name: "Barcelona", abbr: "BAR" },
  league: "ESP",
};

test("norm strips accents and punctuation", () => {
  assert.equal(norm("Atlético  Madrid!"), "atletico madrid");
});

test("event channel with both teams ranks first", () => {
  const r = matchGameChannels(game, [
    ch("1", "Sports 1 HD", "Sports"),
    ch("2", "Barcelona TV"),
    ch("3", "Real Madrid vs Barcelona", "Football"),
  ]);
  assert.deepEqual(
    r.map((m) => m.channel.id),
    ["3", "2"],
  );
});

test("unrelated channels are dropped", () => {
  assert.equal(matchGameChannels(game, [ch("1", "News 24"), ch("2", "Cartoon Club")]).length, 0);
});

test("short substrings do not match inside other words", () => {
  const r = matchGameChannels({ ...game, home: { name: "Ace", abbr: "ACE" } }, [
    ch("1", "Palace Movies"),
  ]);
  assert.equal(r.length, 0);
});
