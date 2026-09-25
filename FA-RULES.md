# FA implementation
Reference: NPB, https://bis.npb.or.jp/announcement/2018/fa_about.html (checked 2026-09-24).

## Qualification
- First domestic right: 8 credited seasons; 7 for domestic university/corporate players drafted in 2007 or later. Overseas university and independent entries use the general 8-season rule.
- Overseas right: 9 credited seasons; permits domestic as well as foreign offers without posting permission.
- 145 roster days equal one credited season. Each season contributes at most 145; shorter seasons carry forward.
- Declaring FA consumes the right even when staying. After declaration, 4 credited domestic seasons earn overseas rights again. Trades do not reset the counter.
- Game-age cap remains 50. At that age, any offer is capped at one year.
- Existing multiple-year contracts restrict exercising FA but do not stop earning service.

## Annual simulation approximation
New seasons now use a daily registration calendar (see ROSTER-RULES.md). firstTeamDays is counted from active registration days, including rest days; faInjuryDays and faDays are derived from that ledger. The appearance-share approximation is retained only for old records without daily history. Players solely in the farm league and development players earn zero.
Injury credit is up to 60 days when the previous season had at least 145 actual modeled registration days. Calendar-specific eligibility, pitcher opening-day/All-Star deregistration exceptions and special national-tournament exceptions are not reproduced.
Legacy records use a deterministic estimate from their first/farm appearances. Missing appearances are not replaced with a full service year. Existing FA transfers provide a reset boundary.
Negotiation is handled during the game's annual off-season, rather than a seven-business-day calendar. FA compensation/rank rules are outside qualification and are not added here.

Code: dist/src/free-agency.js. Display and game-specific approximations are also explained inside the contract dialog.
