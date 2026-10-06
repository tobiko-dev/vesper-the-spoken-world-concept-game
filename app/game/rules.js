import {SPELLS, SPELL_BY_ID, RANKS} from './data.js';
export const SAVE_KEY='vesper-save-v1';
export function newState(name='Wayfarer') { return {version:1,name:name.trim().slice(0,24)||'Wayfarer',x:0,z:57,hp:100,maxHp:100,mana:100,maxMana:100,stamina:100,xp:0,crowns:24,tonics:3,insight:0,learned:['tinder','mend','stoneward'],refinement:{tinder:12,mend:0,stoneward:0},blade:0,waylights:[],herbs:[],flags:{},academy:'untested',exam:null,examAttempts:0,offenses:0,fine:0,groveKills:0,fragments:[],kills:[],discovered:['village'],playtime:0,checkpoint:{x:0,z:57},route:'uncommitted',log:[],settings:{sound:true,speech:true,lowMotion:false,quality:'high',performance:'balanced'},chapterComplete:false}; }
export function normalize(text) {return String(text).toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
const numbers={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',won:'1',to:'2',too:'2',for:'4'};
export function parseIncantation(text, learned, isSage=false) {
  let t=normalize(text).replace(/level\s+(one|two|three|four|five|six|seven|eight|nine|ten|won|to|too|for)\b/g,(_,n)=>`level ${numbers[n]}`);
  t=t.replace(/stone\s*(ward|wall)/g,'stoneward').replace(/tender/g,'tinder').replace(/ember lands/g,'ember lance').replace(/star fall/g,'starfall').replace(/flame edge/g,'flame edge');
  const decl=t.match(/\blevel\s*(\d{1,2})\s+([a-z ]+)$/);
  if(!decl)return {ok:false,reason:'Finish with the spell’s level and name. For example: “Level one. Tinder.”'};
  const name=decl[2].trim().replace(/\s+(please|now)$/,'');
  const spell=SPELLS.find(s=>normalize(s.name)===name);
  if(!spell)return {ok:false,reason:`“${decl[2]}” is not a known declaration. Check the grimoire for the exact name.`};
  if(Number(decl[1])!==spell.level)return {ok:false,spell:spell.id,reason:`${spell.name} is a Level ${spell.level} pattern.`};
  if(!learned.includes(spell.id))return {ok:false,spell:spell.id,reason:`You have not learned ${spell.name} yet.`};
  const invocation=t.slice(0,decl.index);
  const matches=spell.anchors.filter(a=>invocation.includes(a)).length;
  if(!isSage && matches<2)return {ok:false,reason:`The invocation is incomplete. Include “${spell.anchors.join('” and “')}” before the declaration.`,spell:spell.id};
  return {ok:true,spell:spell.id,quality:1,reason:'Complete invocation · resonant release'};
}
export function potency(spellId, refinement=0, mode='voice') {return SPELL_BY_ID[spellId].power*(1+Math.min(100,Math.max(0,refinement))/100*3)*(mode==='voice'?1:0.65);}
export function manaCost(spellId, refinement=0) {return Math.max(1,Math.round(SPELL_BY_ID[spellId].mana*(1-Math.min(100,Math.max(0,refinement))*.0025)));}
export function rankFor(xp) {return [...RANKS].reverse().find(r=>xp>=r.xp)||RANKS[0];}
export function restoreState(raw) {
  if(!raw||raw.version!==1||typeof raw.name!=='string')throw new Error('This save belongs to a different chronicle.');
  const s={...newState(raw.name),...raw};
  for(const k of ['x','z','hp','mana','stamina','xp','crowns','tonics','playtime']) if(!Number.isFinite(s[k]))throw new Error('The save contains an invalid value.');
  s.x=Math.max(-116,Math.min(116,s.x));s.z=Math.max(-115,Math.min(112,s.z));
  s.learned=Array.isArray(raw.learned)?raw.learned.filter(x=>SPELL_BY_ID[x]&&SPELL_BY_ID[x].type!=='future'):['tinder','mend','stoneward'];
  s.exam=null; if(s.academy==='exam')s.academy='untested';
  s.hp=Math.max(1,Math.min(s.maxHp,s.hp));s.mana=Math.max(0,Math.min(s.maxMana,s.mana));
  s.settings={...newState().settings,...raw.settings};
  return s;
}
export function questList(s) { return [
  {id:'lights',title:'A light worth keeping',text:s.waylights.length<3?`Wake the three waylights on the academy road with Tinder. ${s.waylights.length}/3`:'The road is lit. Ilyra’s old magic is yours to refine.',done:s.waylights.length===3},
  {id:'path',title:'A door, or an open road',text:s.route==='uncommitted'?'Apply to Provost Cael at Lumen, or ask Sera to learn on the road.':s.route==='academy'?'Your place at Lumen is earned. Complete your field studies.':'Sera has welcomed you to the Unbound Road. Learn from the vale.',done:s.route!=='uncommitted'},
  {id:'grove',title:'The forest without a song',text:`Disperse three Empty Echoes in the Hushwood. ${Math.min(3,s.groveKills)}/3. Tend Tavi’s wound with Mend.`,done:s.groveKills>=3&&!!s.flags.courierHealed},
  {id:'record',title:'The sixth bell',text:s.flags.watchtower?'Return the watchtower record to Ilyra or Sera.':'Read the abandoned record at Northwatch Ruin.',done:!!s.flags.recordReturned},
  {id:'choir',title:'What the keeper kept',text:s.flags.bossDefeated?'The Bellkeeper has surrendered its last memory.':'Enter the Sunken Choir. Restore its three patterns and release the Bellkeeper.',done:!!s.flags.bossDefeated},
  {id:'gate',title:'The world beyond its edges',text:`Bring all three bell fragments to the Fifth-Year Gate. ${s.fragments.length}/3`,done:s.chapterComplete}
];}
export function dialogueFor(id,input,s) {
 const t=normalize(input), is=(r)=>r.test(t);
 if(is(/\b(hi|hello|hey|greetings)\b/)) return {text:'A quiet greeting still carries. What would you like to know?'};
 if(is(/\b(steal|rob|attack you)\b/)){return {action:'offense',text:'The Brass Compact records deliberate theft and threats. The town guard intervenes. Fifteen crowns in restitution will clear the active warrant; the record itself remains.'};}
 if(id==='merchant'){
  if(is(/\b(buy|purchase|tonic|potion)\b/))return {action:'buy',text:s.crowns>=12?'One field tonic. Twelve crowns. Keep it close.':'Twelve crowns, traveler. Gather moon flax or disperse the echoes and you can afford one.'};
  if(is(/trade|road|coast/))return {text:'The Saltglass Coast sends remedies north. The Cinder March sends tools. We send flax and wardwrights. A silent road is bad for everyone.'};
 }
 if(id==='examiner'){
  if(is(/pay|fine|restitution/))return {action:'fine',text:s.fine?(s.crowns>=s.fine?'Restitution is accepted. Your active warrant is cleared. Your history is recorded, but it need not define your next choice.':`Your restitution is ${s.fine} crowns. Return when you can pay it.`):'There is no active warrant against you.'};
  if(is(/record|crime/))return {text:`Your record shows ${s.offenses} recorded offense${s.offenses===1?'':'s'} and ${s.fine} crowns of unresolved restitution. Active warrants prevent admission.`};
  if(is(/graduat|complete|field stud/))return {action:'graduate',text:s.route!=='academy'?'Graduation is for enrolled students. Sera can award an independent Wayfarer seal.':s.flags.bossDefeated&&s.flags.courierHealed&&s.flags.recordReturned?'You have tended a life, read what others ignored, and resolved what force alone could not. Lumen recognizes you as a graduate.':`Your field studies are unfinished: ${!s.flags.courierHealed?'tend Tavi; ':''}${!s.flags.recordReturned?'return the watchtower record; ':''}${!s.flags.bossDefeated?'resolve the Sunken Choir':''}.`};
  if(is(/apply|exam|trial|reapply|join|admission/)){
   if(is(/explain|about|how|what/))return {text:'Precision: release Tinder three times at the focus in 35 seconds. Protection: remain near the focus and absorb three timed pulses with Stoneward. Composure: disperse the trial echo in 45 seconds. Earn at least 75 of 100. A current warrant blocks entry.'};
   if(s.route==='academy')return {text:'You are already admitted. Tend the courier, recover the Northwatch record, and resolve the Sunken Choir. Then ask me about graduation.'};
   if(s.fine)return {text:'Resolve your active warrant before applying. You may pay restitution here.'};
   return {action:'exam',text:'The trial focus stands at the center of the court. Precision first: release three Tinders at it within 35 seconds. Your mana and vitality will be restored between trials. Begin.'};
  }
 }
 if(id==='sera'){
  if(is(/road|learn|join|independent|failed|reject|mentor/))return {action:'road',text:s.route==='academy'?'Keep your academy place. You can learn from us too. The grove and the Northwatch record need attention, whatever seal you carry.':'Then the road is your classroom. I will teach you Rime. Tend Tavi east of town, clear the Hushwood, and read the record at Northwatch. Failure at one gate never means the world has closed.'};
  if(is(/seal|graduat/))return {action:'seal',text:s.flags.bossDefeated?'The Unbound Road recognizes deeds, not attendance. You have earned our Wayfarer seal. Keep learning from people who disagree with you.':'A seal should mean something. Resolve the Sunken Choir and come back.'};
 }
 if(id==='elian'){
  if(is(/enchant|flame edge|teach|learn/))return {action:'enchant',text:s.groveKills>=3?'You have held your nerve in the grove. Now learn to hold a pattern while your hands move. Flame Edge is yours. It will strengthen every sword strike for sixteen seconds.':'An enchantment follows a moving blade. Clear three echoes from the Hushwood first; then I will trust your control.'};
  if(is(/weapon|sword|class|blade/))return {text:'Press F to strike. A blade spends stamina, not mana. Close the distance, watch the enemy’s wind-up, and dodge before the ring fills. You can carry a sword and learn every school of magic.'};
 }
 if(id==='courier')return {text:s.flags.courierHealed?'Thank you. The package held a map of the old observatory. The Sunken Choir lies northeast of the grove. Its door listens for proof that the vale still has a voice.':'I cannot walk safely yet. Cast Mend while you are near me. I heard a voice beneath the grove saying the same sentence, over and over.'};
 if(is(/watchtower|northwatch|record|journal/))return s.flags.watchtower?{action:'record',text:'A sixth bell beneath the five. The observatory was listening to the Reach, and someone hid the evidence. Take this Thunder pattern. The Choir’s entrance will answer when the waylights and the grove are safe.'}:{text:'Northwatch is the broken tower northwest of the academy road. Its keeper wrote down sounds no one else would acknowledge. Read what she left there.'};
 if(is(/gate|reach|five year|ss|rank s/))return {text:'The old arch north of Lumen opens once every five years. Three bell fragments can make it answer: one from the waylights, one from the grove, and one from the custodian below. Beyond it, S-rank power is ordinary. Do not confuse that with an ordinary journey.'};
 if(is(/grove|hushwood|echo|forest/))return {text:'Follow the east road. Three Empty Echoes are feeding on the roots. Their attacks mark the ground before they land. Dodge out, then release your spell. Tavi is injured at the edge of that road.'};
 if(is(/magic|cast|voice|spell|tinder|invocation/))return {text:'Shape an invocation, then declare its level and name. Try: “Goddess of fire, lend me a spark to keep the darkness far. Level one. Tinder.” The grimoire records your patterns. Clear intent matters more than shouting.'};
 if(is(/waylight|lantern|light|begin|help|quest/))return {text:'Three waylights line the road north from Bellwether. Approach each, then cast Tinder. Their old glass will remember the flame. You may use the assisted first hotbar slot while learning the controls.'};
 if(is(/refine|refinement|power|level/))return {text:'A level measures complexity, not mastery. Refine a small spell until it is yours. Full refinement gives four times the original potency and reduces mana cost. Inert practice only carries you so far.'};
 if(is(/spirit|god|goddess/))return {text:'A prayer may focus a pattern without requiring an answer. Spirits can help, and some demand a price. You need no pact to use your own mana.'};
 if(is(/town|bell|why|happen|silence/))return {text:'The bells stopped before the people noticed the forest was quiet. Whatever waits below is borrowing resonance from everything around it. The town needs someone willing to listen closely.'};
 if(is(/who|name|yourself|story/))return {text:({ilyra:'Ilyra. I used to maintain Lumen’s emergency wards. Now I keep the road lit for people its gates leave outside.',sera:'Sera Venn. Failed student, competent traveler. The two are less contradictory than the academy would like.',examiner:'Cael, Provost of Lumen. I have seen what careless magic does to people who never consented to its risks.',elian:'Elian. These hands can no longer hold long invocations, but they remember the weight of a blade.'})[id]||'Someone who would like this town to hear its own bells again.'};
 return {text:'I do not have an answer to that. Ask me about the waylights, magic, the grove, Northwatch, or the five-year gate. The people here speak from what they know.'};
}
