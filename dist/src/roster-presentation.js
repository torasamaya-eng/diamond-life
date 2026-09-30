import {outrightRights} from './roster.js';

// A procedure acknowledgement is different from a player's consent to assignment.
export function rosterDecisionPresentation(s){
 const d=s.rosterDecision,consent=d.type==='consent';
 const rights=outrightRights(s),mayElectFA=consent||rights.mayElectFA;
 return {
  title:consent?'マイナー配属への同意確認':'DFA・ウェーバー手続き',
  body:consent?'メジャー在籍5年以上のため、マイナー配属には本人の同意が必要です。通常のオプション配属と、オプションがない場合のウェーバー手続きを区別して進めます。':
   '40人枠から外すためのDFA手続きです。'+(d.deadline?d.deadline+'までの7日以内に、':'')+'他球団のウェーバー獲得、または通過後の40人枠外マイナー配属を処理します。',
  acceptLabel:consent?'配属に同意する':mayElectFA?'マイナー配属を受け入れて手続きを進める':'ウェーバー結果を確認する',
  declineLabel:consent?'降格拒否権を行使する':mayElectFA?'配属を拒否して自由契約を選ぶ':null,
  rightsText:consent?'拒否した場合は、残留・トレード・自由契約について球団と協議します。':mayElectFA?
   'メジャー在籍3年以上・過去のoutright・前季Super Two資格のいずれかにより、マイナー配属に代えて自由契約を選べます。':
   '今回は自由契約を選ぶ権利がなく、マイナー配属に本人の同意は必要ありません。',
  payText:s.activeContract?.payScale?'給与は既存の昇降格連動契約に従います。':'既存の保証契約は、マイナー配属だけを理由に減額されません。'
 };
}
