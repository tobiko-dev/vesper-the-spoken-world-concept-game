import * as THREE from 'three';
import { WorldScene } from './scene.js';
import {profile} from './performance.js';
import {Locomotion,movementInput,slideMove,damp,angleDelta,cameraArmLength} from './movement.js';
import {castingHelp} from './casting-help.js';
import { SPELL_BY_ID, HOTBAR, LOCATIONS, NPCS } from './data.js';
import {newState, restoreState, manaCost, potency, rankFor, dialogueFor, SAVE_KEY} from './rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class GameEngine extends WorldScene {
 constructor(canvas,callbacks,initial){
  super(canvas,initial?.settings?.quality);this.cb=callbacks;this.state=initial?restoreState(initial):newState();this.playing=false;this.paused=false;this.keys=new Set();this.time=0;this.uiTime=0;this.saveTime=0;this.yaw=Number.isFinite(this.state.camera?.yaw)?this.state.camera.yaw:0;this.pitch=Math.max(.18,Math.min(.96,this.state.camera?.pitch||.34));this.zoom=Math.max(5,Math.min(19,this.state.camera?.zoom||8.8));this.motion=new Locomotion();this.viewYaw=this.yaw;this.viewPitch=this.pitch;this.viewZoom=this.zoom;this.armLength=this.zoom;this.cameraOrigin=new THREE.Vector3();this.cameraDirection=new THREE.Vector3();this.cooldowns={};this.enemies=[];this.telegraphs=[];this.labels=[];this.target=null;this.shield=0;this.shieldTime=0;this.dodgeTime=0;this.enchantTime=0;this.near=null;this.area='Bellwether';this.disposed=false;this.last=performance.now();this.listeners=[];this.floatingText=[];this.dungeonEntered=!!this.state.flags.cryptOpen;
  this.player.position.set(this.state.x,0,this.state.z);this.player.rotation.y=Number.isFinite(this.state.camera?.facing)?this.state.camera.facing:0;this.seedEnemies();this.syncWorld();this.configurePerformance(this.state.settings.performance);this.attach(canvas);this.frame=this.frame.bind(this);this.frameId=requestAnimationFrame(this.frame);this.emit();
 }
 listen(target,name,fn,opts){target.addEventListener(name,fn,opts);this.listeners.push(()=>target.removeEventListener(name,fn,opts));}
 attach(canvas){
  this.listen(window,'resize',()=>this.resize());this.listen(window,'blur',()=>{this.keys.clear();this.motion.stop();this.drag=null;});this.listen(window,'pagehide',()=>{if(this.playing)this.save();});this.listen(window,'beforeunload',()=>{if(this.playing)this.save();});this.listen(document,'visibilitychange',()=>{if(document.hidden){this.keys.clear();this.motion.stop();this.drag=null;if(this.playing)this.save();}});
  this.listen(window,'keydown',e=>{if(!this.playing||this.paused||['INPUT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k))e.preventDefault();this.keys.add(k);if(e.repeat)return;if(/^[1-9]$/.test(k))this.cast(HOTBAR[+k-1],'assisted');if(k==='f')this.strike();if(k==='shift'||k===' ')this.dodge();if(k==='r')this.tonic();if(k==='e'||k==='enter')this.interact();if(k==='v')this.cb.onVoice?.();if(k==='j')this.cb.onOverlay('journal');if(k==='k')this.cb.onOverlay('grimoire');if(k==='m')this.cb.onOverlay('atlas');if(k==='escape')this.cb.onOverlay('settings');if(k==='tab')this.cycleTarget();});
  this.listen(window,'keyup',e=>this.keys.delete(e.key.toLowerCase()));
  this.listen(canvas,'contextmenu',e=>e.preventDefault());
  this.listen(canvas,'pointerdown',e=>{if(!this.playing||this.paused)return;if(e.button===2||e.pointerType==='touch'){this.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}else if(e.button===0){const rect=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);const hit=ray.intersectObjects(this.enemies.filter(e=>e.hp>0).map(e=>e.mesh),true)[0];if(hit){let o=hit.object;while(o&&!o.userData.enemy)o=o.parent;if(o)this.target=o.userData.enemy;}}});
  this.listen(canvas,'pointermove',e=>{if(this.drag){this.yaw-=(e.clientX-this.drag.x)*.0045;this.pitch=Math.max(.18,Math.min(.96,this.pitch+(e.clientY-this.drag.y)*.003));this.drag={x:e.clientX,y:e.clientY};}});
  this.listen(canvas,'pointerup',()=>{this.drag=null;});this.listen(canvas,'pointercancel',()=>{this.drag=null;});this.listen(canvas,'wheel',e=>{if(this.playing&&!this.paused){e.preventDefault();this.zoom=Math.max(5,Math.min(19,this.zoom+e.deltaY*.008));}},{passive:false});
 }
 start(name){if(name)this.state.name=name.trim().slice(0,24)||'Wayfarer';this.playing=true;this.paused=false;this.audioInit();this.message('The Quiet Between Bells','Find Ilyra by the well. The road ahead is yours to choose.');this.save();this.emit();}
 seedEnemies(){
  const defs=[{id:'grove0',x:55,z:1,hp:82},{id:'grove1',x:69,z:7,hp:95},{id:'grove2',x:61,z:-12,hp:110},{id:'roam0',x:-41,z:-44,hp:100},{id:'roam1',x:37,z:-65,hp:120}];for(const d of defs){if(!this.state.kills.includes(d.id))this.spawnEnemy(d);}
  if(this.state.flags.runes?.length===3&&!this.state.flags.bossDefeated)this.spawnBoss();
 }
 spawnEnemy(d){const e={...d,maxHp:d.hp,kind:d.kind||'echo',home:{x:d.x,z:d.z},cooldown:2+Math.random()*2,slow:0,aggro:false,dead:false};e.mesh=this.creature(e.kind);e.mesh.position.set(e.x,0,e.z);e.mesh.userData.enemy=e;this.scene.add(e.mesh);this.enemies.push(e);return e;}
 spawnBoss(){if(this.enemies.some(e=>e.id==='bellkeeper'&&!e.dead))return;this.spawnEnemy({id:'bellkeeper',name:'The Bellkeeper',kind:'boss',x:66,z:-82,hp:520});this.message('The keeper stirs','A voice repeats beneath the stone: “Please remember her.”');}
 syncWorld(){for(const o of this.objects){if(o.kind==='waylight'&&this.state.waylights.includes(o.id)){o.name='Awakened waylight';o.flame.material=this.material(0xffd19a,{emissive:0xff972c,emissiveIntensity:1.7});}if(o.kind==='herb'&&this.state.herbs.includes(o.id))o.mesh.visible=false;if(o.kind==='rune'&&this.state.flags.runes?.includes(o.id)){o.flame.material=this.material(0xd9d6ac,{emissive:0x8fcbb8,emissiveIntensity:1.2});}if(o.kind==='crypt')o.mesh.visible=!this.state.flags.cryptOpen;if(o.kind==='gate'&&this.state.chapterComplete)o.flame.material=this.material(0xf4d38a,{emissive:0xffdb8c,emissiveIntensity:2,transparent:true,opacity:.8,side:THREE.DoubleSide});}}
 audioInit(){if(this.audio)return;try{this.audio=new(window.AudioContext||window.webkitAudioContext)();this.audio.resume();}catch{}}
 sound(freq=440,duration=.2,type='sine',volume=.08){if(!this.state.settings.sound)return;this.audioInit();if(!this.audio)return;const a=this.audio,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.7,a.currentTime+duration);g.gain.setValueAtTime(.001,a.currentTime);g.gain.exponentialRampToValueAtTime(volume,a.currentTime+.01);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration+.02);}
 message(title,text='',kind='info'){this.cb.onMessage?.({title,text,kind,id:Date.now()+Math.random()});this.state.log.unshift({title,text,time:Math.floor(this.state.playtime)});this.state.log=this.state.log.slice(0,40);}
 textAt(text,x,z,color='#ffecb4',y=2.8){this.floatingText.push({id:Math.random(),text,x,y,z,color,life:1.5});}
 save(){if(this.skipSave)return false;try{const savedAt=Date.now();const camera={yaw:this.yaw,pitch:this.pitch,zoom:this.zoom,facing:this.player.rotation.y};localStorage.setItem(SAVE_KEY,JSON.stringify({...this.state,savedAt,camera,exam:null,academy:this.state.academy==='exam'?'untested':this.state.academy}));this.state.savedAt=savedAt;this.saveError=false;return true;}catch{if(!this.saveError)this.message('Progress could not be saved','This browser’s local storage is unavailable. Keep this tab open.','error');this.saveError=true;return false;}}
 manualSave(){const ok=this.save();this.message(ok?'Chronicle saved':'Save unavailable',ok?'Your latest progress is saved in this browser.':'Browser storage could not be written. Keep this tab open.',ok?'info':'error');this.emit();}
 emit(){const s=this.state;this.cb.onUpdate({...s,flags:{...s.flags},refinement:{...s.refinement},cooldowns:{...this.cooldowns},rank:rankFor(s.xp),shield:this.shield,shieldTime:this.shieldTime,enchantTime:this.enchantTime,area:this.area,near:this.near?{id:this.near.id,name:this.near.name,kind:this.near.kind||'npc'}:null,target:this.target&&this.target.hp>0?{name:this.target.name||'Empty Echo',hp:this.target.hp,maxHp:this.target.maxHp,kind:this.target.kind}:null,labels:this.screenLabels(),lastCast:this.lastCast,compatibilityGraphics:!!this.renderer.isSoftwareRenderer,saveError:this.saveError,exam:s.exam?{...s.exam}:null});}
 screenLabels(){const out=[],w=this.renderer.domElement.clientWidth,h=this.renderer.domElement.clientHeight;const add=(id,x,y,z,data)=>{const v=new THREE.Vector3(x,y,z).project(this.camera);if(v.z<1&&v.z>-1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.15)out.push({id,left:(v.x*.5+.5)*w,top:(-v.y*.5+.5)*h,...data});};
  for(const n of this.npcs)if(distance(n,this.state)<18)add(n.id,n.x,2.6,n.z,{name:n.name,subtitle:n.title,type:'npc'});
  for(const e of this.enemies)if(e.hp>0&&distance(e,this.state)<34)add(e.id,e.x,e.kind==='boss'?6:2.6,e.z,{name:e.name||'Empty Echo',hp:e.hp,maxHp:e.maxHp,type:'enemy',selected:e===this.target});
  for(const t of this.floatingText)add(t.id,t.x,t.y+(1.5-t.life),t.z,{text:t.text,color:t.color,type:'float'});
  return out;
 }
 frame(now){
  if(this.disposed)return;
  const idle=!this.playing||this.paused||document.hidden;
  if(idle){this.last=now;this.frameDue=undefined;this.frameTimer=setTimeout(()=>{this.frameId=requestAnimationFrame(this.frame);},200);return;}
  const preset=profile(this.state.settings.performance),interval=1000/preset.fps;
  const due=this.frameDue??(this.last+interval);
  if(now<due-.5){this.frameId=requestAnimationFrame(this.frame);return;}
  this.frameDue=now+interval-Math.max(0,(now-due)%interval);
  const dt=Math.min(.1,(now-this.last)/1000);this.last=now;this.time+=dt;
  // Small simulation steps preserve movement and enemy telegraphs at lower FPS.
  for(let left=dt;left>0;){const step=Math.min(1/30,left);this.tick(step);left-=step;}
  this.state.playtime+=dt;this.saveTime+=dt;if(this.saveTime>10){this.save();this.saveTime=0;}
  this.updateEffects(dt,this.time);this.cameraUpdate(dt);
  for(const n of this.npcs)n.mesh.visible=distance(n,this.state)<65;
  for(const e of this.enemies)e.mesh.visible=e.hp>0&&distance(e,this.state)<65;
  const begin=performance.now();this.renderWorld();const cost=performance.now()-begin;
  this.renderCost=this.renderCost===undefined?cost:this.renderCost*.94+cost*.06;
  if((this.performanceFrames=(this.performanceFrames||0)+1)%90===0){const old=this.resolutionScale||1;this.resolutionScale=Math.max(.55,Math.min(1,old+(this.renderCost>interval*.8?-.1:this.renderCost<interval*.4?.05:0)));if(old!==this.resolutionScale)this.resize();}
  this.uiTime+=dt;if(this.uiTime>.20){this.emit();this.uiTime=0;}this.frameId=requestAnimationFrame(this.frame);
 }
 tick(dt){const s=this.state;for(const k in this.cooldowns)this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);this.shieldTime=Math.max(0,this.shieldTime-dt);if(!this.shieldTime)this.shield=0;this.dodgeTime=Math.max(0,this.dodgeTime-dt);this.enchantTime=Math.max(0,this.enchantTime-dt);
  const inCombat=this.enemies.some(e=>e.hp>0&&e.aggro&&distance(e,s)<30);s.mana=Math.min(s.maxMana,s.mana+dt*(inCombat?3.2:9));s.stamina=Math.min(100,s.stamina+dt*17);if(!inCombat&&!s.exam)s.hp=Math.min(s.maxHp,s.hp+dt*1.2);
  if(this.keys.has('q'))this.yaw+=dt*1.6;if(this.keys.has('e')&&!this.near)this.yaw-=dt*1.6;
  const motion=this.motion||(this.motion=new Locomotion());
  const input=movementInput(this.keys,this.viewYaw??this.yaw);if(input.active)this.moveDir={x:input.x,z:input.z};
  const beforeX=s.x,beforeZ=s.z;
  if(this.dodgeTime>0&&this.dodgeDir){this.move(this.dodgeDir.x*17*dt,this.dodgeDir.z*17*dt);motion.stop();}
  else {const delta=motion.step(input,dt);this.move(delta.x,delta.z);}
  const travel=Math.hypot(s.x-beforeX,s.z-beforeZ),gait=motion.gait(travel,dt);
  if(travel>.0001){const goal=Math.atan2(s.x-beforeX,s.z-beforeZ);this.player.rotation.y+=angleDelta(this.player.rotation.y,goal)*(1-Math.exp(-24*dt));}
  const rig=this.player.userData;
  rig.leftLeg.rotation.x=damp(rig.leftLeg.rotation.x,gait.swing,28,dt);rig.rightLeg.rotation.x=damp(rig.rightLeg.rotation.x,-gait.swing,28,dt);
  if((this.cooldowns.blade||0)<.35)rig.leftArm.rotation.x=damp(rig.leftArm.rotation.x,-gait.swing*.55,20,dt);
  if(!this.castPose&&rig.rightArm)rig.rightArm.rotation.x=damp(rig.rightArm.rotation.x,gait.swing*.16,20,dt);
  rig.cape.rotation.x=damp(rig.cape.rotation.x,-.06-gait.blend*.13,12,dt);
  this.player.position.set(s.x,this.dodgeTime>0?Math.sin(this.dodgeTime/.48*Math.PI)*.18:gait.bob,s.z);
  this.player.userData.staff.children[1].material=this.enchantTime>0?this.material(0xf5a762,{emissive:0xff5522,emissiveIntensity:1}):this.material(0x8ad6dc,{emissive:0x499aa7,emissiveIntensity:.7});
  this.near=[...this.npcs,...this.objects.filter(o=>o.mesh.visible&&o.kind!=='focus'&&o.kind!=='rune')].filter(o=>distance(o,s)<3.7).sort((a,b)=>distance(a,s)-distance(b,s))[0]||null;
  let loc=LOCATIONS.reduce((best,l)=>distance(l,s)<distance(best,s)?l:best,LOCATIONS[0]);if(distance(loc,s)<30){if(this.area!==loc.name){this.area=loc.name;this.cb.onArea?.({title:loc.name,subtitle:loc.subtitle});}if(!s.discovered.includes(loc.id)){s.discovered.push(loc.id);this.gain(8);}}
  if(s.z<-56&&s.x>43&&s.x<88&&!s.flags.cryptOpen){s.z=-53;this.message('The Choir is sealed','Wake the waylights, clear the grove, and read the Northwatch record.');}
  this.tickEnemies(dt);this.tickTelegraphs(dt);this.tickExam(dt);if(this.target?.hp<=0)this.target=null;if(this.target&&distance(this.target,s)>40)this.target=null;
  this.targetRing.visible=!!this.target;if(this.target)this.targetRing.position.set(this.target.x,.09,this.target.z);
  for(let i=this.floatingText.length-1;i>=0;i--){this.floatingText[i].life-=dt;if(this.floatingText[i].life<=0)this.floatingText.splice(i,1);}
 }
 move(dx,dz){slideMove(this.state,dx,dz,this.collisions);}
 cameraUpdate(dt){
  const s=this.state;if(!this.playing)return;
  this.viewYaw+=angleDelta(this.viewYaw,this.yaw)*(1-Math.exp(-24*dt));
  this.viewPitch=damp(this.viewPitch,this.pitch,20,dt);this.viewZoom=damp(this.viewZoom,this.zoom,14,dt);
  const focus=this.cameraOrigin.set(s.x,1.55,s.z),dir=this.cameraDirection.set(Math.sin(this.viewYaw)*Math.cos(this.viewPitch),Math.sin(this.viewPitch),Math.cos(this.viewYaw)*Math.cos(this.viewPitch));
  const allowed=cameraArmLength(focus,dir,this.viewZoom,this.collisions);
  this.armLength=allowed<this.armLength?allowed:damp(this.armLength,allowed,10,dt);
  // Translate with the character directly; smooth orbit/zoom separately so
  // walking never makes the camera trail behind and then catch up at a stop.
  this.camera.position.copy(focus).addScaledVector(dir,this.armLength);this.camera.lookAt(focus);
 }
 gain(xp){const before=rankFor(this.state.xp).name;this.state.xp+=xp;const after=rankFor(this.state.xp).name;if(before!==after){this.state.maxHp+=15;this.state.maxMana+=15;this.state.hp=this.state.maxHp;this.state.mana=this.state.maxMana;this.message(`Rank ${after} · ${rankFor(this.state.xp).title}`,'Your capacity has grown. Your techniques are still yours to refine.');this.sound(660,.7);}}
 learn(id){if(this.state.learned.includes(id))return;this.state.learned.push(id);this.state.refinement[id]=0;this.message(`New pattern · ${SPELL_BY_ID[id].name}`,`Level ${SPELL_BY_ID[id].level} · Read the invocation in your grimoire.`);this.sound(880,.45);}
 refine(id,amount=2,training=false){const current=this.state.refinement[id]||0;if(training&&current>=30)return;this.state.refinement[id]=Math.min(training?30:100,current+amount);}
 cast(id,mode='assisted'){
  const s=this.state,sp=SPELL_BY_ID[id];if(!this.playing||this.paused)return {ok:false,reason:'The world is paused.'};const fail=(reason,extra={})=>{this.cb.onCastHelp?.({...castingHelp(id,reason),...extra});return {ok:false,reason};};if(!sp||!s.learned.includes(id)){this.message('An unfamiliar pattern',sp?.unlock||'You have not learned that spell.');return fail(sp?.unlock||'Spell not learned.');}if(this.cooldowns[id]>0){return fail('This spell is recovering.',{cooldown:id});}const cost=manaCost(id,s.refinement[id]);if(s.mana<cost){this.message('Not enough mana','Breathe. Mana recovers naturally, or rest at the hearthstone.');return fail(`Needs ${cost} mana; you have ${Math.floor(s.mana)}. Wait for mana to recover, press R for a tonic, or rest at the hearthstone.`);}
  this.cb.onCastHelp?.(null);this.lastCast={name:sp.name,level:sp.level,mode,time:this.time};this.castVisual?.(sp.color,sp.level);s.mana-=cost;this.cooldowns[id]=sp.cooldown;const power=potency(id,s.refinement[id],mode);let effective=false;
  const rune=this.objects.filter(o=>o.kind==='rune'&&distance(o,s)<7&&!s.flags.runes?.includes(o.id)).sort((a,b)=>distance(a,s)-distance(b,s))[0];
  if(rune&&s.flags.cryptOpen){if(rune.spell===id){s.flags.runes=[...(s.flags.runes||[]),rune.id];this.message('A pattern restored',`${s.flags.runes.length} of 3 resonances. ${rune.name} answers.`);this.burst(rune.x,2,rune.z,0xcbdcc0,26);effective=true;if(s.flags.runes.length===3)this.spawnBoss();this.syncWorld();}else this.message('The stone holds its silence',rune.spell==='tinder'?'“Fire wakes it.”':rune.spell==='mend'?'“Water names it.”':'“Stone remembers.”');}
  if(sp.type==='heal'){const hp=s.hp;s.hp=Math.min(s.maxHp,s.hp+power);effective=effective||s.hp>hp;this.textAt(`+${Math.round(s.hp-hp)}`,s.x,s.z,'#a4e0ba');const t=NPCS.find(n=>n.id==='courier');if(!s.flags.courierHealed&&distance(t,s)<sp.range){s.flags.courierHealed=true;this.message('A voice returned','Tavi’s wound closes. “The old observatory. That is where the sound went.”');this.gain(45);s.crowns+=14;effective=true;}this.burst(s.x,1.5,s.z,0x89e7b9,22);}
  else if(sp.type==='shield'){this.shield=power;this.shieldTime=6;this.textAt('WARD',s.x,s.z,'#e4d6a4');this.burst(s.x,1,s.z,0xd7c795,22);}
  else if(sp.type==='enchant'){this.enchantTime=16;this.burst(s.x,1.4,s.z,0xffb064,24);effective=true;this.message('Flame Edge','Your next sixteen seconds of sword strikes carry fire.');}
  else {
   const light=id==='tinder'?this.objects.find(o=>o.kind==='waylight'&&!s.waylights.includes(o.id)&&distance(o,s)<9):null;
   if(light){s.waylights.push(light.id);this.bolt(this.player.position.clone().add(new THREE.Vector3(.5,2,0)),new THREE.Vector3(light.x,2.5,light.z),0xffba67);this.burst(light.x,2.5,light.z,0xffc77e,28);this.message('A waylight remembers',`${s.waylights.length} of 3 waylights awakened.`);effective=true;if(s.waylights.length===3){s.fragments.push('Hearth');this.gain(65);s.crowns+=18;this.learn('gale');this.learn('emberlance');this.message('The Hearth fragment','One bell fragment answers from within the flame. The academy road is safe.');}this.syncWorld();}
   else if(s.exam?.stage===0&&id==='tinder'&&distance({x:0,z:-22},s)<20){s.exam.hits++;this.burst(0,2,-22,0xf0bb79);this.textAt(`${s.exam.hits} / 3`,0,-22);effective=true;if(s.exam.hits>=3)this.nextTrial();}
   else {let target=this.target&&this.target.hp>0&&distance(this.target,s)<=sp.range?this.target:this.enemies.filter(e=>e.hp>0&&distance(e,s)<=sp.range).sort((a,b)=>distance(a,s)-distance(b,s))[0];
    if(target){this.target=target;effective=true;const targets=sp.type==='area'?this.enemies.filter(e=>e.hp>0&&distance(e,target)<8):[target];for(const e of targets){this.damageEnemy(e,power,id);if(sp.type==='slow')e.slow=4;if(sp.type==='push'){const d=Math.max(.1,distance(e,s));e.x+=(e.x-s.x)/d*5;e.z+=(e.z-s.z)/d*5;e.cooldown=3;this.telegraphs=this.telegraphs.filter(t=>{if(t.owner===e){this.scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();return false;}return true;});}}
     this.bolt(this.player.position.clone().add(new THREE.Vector3(.5,2,0)),new THREE.Vector3(target.x,target.kind==='boss'?3:1.5,target.z),sp.color);this.burst(target.x,1.5,target.z,sp.color,sp.type==='area'?44:16);
    }else if(distance({x:0,z:-22},s)<18){this.refine(id,1,true);this.burst(0,2,-22,sp.color);this.textAt('PRACTICE',0,-22,'#a6dcd1');}
    else{this.burst(s.x-Math.sin(this.yaw)*4,1.8,s.z-Math.cos(this.yaw)*4,sp.color,12);this.textAt('NO TARGET',s.x,s.z,'#c9d5cb');this.cb.onCastHelp?.(castingHelp(id,`No target in range. This cast used ${cost} mana. Move within ${sp.range} paces of an enemy, or use the academy focus for practice.`));}
   }
  }
  if(effective)this.refine(id,mode==='voice'?3:2);this.sound(sp.school==='Ember'?180:sp.school==='Tide'?600:350,.25,sp.school==='Ember'?'triangle':'sine');this.emit();return {ok:true,spell:id,power:Math.round(power),mode};
 }
 strike(){if(!this.playing||this.paused||this.cooldowns.blade>0)return;if(this.state.stamina<14){this.message('Catch your breath','Your blade needs stamina.');return;}this.state.stamina-=14;this.cooldowns.blade=.65;const e=this.enemies.filter(e=>e.hp>0&&distance(e,this.state)<3.8).sort((a,b)=>distance(a,this.state)-distance(b,this.state))[0];if(e){this.target=e;this.damageEnemy(e,19*(1+this.state.blade*.02)+(this.enchantTime>0?potency('flameedge',this.state.refinement.flameedge,'assisted'):0));this.state.blade=Math.min(100,this.state.blade+1);this.burst(e.x,1.3,e.z,this.enchantTime>0?0xffad65:0xe8e6d0,12);if(this.enchantTime>0)this.refine('flameedge',1);}this.player.userData.leftArm.rotation.x=-1.5;this.sound(130,.12,'triangle');}
 dodge(){if(!this.playing||this.paused||this.state.stamina<28||this.dodgeTime>0)return;this.state.stamina-=28;this.dodgeTime=.48;const input=movementInput(this.keys,this.viewYaw??this.yaw);this.dodgeDir=input.active?{x:input.x,z:input.z}:{x:Math.sin(this.player.rotation.y),z:Math.cos(this.player.rotation.y)};this.sound(220,.12);}
 tonic(){if(this.paused)return;if(this.state.tonics<=0){this.message('No tonics left','Neris sells field tonics for twelve crowns.');return;}if(this.state.hp>=this.state.maxHp){this.message('You are unhurt','Keep the tonic for when you need it.');return;}this.state.tonics--;this.state.hp=Math.min(this.state.maxHp,this.state.hp+60);this.textAt('+60',this.state.x,this.state.z,'#a4e0ba');this.sound(600,.3);}
 damageEnemy(e,amount,spell){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.aggro=true;this.textAt(`${Math.round(amount)}`,e.x,e.z,spell?SPELL_BY_ID[spell].color:'#fff0cc',e.kind==='boss'?4:2);if(e.hp<=0)this.kill(e);}
 kill(e){e.dead=true;e.mesh.visible=false;this.burst(e.x,1.5,e.z,e.kind==='boss'?0xe5c892:0xa5dce0,40);this.telegraphs=this.telegraphs.filter(t=>{if(t.owner===e){this.scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();return false;}return true;});if(e.id==='trial'){if(this.state.exam)this.nextTrial();return;}
  this.state.kills.push(e.id);this.state.crowns+=e.kind==='boss'?60:10;this.gain(e.kind==='boss'?200:35);if(e.id.startsWith('grove')){this.state.groveKills++;if(this.state.groveKills===3){this.state.fragments.push('Breath');this.message('The Breath fragment','The grove remembers the wind. A second fragment settles in your hand.');}}
  if(e.kind==='boss'){this.state.flags.bossDefeated=true;this.state.fragments.push('Memory');this.learn('starfall');this.message('A voice finally rests','“Can the stars hear me?” The last memory becomes a bell fragment. Return to the Fifth-Year Gate.');this.cb.onStory?.({title:'What the keeper kept',text:'The machine unfolds its last instruction. Not a weapon. Not a prophecy. A child’s voice asks whether the stars can hear her. You let the memory finish. For the first time in centuries, the keeper no longer needs to answer.',footer:'Memory fragment recovered · Starfall learned'});}this.save();}
 hitPlayer(amount){if(this.dodgeTime>0){this.textAt('EVADE',this.state.x,this.state.z,'#ace3df');return false;}let remaining=amount;if(this.shield>0){const absorbed=Math.min(remaining,this.shield);this.shield-=absorbed;remaining-=absorbed;this.textAt(`WARD −${Math.round(absorbed)}`,this.state.x,this.state.z,'#e1d7a5');this.refine('stoneward',2);}this.state.hp=Math.max(0,this.state.hp-remaining);if(remaining>0){this.textAt(`−${Math.round(remaining)}`,this.state.x,this.state.z,'#f2a5a0');this.cb.onHit?.();this.sound(80,.18,'triangle');}if(this.state.hp<=0)this.respawn();return true;}
 respawn(){this.motion?.stop();const s=this.state;if(s.exam){this.finishExam(false);return;}s.x=s.checkpoint.x;s.z=s.checkpoint.z;s.hp=s.maxHp;s.mana=s.maxMana;s.stamina=100;this.shield=0;this.target=null;for(const e of this.enemies){if(e.hp>0){e.x=e.home.x;e.z=e.home.z;e.hp=e.maxHp;e.aggro=false;}}this.clearTelegraphs();this.message('The hearth remembers you','You awaken in Bellwether. Your discoveries and completed tasks remain.');this.save();}
 tickEnemies(dt){for(const e of this.enemies){if(e.hp<=0)continue;const d=distance(e,this.state);e.slow=Math.max(0,e.slow-dt);const isTrial=e.id==='trial';if(d<(e.kind==='boss'?27:15)||isTrial)e.aggro=true;if(d>37&&!isTrial){e.aggro=false;if(distance(e,e.home)>1){const h=distance(e,e.home);e.x+=(e.home.x-e.x)/h*dt*3;e.z+=(e.home.z-e.z)/h*dt*3;}e.hp=Math.min(e.maxHp,e.hp+dt*6);}if(e.aggro){e.cooldown-=dt;const winding=this.telegraphs.some(t=>t.owner===e);if(d>(e.kind==='boss'?6:2.8)&&!winding){const speed=(e.kind==='boss'?2.1:2.8)*(e.slow>0?.36:1);e.x+=(this.state.x-e.x)/d*speed*dt;e.z+=(this.state.z-e.z)/d*speed*dt;}if(e.cooldown<=0&&!winding&&d<(e.kind==='boss'?25:8)){const boss=e.kind==='boss',pulse=boss&&e.hp<e.maxHp*.5&&Math.random()<.5;this.telegraph({x:pulse?e.x:this.state.x,z:pulse?e.z:this.state.z,radius:boss?(pulse?8:3.4):2.1,duration:boss?1.8:1.5,damage:boss?30:16,owner:e});e.cooldown=boss?(e.hp<e.maxHp*.4?2.6:4.2):3.4;}}
  e.mesh.position.set(e.x,Math.sin(this.time*3+e.mesh.id)*.09,e.z);e.mesh.rotation.y=Math.atan2(this.state.x-e.x,this.state.z-e.z);if(e.mesh.userData.halo)e.mesh.userData.halo.rotation.z=this.time*.5;}}
 telegraph(t){const mesh=this.ring(t.radius,0xeea471,.13,t.x,t.z);const fill=new THREE.Mesh(new THREE.CircleGeometry(t.radius,40),new THREE.MeshBasicMaterial({color:0xde854f,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false}));mesh.add(fill);fill.rotation.set(0,0,0);t.mesh=mesh;t.remaining=t.duration;t.fill=fill;this.telegraphs.push(t);}
 tickTelegraphs(dt){for(let i=this.telegraphs.length-1;i>=0;i--){const t=this.telegraphs[i];t.remaining-=dt;t.fill.material.opacity=.10+(1-t.remaining/t.duration)*.3;if(t.remaining<=0){this.burst(t.x,.2,t.z,0xe4a475,18);if(distance(t,this.state)<t.radius+.25)this.hitPlayer(t.damage);this.scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();t.fill.geometry.dispose();t.fill.material.dispose();this.telegraphs.splice(i,1);}}}
 clearTelegraphs(){for(const t of this.telegraphs){this.scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();t.fill.geometry.dispose();t.fill.material.dispose();}this.telegraphs=[];}
 cycleTarget(){const near=this.enemies.filter(e=>e.hp>0&&distance(e,this.state)<35);if(!near.length)return;this.target=near[(near.indexOf(this.target)+1)%near.length];}
 interact(){if(this.paused)return;const o=this.near;if(!o){return;}if(NPCS.some(n=>n.id===o.id)){this.paused=true;this.keys.clear();this.cb.onTalk?.(o.id);return;}const s=this.state;
  if(o.kind==='waylight')this.message(s.waylights.includes(o.id)?'A steady flame':'A cold waylight',s.waylights.includes(o.id)?'The road is safer for your passing.':'Release Tinder near the waylight. Its glass remembers fire.');
  if(o.kind==='camp'){s.hp=s.maxHp;s.mana=s.maxMana;s.stamina=100;s.checkpoint={x:0,z:57};this.message('A moment beside the hearth','Vitality, mana, and stamina restored. Progress saved.');this.sound(520,.6);this.save();}
  if(o.kind==='herb'){s.herbs.push(o.id);s.crowns+=4;o.mesh.visible=false;this.message('Moon flax gathered','Neris’s standing order earns you 4 crowns.');this.sound(760,.15);this.gain(3);}
  if(o.kind==='record'){if(!s.flags.watchtower){s.flags.watchtower=true;this.gain(35);}this.cb.onStory?.({title:'The sixth bell',text:'“Five bells from the town. One from below. The sixth returns a fraction of a breath too late. This is not an echo. Something is answering. If the Collegium refuses to listen, let the next person who comes here judge for themselves.” — Northwatch keeper, Year 425',footer:'Return this record to Ilyra or Sera.'});this.save();}
  if(o.kind==='crypt'){if(s.waylights.length===3&&s.groveKills>=3&&s.flags.watchtower){s.flags.cryptOpen=true;this.syncWorld();this.message('The Sunken Choir','Three patterns guard its heart. Fire wakes it. Water names it. Stone remembers.');this.save();}else this.message('The door does not answer',`Required: ${s.waylights.length<3?'three awakened waylights; ':''}${s.groveKills<3?'a quieted Hushwood; ':''}${!s.flags.watchtower?'the Northwatch record':''}.`);}
  if(o.kind==='gate'){if(s.fragments.length>=3){if(!s.chapterComplete)this.gain(80);s.chapterComplete=true;this.syncWorld();this.save();this.cb.onEnd?.();this.sound(880,1);}else this.message('An arch without a door',`${s.fragments.length} of 3 bell fragments resonate. One in the waylights, one in the grove, one beneath the Choir.`);}
 }
 talk(id,input){const result=dialogueFor(id,input,this.state),s=this.state;switch(result.action){
  case 'buy':if(s.crowns>=12){s.crowns-=12;s.tonics++;this.sound(720,.1);}break;
  case 'offense':s.offenses++;s.fine+=15;this.message('A recorded offense','An active warrant now blocks academy admission.');break;
  case 'fine':if(s.crowns>=s.fine){s.crowns-=s.fine;s.fine=0;}break;
  case 'road':if(s.route!=='academy')s.route='road';this.learn('rime');break;
  case 'enchant':if(s.groveKills>=3)this.learn('flameedge');break;
  case 'record':if(s.flags.watchtower){if(!s.flags.recordReturned){s.flags.recordReturned=true;this.gain(35);}this.learn('thunder');}break;
  case 'graduate':if(s.route==='academy'&&s.flags.bossDefeated&&s.flags.courierHealed&&s.flags.recordReturned&&!s.flags.graduated){s.flags.graduated=true;s.academy='graduated';this.gain(70);this.message('Lumen graduate','An education earned in the world beyond its gates.');}break;
  case 'seal':if(s.flags.bossDefeated&&!s.flags.wayfarerSeal){s.flags.wayfarerSeal=true;this.gain(45);this.message('The Wayfarer seal','The road recognizes your deeds.');}break;
  case 'exam':this.startExam();break;
 }this.save();this.emit();return result.text;}
 startExam(){this.motion?.stop();const s=this.state;if(s.fine||s.route==='academy')return;s.examAttempts++;s.academy='exam';s.exam={stage:0,hits:0,time:35,score:0,pulses:0,protected:0,pulseTime:4};s.x=0;s.z=-14;s.hp=s.maxHp;s.mana=s.maxMana;s.stamina=100;this.cooldowns={};this.paused=false;this.cb.onTalk?.(null);this.message('Trial I · Precision','Cast Tinder at the focus three times in 35 seconds.');}
 nextTrial(){this.motion?.stop();const s=this.state,e=s.exam;if(!e)return;if(e.stage===0){e.score+=e.hits>=3?35:Math.min(25,e.hits*8);e.stage=1;e.time=20;e.pulseTime=4;e.pulses=0;e.protected=0;s.x=0;s.z=-18;s.hp=s.maxHp;s.mana=s.maxMana;this.cooldowns={};this.shield=0;this.message('Trial II · Protection','Stay within 8 paces of the focus. Shield three pulses with Stoneward.');}else if(e.stage===1){e.score+=e.protected*10;e.stage=2;e.time=45;s.hp=s.maxHp;s.mana=s.maxMana;this.cooldowns={};this.spawnEnemy({id:'trial',name:'Examination echo',x:0,z:-25,hp:145});this.message('Trial III · Composure','Disperse the echo within 45 seconds. Keep your vitality high.');}else{e.score+=Math.round(20+15*(s.hp/s.maxHp));this.finishExam(e.score>=75);}}
 tickExam(dt){const s=this.state,e=s.exam;if(!e)return;e.time-=dt;if(e.stage===1){e.pulseTime-=dt;if(e.pulseTime<=0&&e.pulses<3){e.pulses++;e.pulseTime=5;const close=distance(s,{x:0,z:-22})<=8;const protectedNow=close&&this.shield>=16;if(protectedNow){e.protected++;this.shield-=16;this.refine('stoneward',3);this.textAt('PROTECTED',s.x,s.z,'#dfd7a8');}else{this.hitPlayer(16);this.textAt(close?'UNWARDED':'OUT OF CIRCLE',s.x,s.z,'#e7aaa1');}this.burst(0,1,-22,0xc8cfab,30);if(e.pulses>=3)this.nextTrial();}}
  if(s.exam&&e.time<=0){if(e.stage<2)this.nextTrial();else this.finishExam(false);}}
 finishExam(pass){const s=this.state,score=s.exam?.score||0;s.exam=null;s.academy=pass?'admitted':'declined';s.hp=s.maxHp;s.mana=s.maxMana;this.clearTelegraphs();for(const e of this.enemies.filter(e=>e.id==='trial')){e.hp=0;e.mesh.visible=false;}this.target=null;if(pass){s.route='academy';this.learn('rime');this.gain(65);this.message(`Admitted to Lumen · ${score}/100`,'Your field studies begin: tend Tavi, recover Northwatch’s record, and resolve the Sunken Choir.');}else{this.message(`Not admitted · ${score}/100`,'The threshold is 75. Reapply after practice, or learn from Sera on the Unbound Road.');}this.save();}
 setSetting(key,value){this.state.settings[key]=value;if(key==='quality'||key==='performance')this.configurePerformance(this.state.settings.performance);this.save();this.emit();}
 pause(value){this.paused=value;this.keys.clear();this.motion?.stop();this.drag=null;if(value&&this.playing)this.save();}
 reset(){this.skipSave=true;this.playing=false;try{localStorage.removeItem(SAVE_KEY);}catch{}window.location.reload();}
 dispose(){this.disposed=true;cancelAnimationFrame(this.frameId);clearTimeout(this.frameTimer);this.listeners.forEach(f=>f());if(this.playing)this.save();this.audio?.close();super.dispose();}
}
