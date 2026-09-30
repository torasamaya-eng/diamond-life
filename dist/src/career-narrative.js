import {ops,era,performance} from './stats.js';

// Read-only evaluation of demonstrated careers. No RNG, mutations or creation-type rolls.
export function classifyCareerNarrative(s){
 const pitcher=s.player?.role==='pitcher',records=(s.records||[]).filter(r=>!r.partial).slice().sort((a,b)=>a.year-b.year);
 const pro=records.filter(r=>['pro','mlb'].includes(r.stage)),active=pro.filter(r=>(r.stats?.games||0)>0);
 const main=r=>pitcher?(r.stats.outs>=300||r.stats.games>=40):r.stats.ab>=300&&r.stats.games>=80;
 const star=r=>main(r)&&(pitcher?(r.stats.outs>=360&&era(r.stats)<=3.2||r.stats.games>=40&&era(r.stats)<=2.8&&((r.stats.saves||0)>=28||(r.stats.holds||0)>=25)):(ops(r.stats)>=.84&&r.stats.ab>=400));
 const mains=active.filter(main),stars=active.filter(star),npb=active.filter(r=>r.stage==='pro'),mlb=active.filter(r=>r.stage==='mlb');
 const ns=stars.filter(r=>r.stage==='pro'),ms=stars.filter(r=>r.stage==='mlb'),mm=mlb.filter(main),nm=npb.filter(main);
 const awards=(s.awards||[]).filter(a=>active.some(r=>r.year===a.year&&(!a.team||a.team===r.team))),major=awards.filter(a=>/MVP|首位打者|本塁打王|打点王|最多|最優秀|最高出塁率/.test(a.title));
 const history=s.developmentHistory||[],teams=(s.teams||[]).slice().sort((a,b)=>a.year-b.year),injuries=s.injuries||[],firstPro=pro[0]?.year??Infinity;
 const total=key=>active.reduce((n,r)=>n+(r.stats?.[key]||0),0),firstStarAge=stars[0]?.age??null;
 const routes=new Set([...records.map(r=>r.stage),...teams.map(t=>t.stage)]);
 const beforePro=stage=>records.some(r=>r.stage===stage&&r.year<firstPro)||teams.some(t=>t.stage===stage&&t.year<firstPro);
 const severe=injuries.filter(i=>i.severe&&i.totalDays>=90);
 const comeback=severe.some(i=>mains.some(r=>r.year<i.year)&&mains.some(r=>r.year>=i.year+Math.max(1,Math.ceil(i.totalDays/365))));
 const returnRows=nm.filter(r=>pro.some(p=>p.stage==='mlb'&&p.year<r.year)&&nm.some(p=>p.year<pro.find(x=>x.stage==='mlb').year));
 const returnViaAmateur=nm.filter(r=>records.some(a=>['corporate','independent'].includes(a.stage)&&a.year<r.year&&nm.some(p=>p.year<a.year)));
 const released=(s.timeline||[]).some(t=>/戦力外|自由契約/.test(t.text)&&npb.some(p=>p.year<=t.year)&&records.some(a=>['corporate','independent'].includes(a.stage)&&a.year>=t.year&&returnViaAmateur.some(r=>r.year>a.year)));
 const potential=Math.max(0,...Object.values(s.player?.potential||{})),promise=!!s.player?.genius||potential>=90||records.some(r=>r.stage==='high'&&r.overall>=80);
 const highHonors=(s.honors||[]).some(h=>['名球会入り','永久欠番'].includes(h.title));
 const historic=pitcher?total('wins')>=200||total('saves')>=300:total('hits')>=2000||total('hr')>=500;
 const legend=stars.length>=5&&(highHonors||historic)&&major.length>=3||stars.length>=10&&major.length>=6;
 const tier=legend?'legend':stars.length>=3?'star':mains.length>=3?'regular':active.length?'contributor':pro.length?'fringe':'amateur';
 const careerHigh=active.slice().sort((a,b)=>performance(b.stats,s.player.role)-performance(a.stats,s.player.role))[0];
 const evidence={proSeasons:pro.length,activeSeasons:active.length,mainYears:mains.length,starYears:stars.length,firstStarAge,npbStarYears:ns.length,mlbStarYears:ms.length,mlbMainYears:mm.length,mlbGames:mlb.reduce((n,r)=>n+r.stats.games,0),awards:awards.length,majorAwards:major.length,championships:active.filter(r=>main(r)&&(r.teamResult?.worldChampion||r.teamResult?.japanChampion)).length,careerHighYear:careerHigh?.year??null,retirementAge:s.age??null,routes:[...routes],severeInjuries:severe.length,injuryComeback:comeback,npbReturnYears:returnRows.length,amateurReturnYears:returnViaAmateur.length,released,historic,highHonors};
 const candidates=[],add=(id,yes,score)=>{if(yes)candidates.push({id,score});};
 add('legend',legend,100);add('generationalStar',stars.length>=8,95);
 add('releasedComeback',released&&returnViaAmateur.length>=2,legend?112:98);
 add('independentClimber',beforePro('independent')&&nm.length>=3,legend?111:96);
 // A draft invitation is not an accepted contract. Prefer the recorded entry year;
 // old saves only support a matching club's draft immediately before entry.
 const domesticEntry=teams.find(t=>t.stage==='pro')||pro.find(r=>r.stage==='pro');
 const draft=(s.drafts||[]).findLast(d=>['支配下','育成'].includes(d.type)&&domesticEntry&&d.team===domesticEntry.team&&
  (s.domesticEntry?.draftYear!==undefined?d.year===s.domesticEntry.draftYear:d.year===domesticEntry.year-1));
 add('developmentClimber',draft?.type==='育成'&&nm.filter(r=>r.contractStatus!=='development').length>=3,legend?110:95);
 add('lowerDraft',draft?.type==='支配下'&&draft.rank>=4&&nm.length>=3,legend?109:94);
 add('twoLeagueStar',ns.length>=3&&ms.length>=3,97);
 add('overseasComeback',mlb.length>0&&mm.length<2&&returnRows.length>=2,97);
 add('injuryComeback',comeback,96);
 add('domesticFace',ns.length>=6&&ms.length<2,94);
 add('overseasCollege',beforePro('overseas')&&stars.length>=3,93);
 add('universityBloom',beforePro('university')&&history.some(h=>h.stage==='university'&&(h.type==='BREAKOUT'||h.kind==='breakout'))&&stars.length>=3,93);
 add('lateStar',stars.length>=3&&firstStarAge>=28&&active.some(r=>r.age<27)&&!stars.some(r=>r.age<28),92);
 add('schoolElite',records.some(r=>r.stage==='high'&&r.overall>=80)&&stars.length>=3,91);
 add('corporateCraft',beforePro('corporate')&&nm.length>=5,90);
 add('mlbSuccess',mm.length>=3&&ms.length>=2,89);
 add('steadyStar',stars.length>=5&&stars.length/Math.max(1,active.length)>=.65,88);
 add('briefStar',stars.length>=1&&stars.length<=2&&mains.length<=3,85);
 add('injuryProspect',promise&&severe.length>0&&!comeback&&stars.length<3,87);
 add('geniusDisappointment',s.player?.genius&&stars.length<3,83);
 add('proWall',(s.player?.arc==='lostStar'||history.some(h=>h.type==='ADAPTATION_FAILURE'))&&pro.length>0&&mains.length<3&&stars.length===0,82);
 add('ironMan',active.length>=18&&mains.length>=12&&!injuries.some(i=>i.totalDays>=90),81);
 add('longVeteran',active.length>=14&&active.filter(r=>r.stats.games>=20).length>=12,78);
 const roleYears=id=>active.filter(r=>(pitcher?r.pitchRole:r.batterRole)===id&&r.stats.games>=30).length;
 add('closer',pitcher&&roleYears('closer')>=3&&total('saves')>=100,80);
 add('reliefCraft',pitcher&&roleYears('reliever')+roleYears('setup')>=4,77);
 add('starter',pitcher&&active.filter(r=>r.pitchRole==='starter'&&r.stats.outs>=300).length>=5,76);
 add('defenseCraft',!pitcher&&roleYears('defense')>=4,80);
 add('pinchRunner',!pitcher&&roleYears('runner')>=4,80);
 add('pinchHitter',!pitcher&&roleYears('pinchAce')+roleYears('pinch')>=4,80);
 add('longRegular',!pitcher&&mains.length>=6,75);
 add('mlbFootprint',mm.length>=2&&ms.length<2,74);
 add('overseasChallenger',routes.has('mlb')&&mm.length<2&&mains.length<3,73);
 add('unfulfilledProspect',promise&&mains.length===0,71);
 add('marginalPro',pro.length>0&&mains.length===0,60);
 add('solidPro',active.length>0,10);add('amateur',true,0);
 candidates.sort((a,b)=>b.score-a.score);
 const primary=candidates[0].id;
 // Only independently supported, complementary themes; never a list of every matching tag.
 const complementary=['legend','generationalStar','twoLeagueStar','domesticFace','lateStar','steadyStar','ironMan','longVeteran','closer','defenseCraft','pinchRunner','pinchHitter'];
 const secondary=candidates.find(c=>c.id!==primary&&complementary.includes(c.id)&&!(primary==='legend'&&['generationalStar','domesticFace'].includes(c.id))&&!(primary==='generationalStar'&&c.id==='domesticFace'))?.id||null;
 return {primary,secondary,tier,evidence,candidates:candidates.map(c=>c.id)};
}

const NARRATIVE_TEXT={
 legend:'長く一線で結果を積み重ね、球界史に名を刻む領域へたどり着いた。',
 generationalStar:'長年にわたって高い水準の活躍を続け、ひとつの時代を代表するスターになった。',
 domesticFace:'国内の舞台で幾度も主役を務め、球界の顔と呼べる存在になった。',
 twoLeagueStar:'国内で培った力をメジャーでも示し、両方の舞台でスターとして活躍した。',
 mlbSuccess:'メジャーの厳しい競争に定着し、一線級の選手として力を証明した。',
 mlbFootprint:'メジャーで居場所をつかみ、世界の強豪と渡り合う足跡を残した。',
 overseasChallenger:'海外の大舞台を目指したが、メジャーの主力として定着するまでには至らなかった。',
 overseasComeback:'海外では主役の座をつかめなかったが、帰国後に再び国内の主力へ返り咲いた。',
 schoolElite:'高校時代に見せた実力をプロでも磨き、期待を結果に変えたエリートだった。',
 universityBloom:'大学で訪れた開花を足がかりに、プロでも主役を担う選手へ育った。',
 overseasCollege:'海外大学での経験を経て、プロでも確かな成功を収めた。',
 lateStar:'若い頃は主役ではなかったが、遅れて訪れた全盛期にスターの座をつかんだ。',
 steadyStar:'一時の輝きに終わらず、安定した活躍を重ねて信頼を築いたスターだった。',
 lowerDraft:'ドラフト下位から一軍の主力へはい上がり、指名時の序列を実績で覆した。',
 developmentClimber:'育成指名から支配下、一軍の主力へと道を切り開いた。',
 independentClimber:'独立リーグを経て国内一軍の主力へはい上がり、遠回りを実績に変えた。',
 corporateCraft:'社会人で力を蓄えてプロに進み、長く主力を務めた叩き上げの選手だった。',
 releasedComeback:'一度は国内プロを離れたが、再挑戦を経て一軍の主力に返り咲いた。',
 injuryComeback:'長期離脱を伴う大けがを乗り越え、再び一軍の主力として居場所をつかんだ。',
 injuryProspect:'大きな可能性を持ちながら重い故障も経験し、期待された高みには届かなかった。',
 geniusDisappointment:'高い素質を持ちながら、長く主役を張るまでには伸び切らなかった。',
 proWall:'プロの壁にぶつかり、適応を模索する中で持ち味を結果に結びつけきれなかった。',
 briefStar:'短い全盛期に鮮やかな活躍を見せた、一瞬の輝きが印象に残る選手だった。',
 ironMan:'長期離脱を避けながら長年一線を守り抜いた、鉄人と呼べる選手だった。',
 longVeteran:'主役の座だけにこだわらず、長く一軍で役割を果たし続けたベテランだった。',
 longRegular:'派手な記録だけでは測れない継続力で、長年レギュラーを務めた。',
 starter:'先発として登板を積み重ね、長くローテーションを支えた。',
 defenseCraft:'守備固めとして出番を重ね、守りで一軍の居場所を築いた職人だった。',
 pinchRunner:'代走として一軍の出番を積み重ね、足を武器に役割を確立した。',
 pinchHitter:'限られた打席を任され続け、代打として一軍で頼られた選手だった。',
 reliefCraft:'中継ぎやセットアッパーとして登板を重ね、救援陣を支えた仕事人だった。',
 closer:'試合の締めくくりを任され、セーブを積み重ねた守護神だった。',
 marginalPro:'プロの門をくぐったものの、一軍の主力として定着するまでには届かなかった。',
 unfulfilledProspect:'大きな可能性を秘めながら、一軍で力を証明しきれずにユニフォームを脱いだ。',
 solidPro:'一軍の舞台で自分の役割を探し、着実に足跡を残した野球人生だった。',
 amateur:'プロ一軍の記録には届かなかったが、それぞれの舞台で野球人生を歩んだ。'
};
const NARRATIVE_SECONDARY={legend:'その歩みは、球界史に残る実績へとつながった。',generationalStar:'最後には、時代を代表するスターとして評価される実績を残した。',twoLeagueStar:'国内とメジャーの両方で、その実力を証明した。',domesticFace:'国内球界の顔となるほどの活躍を積み重ねた。',lateStar:'遅れて訪れた全盛期が、その人生を大きく変えた。',steadyStar:'高い水準の活躍を続けた安定感も持ち味だった。',ironMan:'長い現役生活を支えた丈夫さも特筆に値する。',longVeteran:'長く一軍の役割を守り抜いた粘り強さも光った。',closer:'抑えとして積み重ねた実績も、その価値を物語る。',defenseCraft:'守備固めとしての継続的な貢献も印象に残る。',pinchRunner:'代走として築いた居場所にも、その持ち味が表れている。',pinchHitter:'代打として任され続けたことにも、その価値が表れている。'};
export function renderCareerNarrative(s){const n=classifyCareerNarrative(s);return NARRATIVE_TEXT[n.primary]+(NARRATIVE_SECONDARY[n.secondary]||'');}
