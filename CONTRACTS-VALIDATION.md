# Contracts and salary validation — 2026-09-27

## Scope and preserved work
Continued the existing uncommitted salary/contracts work on af3a431 rather than resetting it. Changes cover salary evaluation, contract guarantees and signing ledgers, injury rehabilitation contracts and roster return, mobile contract agreement controls, and overseas-college direct entry. The original audit baseline is unchanged. Hash tests protect stats, growth, development, balance, health, national selection, free-agency eligibility, awards, ads and sharing.

## Salary/contracts carried forward
- Domestic registered minimum 420万円, development minimum 240万円. Existing 1600万円/150-day first-team allowance remains separate from 145-day FA service.
- Three-season weighted salary evaluation, existing salary anchors, ordinary 25%/40% reduction limits, and role/playing-time valuation. Guaranteed multiyear contracts remain guaranteed.
- Signing bonuses, development setup allowances, incentives and paid salary have separate, idempotent ledgers.
- Long rehabilitation can lead to development renewal with terms based on previous contribution; guaranteed contracts remain intact. Recovery, practice, club assessment and July 31 deadline govern registered-roster return. Declining rehabilitation offers permits alternative employment.
- Mobile contract dialogs have a scrollable body and visible agreement footer; desktop direct agreement remains available.

## Overseas-college direct entry
- Uses the existing overseas draft eligibility, team selection and rank. No additional random draws for contract terms. stage=mlb still means the whole organization; proEntry.route=overseasDirect is retained.
- Organization rookie agreement starts outside the 40-man roster in the minors. Simplified A-level annual pay is $30,000 (450万円); promotion annual rate is at least $780,000 (11,700万円), at fixed 150 JPY/USD. These are fixed 2026 planning values, not future inflation forecasts.
- Signing bonus is an evaluation-based game approximation ($100k–$5.1m), kept separately from salary. It is not a replication of actual draft-slot allocations.
- Strong players can first be promoted after a minimum 14 minor days using existing eligibility and daily roster opportunities. Existing option, DFA, service-time and FA rules remain connected.
- Actual salary sums minor and major/MLB-IL days against the existing 187-day season. Optional-assignment service credit does not create major salary. For 100 minor + 62 major days in a 162-day test schedule, payment is (450*100 + 11700*62)/162 万円, not 11700万円.
- Annual split-pay renewal retains separate rates. An ordinary guaranteed multiyear/FA contract ends split pay and retains full guarantee. Domestic reemployment removes the overseas pay scale without erasing entry history.
- Old saves receive deterministic metadata only; unknown historical bonus remains unknown. Past pay, statistics and existing guaranteed contracts are not reconstructed or reduced. Legacy contracts remain on their existing terms; newly signed rookie contracts use the new split-pay policy.

## Verification
- Build and syntax checks completed. Standalone artifact updated only for the authorized contract modules/UI; unrelated existing standalone/source presentation differences preserved.
- Chromium and WebKit: 24 isolated browser scenarios passed (375x667 and 1280x667; single/multiyear/development/rehab/FA/overseas contracts). Not physical Safari or Brave testing.
- Before direct-entry extension: 5,000 complete careers; 24 rehabilitation-contract careers, five recorded rehabilitation-to-registered returns. Four genius careers ended within five professional seasons.
- After direct-entry extension: 1,000 complete careers. 5,071 domestic registered season rows: mean 5,877万円, median 4,390万円, minimum420; 1,450 development rows: mean339万円, median310万円, minimum240. Three rehabilitation-contract careers.
- This sample consists of repeated career seasons and is not a real-world one-year player census. Its median remains above the real survey median; it should not be described as matching the observed NPB salary distribution.
- Existing test assertions tied to superseded minimum salaries, automatic year-end development promotion, and old salary jumps were updated to the requested contract behavior. Baseline fixtures were not regenerated. New scope hashes protect unrelated logic.

## Institutional references
- [MLBPA 2022–2026 Basic Agreement](https://www.mlbplayers.com/_files/ugd/4d23dc_d6dfc2344d2042de973e37de62484da5.pdf): major minimum salary schedule.
- [MLBPA minor-league agreement resource](https://www.mlbplayers.com/resources/minor-league-cba): separate minor employment framework.
- [MLB minor-league CBA announcement](https://www.mlb.com/news/minor-leagues-new-collective-bargaining-agreement): separate minor agreement.
- [MLB service-time glossary](https://www.mlb.com/glossary/transactions/service-time): service time differs from calendar payroll allocation.
- [Japan Professional Baseball Players Association agreement](https://jpbpa.net/wp-content/uploads/jpbpa-pdf/agc2425.pdf): domestic salary and contractual framework.
- [NPB July 31 registration deadline](https://npb.jp/news/detail/20260731_02.html): registered-roster deadline.

Final npm.cmd test: 251 passed / 0 failed (previous completed baseline: 212 tests; pending contract work: 243 tests).
