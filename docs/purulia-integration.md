# Worldwide communities and Purulia integration

## Repository review and implementation boundary

Initially reviewed Argus `0cd1783ebaa10161fa874bafa2c088e6f700f537`, then rebased
on `1ba230c2af3a46ccdfc75d6b448191d266cc499e` to preserve its newly added
LifeMaxxing/accountability/trust features; reviewed
Purulia `6e1c4aede217e91c275bf029b4c299a523994c04`.
Purulia is branded Parishkar. It is a static HTML/JavaScript civic application
with Postgres RPCs and Supabase edge functions, not a React library. Argus is a
React/TypeScript/Tauri application with existing movie/media functionality and
a newly added LifeMaxxing vision, accountability, and trust module. The integration
extends that module while preserving playback. The vision remains broader than
the capabilities implemented in this PR.

| Existing component                                                                    | Reuse in Argus                                                                                         | Boundary                                                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `place-facts.js`, `places/wb_district_facts.json`, `tools/build-wb-district-facts.py` | Native district selector and aggregate fact cards; schema projection in `src/lib/community/purulia.ts` | Explicit load of a commit-pinned public JSON file; retain source dates, NFHS alias/parent geography, and unknown values |
| `city.js`, `places.js`, district `?d=` page convention                                | Community resource manifest and district-specific promise/notice links                                 | No shared `parishkar_place` storage, GPS, contact directory, or identity import                                         |
| `kasa.html`, `kasa.js`, `kasa-photo-meta.js`                                          | Open original report/verification workflow in the system browser                                       | Camera, GPS, photo checks, publishing, and moderation stay on Parishkar; no embedded privileged webview                 |
| `promises.js`, `noticeboard.js`, `record.js`, `case.js` and public dossier RPC        | Links to community needs, public commitments, and reviewed evidence                                    | No RPC copied, public allegation imported, automatic guilt inference, or person scoring                                 |
| `rti-letter.js`                                                                       | Open existing local draft builder                                                                      | Applicant details remain on the external page; Argus neither receives nor submits a draft                               |
| `supabase/migrations`, `supabase/functions`, `admin-evidence.js`, `admin-signals.js`  | Preserve existing service ownership                                                                    | No migration into Argus's media database, admin credentials, private evidence, moderation state, or AI keys             |
| Argus `argus-lab.tsx`, profile context, `window.ts` strict external opener            | Community tab inside Observatory, profile lifecycle, existing system-browser dispatch                  | Playback/ranking contract remains separate from civic evidence                                                          |

This is a first integration: real aggregate civic data renders within Argus;
transactional civic workflows remain on their existing service. It does not
implement all of the planning discussion's proposed intelligence engines,
opportunity matching, a new backend, or a replacement reporting interface.

## Worldwide community core

Public information discovery does **not** require a local connector. Every
selected place, including a manual offline entry, can search live internet
sources for services, notices/news, work/learning opportunities, and public
projects. Curated jurisdiction adapters are optional shortcuts and transactional
boundaries, not a gate on worldwide information access.

`web-discovery.ts` reuses Argus's existing `jina-search.ts` result parser, with an
optional heading-preservation argument; the old parser default and existing AI
search callers retain their behavior. A civic search requests the DuckDuckGo
search page through the existing Jina Reader route, asks to bypass the Reader
cache, and requests recent results. It does not fetch arbitrary result pages,
run external page instructions, summarize allegations, send private drafts,
read an API key/account setting, or invoke an LLM. Explicit loading uses the same
consent, omission of credentials/referrer, size cap, deadline, cancellation,
and no-retry transport as the other public adapters.

Result cards contain the original source link, hostname, retrieval timestamp,
unknown publication date, and **unverified** evidence status. A simple government
domain hint affects ordering but never certifies a source or a claim. Native
HTTPS/IP/credential checks filter obvious unsafe destinations. No automatic
cross-source corroboration is claimed. Human review must check original dates,
authority, relevant documents, contradictions, and independent evidence before
asserting verification. Each result is text, not executable HTML. No article
body is copied into the interface. An explicit direct-browser search is available
if the Reader route is blocked, rate-limited, unavailable, or returns no usable
links. The current implementation performs on-demand discovery, not recurring
monitoring or private-person tracking.

[Jina Reader documentation](https://jina.ai/reader/) describes the URL-to-text
service and cache controls. Public zero-key access may be limited and is not a
free-unlimited production guarantee. The browser fallback preserves worldwide
search without requiring a per-city source integration.

`src/lib/community/places.ts` defines place context, a jurisdiction adapter registry,
public place projection, and destination construction. `community-tab.tsx` owns
the worldwide UI, shared by LifeMaxxing and Observatory; `purulia-panel.tsx` contains the original native civic-data
integration. Adding another locality does not require cloning the application or
copying the core ranking, identity, storage, or reporting engine.

- Explicit place search uses Open-Meteo's geocoding API, backed by GeoNames. It
  accepts multilingual city/town/village/area names and an optional ISO country
  filter. It is never invoked while typing, on mount, or by geolocation. Public
  place centres are not device locations. Search results retain country and
  region so similarly named places can be distinguished. Population lacks an
  observation date and is labelled accordingly, never claimed as a live census.
- Manual place/country entry works offline for any unlisted place. It grants no
  jurisdiction, official-service match, coordinates, or population by guessing.
- Every selected place has an ephemeral private improvement draft and checklist,
  following the evidence/process/follow-up pattern in Purulia. Draft text is
  never included in a search, resource URL, export, sync, log, or backend request.
  Changing places resets it; leaving the tab, switching profiles, or clearing
  also discards it. There is no cross-user collaboration or persistence yet.
- Service coverage is explicit: Purulia's reviewed adapter, NYC311 for the
  GeoNames New York City identifier **and** US country code, and Slovakia's
  official municipal-service directory for provider-selected SK places. The
  Slovak directory still requires the user to select the responsible municipality
  and only offers forms that municipality publishes. Manual entries cannot
  impersonate these matches. Other places show that local civic services are
  not yet connected while retaining the local planning workspace.
- Geography is not citizenship or entitlement. Country, municipality, reporting
  rules, and evidence-publication permissions are never inferred from media
  identity. A future transactional adapter must validate jurisdiction server-side
  and preserve consent, moderation, correction, and right-of-reply boundaries.

Sources checked November 2, 2026:
[geocoding schema](https://open-meteo.com/en/docs/geocoding-api),
[GeoNames attribution](https://www.geonames.org/about.html),
[NYC311](https://portal.311.nyc.gov/),
[NYC reporting directory](https://portal.311.nyc.gov/report-problems/),
[Slovak official municipal-service finder](https://navody.slovensko.sk/sk/services).

The public Open-Meteo endpoint is a **non-commercial pilot** dependency and has
usage limits. It is not an unlimited worldwide production-service commitment.
Before a commercial or large-scale deployment, provision a suitable licensed
endpoint or self-host the provider and review the adapter. Do not put a paid API
secret in the frontend. Manual entry remains usable when search is unavailable.
See [provider terms](https://open-meteo.com/en/terms).

## Purulia adapter runtime

1. Open **LifeMaxxing → Community & Public Discovery** or
   **Argus Observatory → Community** in an adult profile. Nothing is fetched
   on mount, focus, profile selection, or tab selection.
2. Choose **Explore the Purulia pilot** (or a matching searched place).
   **Load public district data from GitHub** authorizes a single GET to the
   reviewed revision's `places/wb_district_facts.json` on raw.githubusercontent.com.
   It omits credentials/referrer, rejects redirects, has a 12-second deadline,
   accepts a bounded JSON payload, and never retries automatically.
3. Project only population, JJM tap-connection percentage, and three NFHS-5
   household indicators. Names and citations render as React text. URLs from
   the payload are ignored; citation destinations are fixed in the adapter.
   Dataset generation, original measurement period, source-read date, and
   survey geography remain distinct. Missing or invalid values are unknown,
   never zero. These are upstream compiled facts, not independently verified
   current conditions or evidence of misconduct.
4. District selection is local. Only promise/notice pages accept the district
   slug. The report map keeps Parishkar's own place/location consent flow.
5. External buttons use Argus's existing strict system-browser opener, never
   an iframe or a native command capable of arbitrary execution. Web windows
   use `noopener,noreferrer`. A browser popup blocker can still prevent opening;
   native opener failures produce an inline error.

## Privacy and preservation invariants

- The module never reads media history, account credentials, profile identity
  details, location, photos, device contacts, private reports, or moderator APIs.
  The profile ID is used only as a React lifecycle key and is never sent.
- No civic data, district choice, consent, or error is persisted, exported in Lab
  backups, synchronized, logged, or sent to external AI/telemetry.
- Clear/cancel aborts the pending request and discards memory. Leaving the tab,
  hiding Observatory, switching profiles, or entering a child profile unmounts
  the content and aborts its request. Late responses cannot restore cleared data.
- No profile and child profiles fail closed. The Community tab is hidden for
  those profiles, in addition to Argus's existing kids navigation restrictions.
- Open-Meteo receives the deliberately searched public place and country code,
  plus the requesting network address. No private draft or device location is sent. Explicit web discovery sends only
  the chosen public place and fixed topic to Jina Reader / DuckDuckGo; provider
  visibility of requests/network metadata is disclosed before activation.
- GitHub necessarily sees the requesting network address. Opening Parishkar
  begins an external session governed by its privacy policy and permissions.
- No existing playback settings, route behavior, keys, contracts, databases, native
  permissions, CSP, RPC grants, service workers, or backend deployments change.
  Purulia's repository and live deployment are untouched.

## Migration, rollout, and rollback

**Forward:** merge and ship the frontend through the normal Argus release path.
There is no SQL, data copy, runtime configuration migration, or service
deployment. Vite+ 1.4.0 is a pinned development dependency restoring the existing
`pnpm run check` command; the application retains its Vite 7 build and Node test
runner. Use Node 24.11+ (as in CI), Node 22.18+, or Node 26+ for the tool. Existing installations retain their settings and behavior. The new
tab starts empty; loading is opt-in for every mounted session.

**Compatibility:** old Argus clients continue unchanged. New clients consume an
immutable Purulia artifact, a public place-search API, and reviewed external links; neither requires a new
Purulia schema. The two applications retain independent storage and accounts.

**Refresh:** review a new Purulia commit and the generated JSON/source metadata,
update `PURULIA_REVISION`, refresh the narrowly projected fixture with attribution,
and run the community tests and typecheck. Add local service coverage through a reviewed
registry entry with an exact jurisdiction predicate and fixed official URLs; test
small places, same-name collisions, missing data, and unsupported jurisdictions. A new deployment upstream does not
silently change the reviewed dataset. If the artifact becomes unavailable,
loading fails visibly and a user can retry; external community tools still work.

**Rollback:** revert this frontend commit and release normally. No persisted
civic records or schema need downgrading or deletion. Already-open external
browser sessions remain under the user's control. No destructive contract phase
or live database migration is part of this PR.

## Validation

`tests/purulia-community.test.ts` covers the upstream schema and NFHS alias,
parent geography, source dates, zero versus unknown, invalid data, field/URL
projection, fixed destinations, explicit consent, credential omission, payload
errors, and cancellation without retries.

`tests/purulia-community-ui.test.tsx` mounts the real component and checks no
request on mount/focus, load state, district switching without another request,
external browser isolation, cancel/late-response behavior, visible failure and
retry, profile reset, child/no-profile rejection, inactive-view cleanup, and
unmount cancellation. Existing Lab and experience-engine tests cover preservation
of their import/export and ranking behavior. See the PR for execution results and
any repository/environment limits on broader checks.

`tests/community-discovery.test.ts` proves generic manual-place queries,
credential-free one-request transport, unverified status, unknown publication
dates, unsafe-link filtering, parser-default preservation, and government hints
without verification claims. The worldwide UI test also types a private draft,
confirms it never enters the search URL, renders unverified source results, and
cancels/discards late web results when changing places.

`tests/community-places.test.ts` uses projected real provider responses for
Banská Štiavnica, Slovakia and New York, US, plus same-name and malformed-data
cases. `tests/community-worldwide-ui.test.tsx` verifies offline entry, no request
on typing, private draft isolation, place/profile resets, explicit search,
jurisdiction-specific links, inactive cleanup, and no storage writes.

For manual checks, open Community at desktop and narrow widths, navigate with
Tab/Enter, load the dataset, change districts, open a resource, cancel a load,
and leave/re-enter Observatory. Camera/GPS/report submission and moderation must
continue only on Parishkar. Native and TV input require their platform runners.

## Provenance

Adapter conventions come from Purulia's MIT-licensed `place-facts.js`; the full
license is retained in `THIRD_PARTY_NOTICES.md`. The test fixture contains a small
projection of public aggregate facts and source metadata from the pinned dataset,
compiled by Parishkar / Purulia, with no report/photo/person data or Wikipedia
descriptive prose. Original source names and dates remain in the fixture. See
[upstream dataset](https://github.com/archiboltmusk/Purulia/blob/6e1c4aede217e91c275bf029b4c299a523994c04/places/wb_district_facts.json),
[methodology](https://archiboltmusk.github.io/Purulia/methodology.html), and
[data terms](https://archiboltmusk.github.io/Purulia/terms.html).

Worldwide fixture: selected public fields from Open-Meteo / GeoNames responses
for New York and Banská Štiavnica, retrieved November 2, 2026. GeoNames data is
CC BY 4.0; fields were projected and unrelated postal codes/metadata omitted.
No population date was supplied. Map links open OpenStreetMap; no map tiles are
embedded or bulk-downloaded. [OpenStreetMap attribution](https://www.openstreetmap.org/copyright).

Storage research is documented in [storage-options.md](storage-options.md).
No Telegram/R2 account, bucket, bot, billing plan, or evidence-store migration is
created by this PR. Those are future backend choices, not hidden deployments.

The new upstream Trust engine's `isCorruptionAlleged: false` invariant is
preserved. Search findings are not inserted into its verified-project statuses
or accountability ledger. Evidence remains unverified until an appropriate
review process establishes a claim. Existing movie watching, playback policy,
media credentials, and history are not connected to the civic module. The shell
passes active visibility to LifeMaxxing so hidden civic content is unmounted.

LifeMaxxing owns a height-constrained scrolling surface so the new source cards
and private plan remain reachable inside the fixed-height desktop shell.

## Execution results

- Final focused run: 30 tests passed, including worldwide discovery, Purulia,
  privacy/lifecycle cases, existing Lab/experience behavior, and media navigation.
- TypeScript check passed on the rebased integration; repeated after the final
  scrolling adjustment. The PR records the final result.
- Vite 7 production web build passed. Existing unresolved game-art references,
  mixed dynamic/static import notices, and large-chunk warnings remain.
- Vite+ checks pass formatting/lint for new modules/tests/docs, and lint for the
  four minimally edited existing TypeScript/TSX files. Their baseline formatting
  failures (plus README formatting) were reproduced on the original files; no
  broad reformat was applied. Vite+ exposes deprecation notices from the existing
  React/Vite plugin combination while loading configuration.
- Full direct Node runner on the original integration base: 6,776 passed, 22
  skipped, and one translation-coverage failure (45 existing missing fallbacks).
  Running the repository's normal pretest generator then rechecking that file
  passed all five tests. Generated unrelated translation edits were restored.
- Required native build command was attempted on macOS and failed at the existing
  release prerequisite for a staged libmpv closure. No native playback code or
  permissions changed. Linux binaries and real TV/gamepad/native playback were
  not verified on this host.
- Live browser checks loaded the real pinned Purulia dataset, searched Banská
  Štiavnica, switched districts, used offline place entry, and displayed live
  municipal noticeboard links with retrieval time and unverified status. Narrow
  and desktop component layouts were inspected. No civic submission was sent.

Component preview screenshots of the real module in an isolated local harness
are retained as local review deliverables. No screenshot payload is published in
this repository. Before this PR neither LifeMaxxing nor Observatory exposed this
community discovery workflow.
