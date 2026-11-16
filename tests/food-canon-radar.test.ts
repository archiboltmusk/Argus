import assert from "node:assert/strict";
import test from "node:test";
import {
  FoodCanonRadarEngine,
  CURATED_KOLKATA_FOOD_CANON,
} from "../src/lib/community/food-canon-radar";

test("FoodCanonRadar: loads curated signature dishes across need states", () => {
  const engine = new FoodCanonRadarEngine();
  const dishes = engine.getAllDishes();

  assert.ok(dishes.length >= 4, "Expected at least 4 signature benchmark dishes");

  const kosha = dishes.find((d) => d.id === "golbari-kosha-mangsho");
  assert.ok(kosha, "Golbari Kosha Mangsho should be in the canon");
  assert.equal(kosha?.needState, "solace_reset");
  assert.equal(kosha?.city, "Kolkata");

  const biryani = dishes.find((d) => d.id === "arsalan-mutton-biryani");
  assert.ok(biryani);
  assert.equal(biryani?.needState, "tribal_communion");
});

test("FoodCanonRadar: resolves sovereign plate returning exactly one dish for need state", () => {
  const engine = new FoodCanonRadarEngine();

  const solacePlate = engine.resolveSovereignPlate({
    needState: "solace_reset",
    mealTime: "dinner",
  });

  assert.ok(solacePlate, "Expected a solace plate");
  assert.equal(solacePlate?.needState, "solace_reset");
  assert.ok(solacePlate?.whyThisNow.length > 10, "Expected an epistemic reason");

  const awakeningPlate = engine.resolveSovereignPlate({
    needState: "sensory_awakening",
    mealTime: "evening_snack",
  });

  assert.ok(awakeningPlate);
  assert.equal(awakeningPlate?.needState, "sensory_awakening");
});

test("FoodCanonRadar: records local meal feedback without cloud telemetry", () => {
  const engine = new FoodCanonRadarEngine();

  engine.logMealFeedback({
    dishId: "golbari-kosha-mangsho",
    eatenAtEpochMs: Date.now(),
    rating: "transcendent_canon",
    personalNote: "Second kadai batch was velvety and peppery.",
  });

  const history = engine.getMealHistory();
  assert.ok(history.length >= 1);
  const record = history.find((h) => h.dishId === "golbari-kosha-mangsho");
  assert.equal(record?.rating, "transcendent_canon");
});
