import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene} from '../app/game/scene.js';
import {createCharacter} from '../app/game/character-art.js';
import {batchActor} from '../app/game/performance.js';
const w=Object.create(WorldScene.prototype);
Object.assign(w,{renderer:{isSoftwareRenderer:false},matCache:new Map(),inkCache:new Map(),gradientMap:new THREE.Texture()});
function vertices(root){
  root.updateMatrixWorld(true);let count=0,x=0,y=0,z=0,meshes=0;const p=new THREE.Vector3();
  root.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes.position,ind=o.geometry.index;
    for(let i=0;i<(ind?.count||a.count);i++){p.fromBufferAttribute(a,ind?ind.getX(i):i).applyMatrix4(o.matrixWorld);assert.ok(Number.isFinite(p.x+p.y+p.z));x+=p.x;y+=p.y;z+=p.z;count++;}
  });return {count,x,y,z,meshes};
}
let playerStats;
for(const id of ['player','ilyra','examiner','sera','elian','merchant','courier']){
  const actor=createCharacter(w,0x234f61,0xe8e5ed,id==='player',id);
  const body=actor.getObjectByName('Sculpted torso');body.geometry.computeBoundingBox();const size=body.geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(size.z>.38&&size.z/size.x>.65,'torso must have a full side profile');
  assert.equal(actor.userData.lineage,'human');
  actor.position.set(3,.5,-2);actor.rotation.y=.61;
  const rig=['leftLeg','rightLeg','leftArm','rightArm','cape'];
  for(const [i,key] of rig.entries())actor.userData[key].rotation.x=(i-2)*.17;
  const before=vertices(actor);const handles=rig.map(k=>actor.userData[k]);
  batchActor(actor);const after=vertices(actor);assert.equal(after.count,before.count);
  for(const k of ['x','y','z'])assert.ok(Math.abs(after[k]-before[k])<.02,`${id}: batching must preserve posed vertices`);
  handles.forEach((h,i)=>assert.equal(actor.userData[rig[i]],h));
  assert.ok(after.count/3<7200,'keep the character geometry bounded');
  assert.ok(after.meshes<=48,'retain a small material batch budget');
  if(id==='player'){assert.equal(actor.userData.staff.children.length,9);assert.ok(actor.userData.staff.children[1].material);playerStats={triangles:after.count/3,meshes:after.meshes};}
}
console.log('PASS: all seven human models; full torso depth; finite geometry; transformed/posed batching; animation pivots; staff crystal; bounded geometry.',playerStats);
