import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GameEngine} from '../app/game/engine.js';
import {newState,parseIncantation,potency,dialogueFor,restoreState} from '../app/game/rules.js';
import {SPELLS} from '../app/game/data.js';
function harness(){
 const g=Object.create(GameEngine.prototype);
 Object.assign(g,{state:newState('Test traveler'),playing:true,paused:false,time:0,scene:new THREE.Scene(),enemies:[],telegraphs:[],cooldowns:{},keys:new Set(),objects:[],npcs:[],target:null,shield:0,shieldTime:0,dodgeTime:0,enchantTime:0,floaters:[],floatingText:[],player:new THREE.Group(),cb:{onTalk(){},onEnd(){},onStory(){},onHit(){}}});
 g.player.userData.leftArm=new THREE.Group();g.creature=()=>new THREE.Group();g.castVisual=()=>{};g.burst=()=>{};g.bolt=()=>{};g.sound=()=>{};g.emit=()=>{};g.save=()=>{};g.syncWorld=()=>{};g.message=()=>{};g.textAt=()=>{};
 return g;
}
function travel(g,x,z){g.state.x=x;g.state.z=z;g.state.mana=g.state.maxMana;g.cooldowns={};}
function cast(g,id){g.state.mana=g.state.maxMana;g.cooldowns={};return g.cast(id,'assisted');}
for(const sp of SPELLS.filter(s=>s.type!=='future')){
 assert.equal(parseIncantation(`${sp.invocation} Level ${sp.level}. ${sp.name}.`,[sp.id]).ok,true,sp.id);
 assert.equal(parseIncantation(`Level ${sp.level}. ${sp.name}.`,[sp.id]).ok,false);
}
assert.ok(potency('tinder',100)>potency('emberlance',0));
const g=harness();
for(let i=0;i<3;i++){
 const o={id:`light${i}`,kind:'waylight',x:4,z:34-i*13,mesh:new THREE.Group()};g.objects.push(o);travel(g,o.x,o.z+2);assert.equal(cast(g,'tinder').ok,true);
}
assert.equal(g.state.waylights.length,3);assert.deepEqual(g.state.fragments,['Hearth']);assert.ok(g.state.learned.includes('emberlance'));
g.talk('sera','I want to learn on the road');assert.equal(g.state.route,'road');assert.ok(g.state.learned.includes('rime'));
travel(g,37,16);cast(g,'mend');assert.equal(g.state.flags.courierHealed,true);
for(let i=0;i<3;i++){const e=g.spawnEnemy({id:`grove${i}`,x:55+i*4,z:4,hp:80});travel(g,e.x,e.z+4);while(e.hp>0)cast(g,'tinder');}
assert.equal(g.state.groveKills,3);assert.ok(g.state.fragments.includes('Breath'));
g.talk('elian','Teach me an enchantment');assert.ok(g.state.learned.includes('flameedge'));
g.near={id:'record',kind:'record'};g.interact();assert.equal(g.state.flags.watchtower,true);
g.talk('ilyra','I found the watchtower record');assert.equal(g.state.flags.recordReturned,true);assert.ok(g.state.learned.includes('thunder'));
g.near={id:'crypt',kind:'crypt'};g.interact();assert.equal(g.state.flags.cryptOpen,true);
for(const [i,spell] of ['tinder','mend','stoneward'].entries()){const o={id:`rune${i}`,kind:'rune',spell,x:58+i*8,z:-66,mesh:new THREE.Group()};g.objects.push(o);travel(g,o.x,o.z);cast(g,spell);}
assert.equal(g.state.flags.runes.length,3);const boss=g.enemies.find(e=>e.id==='bellkeeper');assert.ok(boss);travel(g,boss.x,boss.z+10);while(boss.hp>0)cast(g,'emberlance');assert.equal(g.state.flags.bossDefeated,true);assert.equal(g.state.fragments.length,3);assert.ok(g.state.learned.includes('starfall'));
g.near={id:'gate',kind:'gate'};g.interact();assert.equal(g.state.chapterComplete,true);const xp=g.state.xp;g.interact();assert.equal(g.state.xp,xp,'gate reward must not repeat');
g.talk('sera','Have I earned a seal?');assert.equal(g.state.flags.wayfarerSeal,true);
const exam=harness();exam.startExam();travel(exam,0,-18);cast(exam,'tinder');cast(exam,'tinder');cast(exam,'tinder');assert.equal(exam.state.exam.stage,1);
for(let i=0;i<3;i++){cast(exam,'stoneward');exam.state.exam.pulseTime=0;exam.tickExam(.01);}
assert.equal(exam.state.exam.stage,2);assert.equal(exam.state.exam.protected,3);const echo=exam.enemies.find(e=>e.id==='trial');travel(exam,echo.x,echo.z+5);while(echo.hp>0)cast(exam,'tinder');assert.equal(exam.state.route,'academy');assert.equal(exam.state.academy,'admitted');
const fail=harness();fail.startExam();fail.finishExam(false);assert.equal(fail.state.academy,'declined');fail.talk('sera','Let me learn on the road');assert.equal(fail.state.route,'road');fail.state.fine=15;assert.notEqual(dialogueFor('examiner','I want to apply',fail.state).action,'exam');fail.talk('examiner','Pay the fine');assert.equal(fail.state.fine,0);assert.equal(dialogueFor('examiner','I want to apply',fail.state).action,'exam');
assert.equal(restoreState({...newState(),academy:'exam',exam:{stage:1}}).academy,'untested');
console.log('PASS: complete independent chapter; all three academy trials; rejection and alternate progression; active warrants; all nine spell unlocks; rune puzzle; boss; gate reward; save recovery; mandatory novice invocation; refinement strength.');
