// Growth-only configuration. Existing talent, potential and genius rolls remain authoritative.
export const DEV_MODE=false;
export const DEVELOPMENT_CONFIG={
 variance:.85,wholeYearScale:2.4,schoolBoost:.2,overseasBoost:.3,
 modifiers:{growth:1,injuryRisk:1,opportunity:1,salary:1}
};
export const INJURY_CONFIG={baseRisk:.065,agingStart:32,agingRisk:.003,severeRisk:.035,retirementAdviceRisk:.12};
export const DEVELOPMENT_TRAITS={version:1,min:.05,max:.95,spread:.9,longevityPhase:.10,consistencyAdaptation:.14,declineMin:.75,declineMax:1.45,declineLongevity:.12,peakShift:{early:-5,normal:0,late:2},peakMin:24,peakMax:36,injuryMin:.55,injuryMax:1.25};
export const ROUTE_GROWTH={
 elementary:{adaptation:.06,pressure:0},middle:{adaptation:.10,pressure:.03},high:{adaptation:.12,pressure:.08},
 university:{adaptation:.16,pressure:.04,unfinished:.10,late:.05},overseas:{adaptation:.56,pressure:.10,unfinished:.10,late:.04},
 corporate:{adaptation:.12,pressure:.03,consistency:.14,technique:.08},independent:{adaptation:.16,pressure:.04,practice:.14,unfinished:.08},
 pro:{adaptation:.22,pressure:.12,practice:.12},mlb:{adaptation:.48,pressure:.14,practice:.12},
 fitWeight:.45,fitMin:.65,fitMax:1.25,opportunityFloor:.72,opportunityWeight:.28,rookieFloor:.76,rookieCeiling:1.04,rookieYears:2,rookieCompetition:64,
 adaptationFailureBase:.12,adaptationFailureTrait:.25,adaptationFailureMin:.025,adaptationFailureMax:.38,
 adaptationYears:1.5,failureExtension:1,successBoost:.05,failurePenalty:.24,recoveryAfter:.75,roleRecoveryChance:.35,
 eliteCompetition:60,topDraft:2,highScout:75,potentialRoom:40,farmExperience:.8,starterOpportunity:.22,reliefOpportunity:.42
};
export const BREAKOUT={minAge:10,maxEvents:2,cooldown:4,baseChance:.003,traitChance:.025,independentBonus:.012,gainMin:2,gainMax:5,secondaryShare:.45,windowBoost:1.12,windowYears:1,minimumRoom:5,minimumGames:6,goodAverage:.285,goodERA:3.5,stagnationFactor:.25,minimumHealth:.75};
export const STAGNATION={minAge:8,maxEvents:3,cooldown:3,baseChance:.002,traitChance:.025,adaptationBonus:.015,highPressureBonus:.005,minMultiplier:.28,maxMultiplier:.60,duration:1.5,lostStarFactor:.65,briefFactor:.75,briefEnd:5};
export const DECLINE={
 youthScale:.45,adultBase:.55,ageExponent:1.15,grace:1,slope:.38,acceleration:.020,longevityWeight:.3,noiseScale:.45,
 phaseEarlyYoung:1.15,phaseEarlyAdult:.90,phaseLateYoung:.72,phaseLateAdult:1.12,phaseBoundary:18,
 ability:{speed:1.25,field:1,arm:1.1,throwing:.85,power:.95,meet:.8,eye:.65,clutch:.65,velocity:1.15,control:.7,stamina:1.1,breaking:.8,strikeout:1},
 varianceMin:.30,varianceMax:1.20,adaptationShockMin:.65,adaptationShockMax:1.15,employmentLongevityWeight:.10
};
export const INJURY_GROWTH_PENALTY={shortShare:.08,mediumShare:.30,longShare:.70,shortFactor:.98,mediumFactor:.75,longFactor:.28,fullFactor:.08};
export const CAREER_CLASSIFICATION={starYears:3,starMerit:3,lateAge:28,earlyAbility:65,ironSeasons:18,legendTitles:10};
export const CAREER_BALANCE={
 compoundRiskFloor:.12,compoundRiskChance:.65,compoundDuration:8,recoveryAdaptation:.5,recoveryPressure:.5,
 declineLongevity:.55,declineHealth:.25,declineSevere:.08,
 majorThreshold:84,majorAdaptation:12,majorAgingStart:30,majorAging:.6,
 domesticEvidence:3,minorEvidence:6,majorEvidence:4,battingSample:300,pitchingSample:180,
 evidenceAverage:.29,evidenceERA:3.5,
 struggleSeasons:3,struggleMerit:.5,struggleBatterGames:45,strugglePitchInnings:45,trialRating:62,developmentYears:3,
 retiredNumber:{years:12,majorTitles:4,historicalTitles:3,titleYears:3,hits:2500,hr:400,wins:180,saves:300,
 historicalHits:3000,historicalHR:500,historicalWins:250,historicalSaves:400}
};
