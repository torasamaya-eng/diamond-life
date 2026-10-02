// Fictional competition. These settings belong only to 白球ドラフト.
export const CONFIG = Object.freeze({saveVersion:2,teamCount:12,candidatePoolSize:76,mainDraftRounds:4,developmentDraftRounds:1,featuredCount:22,startYear:2026,maxAge:43,measurementModel:'peak-v2',needsModel:'available-v1',scoutingModel:'club-v1',careerModel:'adaptation-v2'});
export const BALANCE = Object.freeze({proDifficulty:15,growth:2.6,decline:1.5,injuryBase:.045,injuryRisk:.19,breakout:.075,repair:.12,seasonNoise:5.5});
export const RECRUITMENT = Object.freeze({needWeights:[24,15,8],minimumEvidence:40,fullEvidence:64,standout:83,standoutBonus:8,noise:7,filledNeedPenalty:25,duplicatePenalty:7,surveyFloor:.20,surveyCeiling:.86,surveyNeed:.22,surveyMedical:.14,surveySmallSample:.10,surveyMaterial:.08,surveyRepresentative:.08,surveyAbility:.06,interviewChance:.52});
export const DEVELOPMENT = Object.freeze({potentialCenter:71,potentialQualityWeight:.22,potentialResidualWeight:.85,adaptationThreshold:.65,adaptationLoad:24,repairLoad:12,pressureLoad:12,stuffControlGap:.22,stuffBreakingGap:.16,setLoad:.7,powerEyeGap:.14,powerContactGap:.12,leftLoad:.4,gapRepair:.7,adaptationRecovery:.35,adaptabilityRecovery:.6,repairRecovery:.9,stalledRecovery:.3,stallBase:.055,stallAdaptability:.10,stallRepair:.10,stallPressure:.045,recoveryBase:.10,recoveryRepair:.28,recoveryAdaptability:.16,stalledGrowth:.16,adaptationForm:1,stalledForm:2.5,experienceFloor:.6,experienceWeight:.4,learningBase:.8,learningRepair:.65,competitionBase:.80,competitionSlope:.014,depthPenalty:.025,competitionFloor:.32,competitionCeiling:1.06,establishedBonus:.08,overseasLoad:5});
// Historical cohort calibration. Applies only to new adaptation-v2 candidates;
// draft rank never selects a winner, ceiling, growth multiplier or career class.
export const CAREER_DISTRIBUTION = Object.freeze({potentialCenter:70,potentialQualityWeight:.22,potentialResidualWeight:1.35,growthScale:3.2/2.6,adaptationForm:2.5,prospectMaxAge:27,prospectYears:6,prospectHealth:.6,prospectGrowth:.8,prospectBatAB:100,prospectOPS:.65,prospectPitchOuts:150,prospectERA:4.5});
export const TEAMS = ['大阪ブレイバーズ','横浜セイラーズ','東京クラウンズ','名古屋フェニックス','神宮ウイングス','広島レッドアローズ','福岡オーシャンズ','北海道ノーザンズ','千葉ウェーブス','神戸ハーバーズ','仙台フォレスターズ','埼玉キングス'];
export const LEAGUES=['セントリーグ','パシフィアリーグ'];
export const CATEGORIES = ['高校','大学','社会人','独立'];
export const TIERS = ['1位候補','上位候補','中位候補','下位候補','育成候補'];
export const BUCKETS = ['1位','上位','中位','育成'];
export const HONORS = Object.freeze({games:143,plateAppearancesPerGame:3.1,inningsPerGame:1,fieldingGames:72,bestNineGames:85,backgroundBatters:9,backgroundStarters:5,backgroundRelievers:3,backgroundClosers:1});
export function validateConfig(c=CONFIG){if(c.teamCount>TEAMS.length||c.teamCount<2||c.mainDraftRounds<1||c.developmentDraftRounds!==1||c.candidatePoolSize<c.teamCount*(c.mainDraftRounds+c.developmentDraftRounds)+8)throw new Error('候補数・球団数・指名数の設定を確認してください');return c;}

// Peak measured fastball; independent of career abilities and outcome rolls.
export const PITCH_MEASUREMENT=Object.freeze({base:124,stuffScale:.38});
