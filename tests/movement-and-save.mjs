import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Locomotion,movementInput,slideMove,cameraArmLength,angleDelta} from '../app/game/movement.js';
import {GameEngine} from '../app/game/engine.js';
import {newState,restoreState,SAVE_KEY} from '../app/game/rules.js';

function travel(fps,keys){const motion=new Locomotion(),input=movementInput(new Set(keys),.4),s={x:0,z:0};for(let i=0;i<fps;i++){const d=motion.step(input,1/fps);s.x+=d.x;s.z+=d.z;}return Math.hypot(s.x,s.z);}
const reference=travel(60,['w']);
for(const fps of [24,30,60,144]){assert.ok(Math.abs(travel(fps,['w'])-reference)<1e-8,'speed must not depend on FPS');assert.ok(Math.abs(travel(fps,['w','d'])-reference)<1e-8,'diagonals must not be faster');}
const mover=new Locomotion();for(let i=0;i<60;i++)mover.step({x:0,z:-1,active:true},1/60);
let stoppingDistance=0;for(let i=0;i<15;i++){const d=mover.step({x:0,z:0,active:false},1/60);stoppingDistance+=Math.hypot(d.x,d.z);}assert.ok(stoppingDistance<.13,'no long slippery stopping drift');assert.equal(mover.x,0);assert.equal(mover.z,0);
const wall={x:0,z:0,w:1,d:4,h:6},s={x:-2,z:0};slideMove(s,8,2,[wall]);assert.ok(s.x<=-1);assert.ok(s.z>1.9,'slide along a wall instead of sticking');
const pillar={x:0,z:0,w:.4,d:.4,h:5},dodge={x:-3,z:0};slideMove(dodge,8,0,[pillar]);assert.ok(dodge.x<=-.4,'fast dodges cannot tunnel through a pillar');
const arm=cameraArmLength({x:0,y:1.55,z:5},{x:0,y:0,z:-1},9,[wall]);assert.ok(arm>0&&arm<1,'camera must stop in front of architecture');
assert.equal(cameraArmLength({x:0,y:8,z:5},{x:0,y:0,z:-1},9,[wall]),9,'camera above the building remains free');
assert.ok(Math.abs(angleDelta(Math.PI-.01,-Math.PI+.01)-.02)<1e-9);

const original=globalThis.localStorage;const memory=new Map();globalThis.localStorage={setItem:(key,value)=>memory.set(key,value),getItem:key=>memory.get(key)};
const engine=Object.create(GameEngine.prototype);Object.assign(engine,{state:newState('Save test'),player:new THREE.Group(),yaw:.8,pitch:.4,zoom:7,cb:{},message(){},emit(){}});
engine.state.x=12;engine.state.z=31;engine.state.crowns=82;engine.state.learned.push('gale');engine.state.flags.watchtower=true;engine.state.academy='exam';engine.state.exam={stage:1};engine.player.rotation.y=1.1;
assert.equal(engine.save(),true);const restored=restoreState(JSON.parse(memory.get(SAVE_KEY)));assert.equal(restored.x,12);assert.equal(restored.z,31);assert.equal(restored.crowns,82);assert.ok(restored.learned.includes('gale'));assert.ok(restored.flags.watchtower);assert.equal(restored.camera.yaw,.8);assert.equal(restored.camera.facing,1.1);assert.ok(restored.savedAt);assert.equal(restored.exam,null);assert.equal(restored.academy,'untested');
const prior=memory.get(SAVE_KEY);globalThis.localStorage.setItem=()=>{throw new Error('Quota exceeded');};assert.equal(engine.save(),false);assert.equal(engine.saveError,true);assert.equal(memory.get(SAVE_KEY),prior,'failed writes must preserve the previous save');globalThis.localStorage=original;
console.log('PASS: equal travel at 24/30/60/144 FPS; diagonal normalization; quick braking; wall sliding; dodge collision; camera obstruction; shortest-angle turns; save/restore progression and camera; exam reset; failed-save preservation.');
