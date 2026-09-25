import {managerEligible,careerPromise} from './career-rules.js';
import {integer,random,pick} from './random.js';
import {TEAMS,teamName} from './data.js';
export const SECOND_ROLES=['高校野球監督','野球解説者','タレント','野球YouTuber','野球教室の指導者','地域の野球指導者'];
export function startAfterlife(s,route='auto'){
 if(!s.retired)throw Error('現役引退後に読める物語です。');if(s.afterlife)return s.afterlife;
 const promise=route==='other'?null:careerPromise(s,s.careerPromises?.at(-1));
 if(!s.postCareer&&promise)s.postCareer={year:s.year+1,team:promise.team,role:promise.role==='manager'?'監督':'コーチ',salary:promise.role==='manager'?6000:1200,guaranteed:true};
 if(s.postCareer?.role==='監督'&&!managerEligible(s,s.postCareer.team))s.postCareer.role='コーチ';
 let role=s.postCareer?.role||pick(s,SECOND_ROLES),team=s.postCareer?.team||'',year=Math.max(s.postCareer?.year||s.year+1,s.year+Math.max(1,23-s.age)),age=s.age+year-s.year;
 const life={startYear:year,startAge:age,route:role,entries:[],titles:0,teams:[],reputation:'新しい人生の始まり',generated:true,milestones:[],coachYears:0,coachAchievements:0};
 if(team)life.teams.push(team);life.entries.push({year,age,role,team,text:team?teamName(team)+'の'+role+'に就任。'+(s.postCareer?.guaranteed?'FA契約時の就任保証が実現した。':'新しい立場で野球と向き合う。'):role+'として第二の人生を始めた。'});
 const span=integer(s,10,20);
 for(let i=1;i<=span;i++){year++;age++;let text;const roll=random(s);
  if(role==='監督'){if(roll<.18){life.titles++;text=teamName(team)+'を率い、'+(team.includes('・')?'世界一':'日本一')+'を達成！';if(life.titles>=3){life.reputation='複数回の頂点に導いた名将';text+=' 名将と呼ばれる存在になった。';}}
   else if(roll<.34){text='成績不振の責任を問われ、'+teamName(team)+'の監督を解任された。';role='野球解説者';team='';}
   else if(roll<.46){text='チームの低迷に責任を取り、監督を辞任した。';role=pick(s,SECOND_ROLES);team='';}
   else if(roll<.61){team=pick(s,TEAMS.filter(t=>t!==teamName(team)));life.teams.push(team);text=teamName(team)+'から再建を託され、監督に就任。';}
   else text=pick(s,['若手の起用が当たり、優勝争いを演じた。','選手との意思疎通に苦しみ、下位に沈んだ。','戦力不足の中でも粘り強く戦い、続投が決まった。']);}
  else if(role==='コーチ'){life.coachYears++;if(roll<.22){if(life.coachYears>=3&&life.coachAchievements>=2){role='監督';text=teamName(team)+'での指導実績（コーチ経験'+life.coachYears+'年・育成や優勝への貢献'+life.coachAchievements+'回）を評価され、次期監督に抜擢された。';}else text='育成計画を託され、コーチとして指導を続けた。';}else if(roll<.37){text='指導の成果が出ず、コーチ契約を打ち切られた。';role='野球解説者';team='';}else if(roll<.52){team=pick(s,TEAMS.filter(t=>t!==teamName(team)));life.teams.push(team);text=teamName(team)+'へコーチとして移籍。新しい指導法を試す。';}else {const success=pick(s,[true,false,true]);if(success){life.coachAchievements++;text=pick(s,['育てた若手が主力へ成長し、指導力を評価された。','チームの優勝にコーチとして貢献した。']);}else text='指導が選手に伝わらず、苦しい一年を過ごした。';}}
  else if(role==='アカデミーコーチ'){if(roll<.2){role='コーチ';text=teamName(team)+'のアカデミーでの育成が評価され、二軍コーチに就任した。';}else if(roll<.34){text='アカデミーの再編で契約が終了。地域の指導者として再出発した。';role='地域の野球指導者';team='';}else text=pick(s,['アカデミーの卒業生が全国大会で活躍し、育成の手応えを得た。','子どもたちの基礎づくりと野球の普及に取り組んだ。','指導法が合わず苦戦したが、保護者との対話から改善を重ねた。']);}
  else if(role==='球団職員'){if(roll<.15){text=teamName(team)+'の地域連携事業を成功に導き、部門責任者へ昇進した。';}else if(roll<.3){text='球団の事業再編を機に退職し、新たな仕事に挑戦した。';role=pick(s,SECOND_ROLES);team='';}else if(roll<.42){team=pick(s,TEAMS.filter(t=>t!==teamName(team)));life.teams.push(team);text=teamName(team)+'の運営部門へ転職。選手を支える仕事を続けた。';}else text=pick(s,['ファンサービス企画が好評となり、球場に新たな来場者を迎えた。','遠征や用具の手配を担当し、選手を裏方として支えた。','企画が振るわず、球団運営の難しさを学ぶ一年となった。']);}
  else if(role==='高校野球監督'){if(roll<.18){life.titles++;text='率いる高校が夏の全国大会を制覇。胴上げで宙を舞った。';if(life.titles>=3)life.reputation='高校野球の名将';}else if(roll<.33){text='勝てない年が続き、高校の監督を辞任。';role='地域の野球指導者';}else text=pick(s,['教え子がプロに指名され、涙で送り出した。','部員不足に苦しみながら、地域の仲間と野球部を守った。','県大会の壁を越えられず、基礎から指導を見直した。']);}
  else if(s.proYears>=3&&roll<.12){const home=s.records.find(r=>['pro','mlb'].includes(r.stage))?.team;role=managerEligible(s,home)?pick(s,['コーチ','監督']):'コーチ';team=role==='監督'?home:pick(s,TEAMS);life.teams.push(team);text=teamName(team)+'から'+role+'として現場復帰の要請。新たな挑戦を選んだ。';}
  else if(roll<.25){role=pick(s,SECOND_ROLES.filter(next=>next!==role));text=role+'へ転身。思いがけない出会いが道を開いた。';}
  else{const stories={'野球解説者':['分かりやすい解説が人気となり、全国放送の常連になった。','解説の仕事が減り、地方中継から活動を立て直した。'],'タレント':['親しみやすい人柄で番組に引っ張りだこになった。','出演番組が終了。新しい仕事を探して奔走した。'],'野球YouTuber':[...(!life.milestones.includes('millionSubscribers')?['技術解説が話題となり、登録者100万人を突破した。']:[]),'元チームメートとの対談が好評で、新しい視聴者が増えた。','再生数が伸びず、動画の内容を一から見直した。','視聴者の悩みに答える配信が、野球を始めるきっかけになった。','球場取材を続け、普段は見られない野球の魅力を届けた。'],'野球教室の指導者':['教室の卒業生が全国大会で活躍した。','生徒が集まらず教室を縮小。個人指導を続けた。'],'地域の野球指導者':['地域の子どもたちと、勝敗を超えた野球の楽しさを分かち合った。','後継者を育てながら、小さなグラウンドを守り続けた。']};text=pick(s,(stories[role]||stories['地域の野球指導者']).filter(t=>t!==life.entries.at(-1)?.text));if(text.includes('登録者100万人'))life.milestones.push('millionSubscribers');}
  life.entries.push({year,age,role,team,text,coachYears:life.coachYears,coachAchievements:life.coachAchievements});
 }
 life.teams=[...new Set(life.teams)];life.entries.push({year:year+1,age:age+1,role,team,text:'第二の人生にも、成功と挫折、そしてたくさんの出会いが残った。'});s.afterlife=life;return life;
}
