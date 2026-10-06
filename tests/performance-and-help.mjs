import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene,rng} from '../app/game/scene.js';
import {GameEngine} from '../app/game/engine.js';
import {addWorldDetail,createCharacter} from '../app/game/art-direction.js';
import {batchScenery,batchActor,profile} from '../app/game/performance.js';
import {parseIncantation,newState} from '../app/game/rules.js';
import {castingHelp,identifySpell} from '../app/game/casting-help.js';

const help=castingHelp('stoneward','Incomplete invocation');
assert.match(help.usage,/No target needed/);assert.match(help.invocation,/Patient earth.*harm.*Level 1. Stoneward/);assert.match(help.shortcut,/3/);
assert.equal(identifySpell('stonewall'),'stoneward');
assert.equal(parseIncantation('Patient earth, protect me from harm. Level one. Stonewall.',['stoneward']).ok,true);
assert.equal(parseIncantation('Level one. Stonewall.',['stoneward']).ok,false,'aliases must not bypass novice invocations');
assert.equal(parseIncantation('Patient earth, protect me from harm. Level two. Stoneward.',['stoneward']).spell,'stoneward');
assert.equal(parseIncantation('Patient earth, protect me from harm. Level one. Stoneward.',[]).ok,false);

// Exercise batching on the actual authored world, with only image IO stubbed.
const load=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
const world=Object.create(WorldScene.prototype);
Object.assign(world,{scene:new THREE.Scene(),renderer:{isSoftwareRenderer:false},matCache:new Map(),inkCache:new Map(),textures:new Map(),gradientMap:new THREE.Texture(),collisions:[],npcs:[],objects:[],decorations:[],floaters:[],banners:[],fx:[],random:rng()});
world.buildTerrain();world.buildWorld();addWorldDetail(world);world.buildNature();world.player=world.character(0x466b73,0xe3d8c2,true);world.scene.add(world.player);
const countMeshes=root=>{let n=0;root.traverse(o=>{if(o.isMesh)n++;});return n;};const actor=createCharacter(world,0x466b73,0xe3d8c2,true);const actorBefore=countMeshes(actor);batchActor(actor);const actorAfter=countMeshes(actor);assert.ok(actorAfter<actorBefore*.7);assert.equal(actor.userData.staff.children.length,9);
const tracked=[...world.objects.map(o=>o.mesh),...world.npcs.map(n=>n.mesh),...world.floaters,world.player];
const stats=batchScenery(world);assert.ok(stats.before>stats.after*2,JSON.stringify(stats));
for(const o of tracked){let parent=o;while(parent.parent)parent=parent.parent;assert.equal(parent,world.scene,'dynamic object must stay attached');}
assert.ok(world.player.userData.staff.children[1].material);
THREE.TextureLoader.prototype.load=load;

const originals={raf:globalThis.requestAnimationFrame,timeout:globalThis.setTimeout,document:globalThis.document};
globalThis.requestAnimationFrame=()=>1;globalThis.setTimeout=()=>1;globalThis.document={hidden:false};
let rendered=0,ticked=0;
const g=Object.create(GameEngine.prototype);Object.assign(g,{state:newState(),last:0,time:0,saveTime:0,uiTime:0,playing:true,paused:false,npcs:[],enemies:[],tick:()=>ticked++,updateEffects(){},cameraUpdate(){},renderWorld(){rendered++;},emit(){},save(){}});
g.frame(10);assert.equal(rendered,0,'balanced mode must respect 30 FPS budget');
g.frame(34);assert.equal(rendered,1);assert.ok(ticked>0);
for(const mode of ['paused','hidden','title']){g.paused=mode==='paused';g.playing=mode!=='title';document.hidden=mode==='hidden';const before=rendered,sim=ticked;g.frame(1000);assert.equal(rendered,before);assert.equal(ticked,sim);}
globalThis.requestAnimationFrame=originals.raf;globalThis.setTimeout=originals.timeout;globalThis.document=originals.document;
assert.equal(profile('battery').fps,24);assert.equal(profile('unknown').fps,30);
console.log(`PASS: static scenery ${stats.before} meshes → ${stats.after} batches (${Math.round((1-stats.after/stats.before)*100)}% fewer draw submissions for batched scenery); actor meshes ${actorBefore} → ${actorAfter}; frame budget; idle/background suspension; spell-specific help; aliases retain invocation and unlock rules.`);
