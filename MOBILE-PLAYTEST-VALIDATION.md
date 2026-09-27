# Mobile playtest corrections — 2026-09-28

Base: 551c4e4 (latest origin/main when work began). Before implementation: 271 tests passed. No prior working-tree changes were reset.

## 1. Two one-year offers
Fixed state/seed 713 reproduces the report's shape: current salary 4,400万円, registered player, age25, 150 days of stress-fracture recovery remaining. Current-year production is 120games/450AB/129H/18HR. prepareRenewal evaluates retain, but optionalRehab previously appended a second offer anyway.

|id|annual (万円)|years|type property|development|payScale|Displayed identity|
|---|---:|---:|---|---|---|---|
|one|6920|1|absent|absent (false)|absent|支配下契約|
|rehab|1510|1|absent|true|absent|育成契約・リハビリ|

Both belong to the current club 東京クラウンズ. Full offers, health, rehabReview, current salary and activeContract are preserved in tests/fixtures/playtest-before.json. This proves the code path exists, but cannot identify the user's exact phone session without its state.

Removed simultaneous optionalRehab offering. retain keeps ordinary offers; rehab offers only development rehabilitation; release offers no contract at that club. Guaranteed multiyear contracts and rehabilitation → registered return remain. Pending contradictory offers in old saves are normalized using rehabReview; agreed contracts, earnings and historical records are preserved.

## 2. Reported rookie annual salary above 100 million JPY
The actual alleged basic annual salary over 10,000万円 is NOT REPRODUCED. No new salary clamp was added. Four fixed-state routes were checked before changing code:

|Route|Basic annual|Signing bonus|
|---|---:|---:|
|Overseas college → independent → domestic draft|1550万円|9700万円|
|Overseas college → corporate → domestic draft|1550万円|9700万円|
|Domestic college → domestic draft|1600万円|10000万円|
|High school → domestic draft|1600万円|10000万円|

salary, activeContract.annual, contracts, incomeHistory, totalSigningBonus and pending draft terms were inspected. Bonus is entered separately; no annual salary or former overseas contract is inherited. Dedicated tests also seed a stale 11700万円 overseas contract and verify replacement by domestic rookie terms.

The prior dialog grouped these under 契約条件. Basic annual salary and one-time signing/setup payment now appear as separate paragraphs, explicitly stating that the latter is not annual pay. This reduces ambiguity, but does not establish that the user misread the screen. Contract and progress screens already display s.salary; they were checked and retain basic annual amounts.

## 2-A. Corporate eligibility
[NPB's latest accessible draft overview (2025)](https://draft.npb.jp/draft/2025/information.html) specifies two registered seasons for college graduates and three for high/middle school graduates. The attempted 2026 detail page was unavailable. The game selects corporate players at the end of season2/3, with entry the following year. Year1 selection was previously possible and is fixed. Independent players receive no corporate waiting period. Old premature pending offers cannot bypass the new entry guard; continuing at the present club remains possible.

## 3. Age-appropriate injuries
Before: seed7130 at age6 produced 疲労骨折, 114 days. Every age used the same adult pool. The annual/period injury occurrence chance is unchanged; elementary/middle/high pools and severe-event weights now differ. Elementary stress fractures remain possible at low weight; elbow/growth-related overuse replaces routine adult-type surgeries. High school gradually approaches the adult pool. Long rehabilitation and career-changing injuries remain.

The game weights are design choices, not medical incidence estimates. [AAOS overuse guidance](https://www.orthoinfo.org/diseases--conditions/overuse-injuries-in-children/) and [AAOS childhood throwing injuries](https://www.orthoinfo.org/diseases--conditions/throwing-injuries-in-the-elbow-in-children/) support distinguishing growth-plate/throwing stress from adult injuries rather than treating childhood stress injuries as impossible.

Adult pro behavior is protected with a pre-change 1000-draw digest: injury type, duration, ability effects and RNG state match exactly (only stage metadata is newly stored).

## 4. Progress statistics
Before/after browser checks reproduced domestic first-team0/farm100 and major0/minor100. The previous view selected the zero upper-level record; the domestic heading said 一軍. New progressDisplayStats selects upper level if games>0, otherwise lower level if games>0, otherwise 出場なし. It handles currentLevels and finalized record.levels without mutations. Salary evaluation, national selection, honors and upper-level totals continue using record.stats.

## 1000-career simulation
Deterministic seeds: Math.imul(i+1,2654435761), alternating batter/pitcher. Test policy explicitly samples overseas-college-to-corporate and overseas-college-to-independent choices; this is not a natural population route-rate estimate. Existing retirement policy retained. Rows/counts refer to events or seasons, not necessarily unique players.

- Contradictory one+rehab offers: 0
- Domestic rookie contracts observed: 830; maximum basic salary 1600万円
- Maximum signing bonus: 10000万円
- Overseas college → corporate domestic draft selections: 222
- Overseas college → independent domestic draft selections: 78
- Premature corporate draft events: 0
- Farm-only domestic seasons: 1304; minor-only overseas seasons: 350

### Injury counts by stage

elementary

|Injury|Events|
|---|---:|
|打撲|393|
|成長期のオーバーユース|222|
|成長期の疲労骨折|13|
|軽い足首の捻挫|295|
|少年野球肘（投球による痛み）|137|
|成長板の損傷・長期療養|2|

middle

|Injury|Events|
|---|---:|
|打撲|159|
|成長期のオーバーユース|118|
|足首の捻挫|90|
|投球による肘・肩の障害|81|
|軽い足首の捻挫|50|
|疲労骨折|12|
|少年野球肘（投球による痛み）|16|
|成長板の損傷・長期療養|3|

high

|Injury|Events|
|---|---:|
|疲労骨折|96|
|投球による肘・肩の障害|46|
|足首の捻挫|107|
|肉離れ|56|
|打撲|111|
|成長期のオーバーユース|32|
|成長期の肘・肩の障害|63|
|肘靱帯損傷・手術|2|
|膝の靱帯損傷|5|
|成長板の損傷・長期療養|2|

adultPro

|Injury|Events|
|---|---:|
|肉離れ|108|
|打撲|97|
|足首の捻挫|103|
|疲労骨折|108|
|肘靱帯損傷・手術|7|
|膝の靱帯損傷|8|

## Validation and scope

Chromium and WebKit each ran four before/four after cases at375×667: 16 browser scenarios passed. These are headless browser engines, not a physical-device Safari test. Regression tests cover both statistical levels, current and finalized records, legacy saves, bonus separation, waiting periods, and contract decisions. Existing tests that required simultaneous one+rehab or year1 corporate draft were updated to assert the explicitly requested replacement behavior; test cases were not removed. Historical audit-baseline.json was not regenerated.

No changes to stats.js, finance.js, market.js, roster.js, growth/development, ads.js, share.js, CSS, career cards, or autosave. Standalone HTML changes are limited to affected modules and the two UI portions.

Final npm.cmd test: **296 passed / 0 failed**. JavaScript syntax checks and git diff --check passed.
