import {SPELLS,SPELL_BY_ID,HOTBAR} from './data.js';
export function identifySpell(text=''){
  const normalized=text.toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ');
  if(/stone\s*(wall|ward)/.test(normalized))return 'stoneward';
  return SPELLS.find(s=>normalized.includes(s.name.toLowerCase()))?.id;
}
export function castingHelp(id,reason=''){
  const s=SPELL_BY_ID[id];if(!s)return {reason,usage:'Hover or focus a spell below to see its invocation. Press K to open the grimoire.'};
  const key=HOTBAR.indexOf(id)+1;
  const usage=s.type==='shield'?'Protects you immediately for 6 seconds. No target needed; cast before an incoming hit.':s.type==='heal'?'Heals you immediately. Stand within 14 paces of Tavi to heal the courier.':s.type==='enchant'?'Enchants your sword for 16 seconds. Follow with F to strike.':`${s.description} Select an enemy with Tab or a click, then cast within ${s.range||0} paces.${id==='tinder'?' To light a waylight, stand within 9 paces.':''}`;
  return {spell:id,name:s.name,reason,invocation:`${s.invocation} Level ${s.level}. ${s.name}.`,usage,shortcut:key>0?`${key} · assisted cast (65% potency)`:null};
}
