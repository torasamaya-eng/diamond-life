# Release audit — 2026-09-28

Starting commit: 6fc0ab5. Baseline: 296 tests passed, zero failed. Protected untracked backup SHA256: 775C52C286FF34BC80FD214B574A73ADE53FE0DAEC6ACB4106553402408B152A.

## Before implementation: money flow

```text
NPB draft(rank,score) -> rookieContractTerms -> offer.salary + offer.bonus
  -> engine.choose -> setContract -> s.salary / activeContract.annual
  -> settleSigningPayment -> signingPayments / incomeHistory / bonus or setup total
  -> daily roster -> record.salary -> settleSalary -> paidSalary (+ first-team allowance)
  -> settleIncome -> incentives -> lifetime totals
  -> prepareRenewal -> one/multi/rehab -> signRenewal -> next active contract
FA -> market offer -> setContract; trade -> inherited annual/remaining term
Release -> reviewEmployment -> direct pro / independent / corporate / retirement
Independent or corporate -> draft AGAIN (incorrect for former NPB)

Overseas college -> draft score -> overseasRookieTerms -> non-40 minor split contract
  -> bonus separately paid -> daily major/IL and minor days -> prorated record.salary
  -> renewal: Japanese evaluation * 7.5 (no service-stage pricing)
  -> ordinary guaranteed contract: full annual salary regardless of demotion
NPB posting/overseas FA -> same market salary path (missing amateur-pool distinction)
```

Missing before changes: Rule 4 round slots, 40-man minor salary floors, pre-arb/Super Two/arbitration pricing, international amateur contract, posting fee, history-based former-NPB return contract. MLB guaranteed signing-bonus components are not implemented (no fictional extra payment will be added). NPB first-team allowance is included in totalSalary and must not be added again to careerIncome.

## Module/state audit

|Modules|Inputs and writes / effects|
|---|---|
|engine, events|State/seed/stage/pending; dispatch growth, health, daily roster, stats, annual settlement, draft, employment, retirement. All subsequent systems depend on this order.|
|contracts, finance|Records, role, prior annual, health, activeContract; offers/contract/income and payment totals. No ability/stat mutation.|
|market, lifecycle|FA/service/history, production/age; moves, teams, offers, employment and migration. Currently insufficient former-NPB distinction.|
|roster, free-agency|Contract, health, opportunities; daily status/games/service/options/FA. Records and rosterHistory duplicate full daily arrays in JSON.|
|draft, scouting|Ability/production/age-group history; draft and school offers. Corporate year gate exists; former-NPB exclusion missing.|
|storage, autosave, career-library|Validation/migrations; full-state JSON autosave and full-state retired snapshots in localStorage. Library corruption currently hides every entry.|
|ui, public-config, share|State consumers, DOM, canvas, persistence actions. Source UI differs from standalone; role controls, salary history and career high are unreachable or absent from current career.|
|awards, records, championship, career-types, afterlife|Existing stats/history -> awards/honors, records, team results, derived classification and second life. No new talent or production engine needed.|
|data, balance, identity, random, format|Stable IDs/config, talent/growth knobs, identity, seeded RNG, money formatting. Keep protected game balance.|
|development, growth, archetypes, personality, health|Abilities/potential/traits and derived RNG -> growth/decline/injuries/adaptation. Preserve formulas.|
|profile, fielding, stats, levels|Roles and abilities -> upper/lower stats. Preserve production/distribution formulas; enforce contractual roster guarantee upstream.|
|national, youth|Stats/abilities/health and seed -> selection, effects and separate tournament history. UI 13% label omits trait modifier.|
|ads, dev-tools|Exit-attempt flags and unbounded per-ID ledger; readonly development diagnostics. Ads remain disabled.|

Historical CHANGELOG/VERIFICATION contain obsolete save-removal descriptions. FOUNDATION-AUDIT already identifies duplicated roster payloads. CONTRACTS-VALIDATION explicitly records selective bundle generation; this release must restore missing source UI and use the full build. Old audit-baseline stays unchanged.

## Institutional baseline and approximations

- Current 2022–2026 CBA: https://www.mlbplayers.com/_files/ugd/4d23dc_d6dfc2344d2042de973e37de62484da5.pdf
- Posting: https://www.mlb.com/glossary/transactions/japanese-posting-system
- Arbitration: https://www.mlb.com/glossary/transactions/salary-arbitration
- Rule 4 slots: https://www.mlb.com/news/mlb-draft-2026-bonus-pool-pick-values
- JABA registration, articles 11/14: https://www.jaba.or.jp/_assets/pdf/regulation/touroku-1.pdf
- NPB player agreement: https://jpbpa.net/wp-content/uploads/jpbpa-pdf/agc2425.pdf
- 2026 salary survey: https://jpbpa.net/2026/04/27/13002/

Game approximations and measured release results will be recorded below after verification. Physical iPhone Safari is not tested by desktop WebKit.

## Resume verification — 2026-09-29

At resumption there were 28 tracked modified files and 15 new implementation/test/document/lock files (plus the protected backup). HEAD and fetched origin/main were both 6fc0ab5. No reset was used. The last edits were the simulation, release runner, economy tests, migration/codec robustness and site-browser checks. Prior reports included a completed 318-test run, but were treated as historical evidence only.

Completed before resumption: IndexedDB library, lossless autosave codec, contract stage/payments, return-route eligibility, career titles/review, bounded ad ledger, public-page wording, portable browser runners and standalone bundling. Incomplete: final audit report, final working-tree verification, commit and push. No previously failing test was assumed fixed without rerunning it.

This resumption adds USD annual/guaranteed-total labels to overseas guaranteed contract offers and the contract summary, and a seventh contract browser scenario. An editing-time syntax error in that label change was caught by syntax/unit checks and corrected before the final run. No salary, performance, growth or injury formula was changed during this resumption. The release test-count guard was raised from 296 to 318 and its summary now reports the configured simulation count.

## A. Findings and regression coverage

|Priority / symptom|Reproduction and root cause|Resolution / evidence|
|---|---|---|
|P1: long-career library quota failure|Three full 33-year states exceed localStorage; daily rosters duplicated in records and rosterHistory|Lossless shared-roster archive in IndexedDB. Both browser engines reproduce old QuotaExceededError then migrate/save/reload three players.|
|P1: unsafe migration/partial corruption|One bad entry or failed destination write could hide/destroy useful data|Validate per entry, read back before deleting old storage, atomic replacement, preserve source on failure; release-storage tests.|
|P1: former NPB redraft/new rookie bonus|Current amateur stage was mistaken for first professional entry|Career-history gate, separate return offers and corporate two-season restriction; return matrix and simulation observer.|
|P1: inconsistent MLB compensation stages|Japanese pricing multiplier, no 40-man floor or amateur-posting distinction|Service-stage evaluation, daily split pay, guaranteed contracts, slot/pool bonus and club-only release fee; economy matrix.|
|P1: FA regular guarantee not enforced through final year|Role promise insufficient for daily roster decisions|Healthy upper-roster guarantee until expiry, injury exception, ordinary competition after expiry; four role/league combinations.|
|P1: standalone/source divergence|Selective prior bundle edits exposed different functionality|Full module bundle generation and parity assertion before release.|
|P2: inaccessible career/contract information|Source lacked reachable titles/summary/history sections|Restore titles, review, career-high and income/contract history; browser checks.|
|P2: overseas guaranteed total lacks USD label|Normal overseas FA has neither split rates nor posting fee|Display dollar annual/total in offer and summary; new browser scenario at 375/1280 in both engines.|
|P2: unbounded ad keys / obsolete public text|One key per ended life; policies only described localStorage|Bounded 128-ID ledger, retain per-career flags, honest IndexedDB/privacy/contact wording. Ads remain disabled.|

## B–D. Contract rules and explicit game simplifications

Internal money remains ten-thousand JPY, with fixed 150 JPY/USD and fixed 2026 reference values. Future years have no inflation projection. Existing annual production and development engines are unchanged.

- NPB registered floor 420万円; development floor 240万円. Rank/assessment/route shape rookie salary (maximum 1,600万円), signing bonus (maximum 1億円) and optional rookie incentives. Development new entrants receive 300万円 setup allowance and zero signing bonus.
- NPB top-team allowance uses the gap to 1,600万円 times min(150, registration days)/150. It is a component of paid salary, never added twice to lifetime income. Renewal retains existing 25%/40% reduction rules, multi-year commitments, FA and trade logic. Rehab offers and registered return retain their separate rules.
- Overseas non-40 minor baseline $30,000 is a simplified aggregate of minor levels. First major-contract minor floor $63,600; subsequent major-contract/prior-service floor $127,100. Prior recorded 40-man seasons count for old saves. MLB minimum $780,000. Contracted split rates and actual day-weighted pay are distinct; IL follows major pay. A guaranteed contract retains annual pay when demoted.
- Pre-arbitration stays near the minimum; three-to-six service years use arbitration-stage pricing; six service years allow FA. Super Two uses a fixed 2 years + 134 days plus previous-year 86 days instead of a simulated league-wide 22% ranking. Arbitration valuation is a game approximation, not a prediction of an actual hearing. No new arbitration negotiation screen was added.
- Market salary considers recent production, role, age, health and major honors, up to nominal $70m annual. Deferrals, taxes and agents are not simulated. MLB guaranteed signing-bonus components are not newly invented: these offers currently consist of salary guarantees only.
- Rule 4 draft bonuses use approximate 2026 round bands, not a claimed exact overall pick. They are paid once, separately from annual pay. Overseas university entrants begin non-40 minor with the existing promotion/service/option/DFA systems.
- Posting requires age 25 AND six completed domestic professional seasons to use the unrestricted professional contract path. Younger/less-experienced postings use a simplified available international bonus-pool offer, a minor contract and a separate one-off signing bonus. Team-wide pool consumption is not simulated.
- Professional posting release fee uses 20% of the first $25m, 17.5% of the next $25m and 15% above; minor-contract fee is 25% of signing bonus. Fees are club payments, player income zero. Future supplemental release fees on later incentives are not simulated. Overseas/MLB FA has no posting fee.
- Former NPB players returning from independent/corporate baseball use career-based offers, never a new draft or rookie bonus/setup allowance. Corporate registration requires two completed seasons. MLB-only history is not misclassified as prior NPB employment. Return success is not guaranteed.

## Storage schema and compatibility

The runtime API retains records[].dailyRoster and rosterHistory. The codec stores identical rosters once and represents days as columns/rows; sparse legacy fields are preserved. Old uncompressed autosaves remain readable. New archives retain career identity/seed, yearly stats, income, awards, championships, national history, teams/numbers, injuries, development history and afterlife; only transient progression data is omitted.

The retired-player library uses IndexedDB independently of the localStorage autosave. Legacy library migration validates each player, writes the archive and verifies readback before removing the legacy source. Failure preserves the source and blocks destructive replacement. One corrupt player does not hide valid players. Concurrent saves and replacements use a transaction; an aborted replacement restores the previous entry. Default capacity remains 3 and a configurable 20-slot test passes without a payment system.

Old recorded salary/income is not estimated or rewritten. New fields are inferred only for future processing or pending invalid choices. Contract setupAllowance is separate from signing bonus; legacy pending development bonus is migrated to setup allowance without paying it again. No new game RNG draw is used by the archive, review or migration.

## Reproduction

```powershell
npm.cmd ci
npx.cmd playwright install chromium webkit
node build-single-file.mjs
npm.cmd test
$env:RELEASE_CAREERS='5000'
npm.cmd run test:release
git diff --check
```

The release runner checks standalone parity, syntax of every source JS module, all unit tests, storage sizes/round trips, contract browser matrix, release browser/quota/migration cases, public-site browser checks, seeded careers and diff whitespace. Historical audit-baseline and fixture hashes are not regenerated. Historical text-hash handling permits only the authorized corporate description correction; persistence tests now await the IndexedDB API rather than weakening their assertions.

## J. Limits of verification

Chromium and desktop WebKit are automated browser engines; this does not verify physical iPhone Safari, Brave, all device storage quotas or every private-browsing policy. Real H5 advertising is still disabled and has not been production-tested. Public policies describe current implementation; this audit is not a legal certification. Browser-managed storage is not an external backup. Numeric simulation rates describe the documented test policy and seeds, not all possible player decisions.

## F. Controlled storage measurements (UTF-8 bytes)

These compare the same model state with old full JSON versus the new codec/archive. They are payload sizes, not browser quota units or IndexedDB filesystem allocation. Runtime raw state remains unchanged.

|Career|Raw state|Old autosave|New autosave|Old archive 1|New archive 1|Old archive 3|New archive 3|
|---|---:|---:|---:|---:|---:|---:|---:|
|NPB20 (20 years)|1446095|1675134|417232|1446180|378972|4338397|1136916|
|MLB20 (20 years)|1556123|1787390|460114|1556208|422778|4668481|1268334|
|mixed30 (30 years)|2246681|2591242|653717|2246766|597738|6740155|1793214|
|maximum (33 years)|2378270|2755245|681819|2378355|619703|7134922|1859109|

For the 33-year model, raw record dailyRoster arrays are 1,152,896 bytes and their rosterHistory copy is another 1,152,896 bytes. After encoding, both reference the same 33 packed seasonal rosters; after decoding, both public APIs remain available. Actual browser tests reproduce the legacy quota exception and save/reload three archives successfully.

## E/G/H/I. Final verification — 2026-09-29

Current-tree npm.cmd test: 318 total / 318 passed / 0 failed. Full release runner: PASS, including 44 source syntax checks, NPB/MLB/posting/return matrices, storage/migration, standalone parity and git diff --check. Contract browser: 28 cases; release browser: 28 cases; public site: 39 checks, zero page errors. Chromium and WebKit each pass their 14 contract and 14 release cases. Public-site checks use Chromium.

Seeded normal-policy careers: 5000 completed; failed/deadlocked/validation failures/save round-trip failures: 0. Pro 3678 (73.56%), major 312 (6.24%), age-40+ professional 186 (3.72%), genius 168, retired numbers 71, legacy honors 310. These are observed outcomes, not forced targets.

|Money invariant|Failures|
|---|---:|
|signingDuplicate|0|
|setupDuplicate|0|
|postingPlayerIncome|0|
|NaN|0|
|Infinity|0|
|negativeMoney|0|
|contractTotalMismatch|0|
|paidSalaryMismatch|0|
|formerNpbRedraft|0|

Career transitions (all players; a corporate-to-pro transition may also be a first entry):

|Transition|Count|
|---|---:|
|elementary→middle|5000|
|middle→high|5000|
|high→corporate|2560|
|corporate→pro|2635|
|pro→independent|1166|
|independent→corporate|207|
|high→university|1000|
|university→pro|376|
|high→overseas|1000|
|overseas→mlb|172|
|mlb→pro|122|
|high→pro|245|
|pro→mlb|404|
|independent→pro|453|
|pro→corporate|663|
|overseas→pro|273|
|university→corporate|624|
|overseas→corporate|555|
|high→independent|195|
|mlb→independent|86|
|mlb→corporate|48|

Former-NPB returns specifically, after intervening league/team history:

|Prior stage|NPB returns|
|---|---:|
|independent|265|
|corporate|169|
|mlb|45|

All 5,000 final states passed autosave/archive round-trip with yearly stats and afterlife preserved. The controlled storage fixtures additionally cover 20-year NPB, 20-year MLB, mixed 30-year and maximum 33-year professional careers. Failed-migration tests preserve old data; partial corruption exposes readable players. No unresolved P0/P1 was identified in the verified scope.

Machine-readable measurements and normalized source/test hashes are in RELEASE-VALIDATION.json. Full local logs and screenshots remain under reports/ (gitignored). No historical baseline was regenerated.

## K. Git publication

The release commit includes the completed pre-existing changes, narrowly scoped resumed fixes, tests and evidence. The intentional ui.js.before-layout-change.bak is excluded and its original SHA256 is unchanged. Final commit/push verification and final status are reported separately after successful publication; no force operation is used.
