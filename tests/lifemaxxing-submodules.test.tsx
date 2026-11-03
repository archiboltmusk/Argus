import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOMServer from "react-dom/server";

import { AccountabilityModule } from "@/views/lifemaxxing/accountability-module";
import { TrustModule } from "@/views/lifemaxxing/trust-module";
import { ArgusNowModule } from "@/views/lifemaxxing/now-module";
import { LifeEvolutionModule } from "@/views/lifemaxxing/evolution-module";
import { UniversalSolverModule } from "@/views/lifemaxxing/solver-module";
import { HealthIntelligenceModule } from "@/views/lifemaxxing/health-module";
import { EquityOpportunityModule } from "@/views/lifemaxxing/equity-module";
import { KnowledgeMeshModule } from "@/views/lifemaxxing/mesh-module";
import { CapabilityDiscoveryModule } from "@/views/lifemaxxing/capability-module";
import { EconomicsAffordabilityModule } from "@/views/lifemaxxing/economics-module";
import { DoctrineConstitutionModule } from "@/views/lifemaxxing/doctrine-module";
import { FlourishingBreakthroughModule } from "@/views/lifemaxxing/flourishing-module";

test("AccountabilityModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<AccountabilityModule />);
  assert.ok(html.includes("Everyone Answers to Their Own Commitments"));
});

test("TrustModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<TrustModule />);
  assert.ok(html.includes("Building a Society Where Corruption Becomes Difficult"));
});

test("ArgusNowModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<ArgusNowModule />);
  assert.ok(html.includes("How are you, really?"));
});

test("LifeEvolutionModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<LifeEvolutionModule />);
  assert.ok(html.includes("Live Deliberately, Not Mechanically"));
});

test("UniversalSolverModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<UniversalSolverModule />);
  assert.ok(html.includes("Universal Problem-Solving Architecture"));
});

test("HealthIntelligenceModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<HealthIntelligenceModule />);
  assert.ok(html.includes("Your Health. In Context."));
});

test("EquityOpportunityModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<EquityOpportunityModule />);
  assert.ok(html.includes("Discover Talent. Remove Barriers. Unlock Opportunity."));
});

test("KnowledgeMeshModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<KnowledgeMeshModule />);
  assert.ok(html.includes("Knowledge Mesh"));
});

test("CapabilityDiscoveryModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<CapabilityDiscoveryModule />);
  assert.ok(html.includes("From Lost Potential to Demonstrated Capability"));
});

test("EconomicsAffordabilityModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<EconomicsAffordabilityModule />);
  assert.ok(html.includes("5-Tier Compute Pyramid"));
});

test("DoctrineConstitutionModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<DoctrineConstitutionModule />);
  assert.ok(html.includes("The ARGUS Constitution"));
});

test("FlourishingBreakthroughModule renders without crashing", () => {
  const html = ReactDOMServer.renderToString(<FlourishingBreakthroughModule />);
  assert.ok(html.includes("Unlock the Extraordinary in Everyone"));
});
