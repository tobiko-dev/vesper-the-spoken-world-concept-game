export function createWorld(THREE, scene, state){
function toon(color, roughness = 0.92) {
  return new THREE.MeshToonMaterial({ color, roughness });
}
function standard(color, roughness = 0.86, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function seeded(seed = 7719) {
  let x = seed >>> 0;
  return () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296);
}

function grassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const rnd = seeded(1447);
  g.fillStyle = '#6fb250'; g.fillRect(0,0,512,512);
  for (let i=0;i<9000;i++) {
    const x=rnd()*512, y=rnd()*512, h=2+rnd()*5;
    g.strokeStyle = rnd()>.5 ? 'rgba(44,115,50,.24)' : 'rgba(178,222,109,.20)';
    g.lineWidth=.7; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(rnd()-.5)*2,y-h); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(20,20); t.colorSpace=THREE.SRGBColorSpace; return t;
}

function cobbleTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 768;
  const g = c.getContext('2d'); const rnd=seeded(8123);
  g.fillStyle='#baad7e'; g.fillRect(0,0,c.width,c.height);
  for (let y=0;y<768;y+=30) {
    const offset=((y/30)%2)*18;
    for (let x=-20;x<790;x+=38) {
      const cx=x+offset+(rnd()-.5)*5, cy=y+(rnd()-.5)*5;
      const rx=15+rnd()*5, ry=9+rnd()*4;
      g.beginPath(); g.ellipse(cx,cy,rx,ry,(rnd()-.5)*.5,0,Math.PI*2);
      const n=Math.floor(158+rnd()*28); g.fillStyle=`rgb(${n+20},${n+13},${n-10})`; g.fill();
      g.strokeStyle='rgba(93,79,53,.42)'; g.lineWidth=2; g.stroke();
      g.beginPath(); g.ellipse(cx-3,cy-3,rx*.74,ry*.58,0,Math.PI,Math.PI*2);
      g.strokeStyle='rgba(255,244,202,.18)'; g.lineWidth=1; g.stroke();
    }
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(4.5,4.5); t.colorSpace=THREE.SRGBColorSpace; return t;
}

function stoneTexture() {
  const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d'); const rnd=seeded(414);
  g.fillStyle='#c8c3a6'; g.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=34){
    const off=((y/34)%2)*24;
    for(let x=-30;x<540;x+=48){
      g.strokeStyle='rgba(105,104,84,.32)'; g.lineWidth=2;
      g.strokeRect(x+off+(rnd()-.5)*2,y+(rnd()-.5)*2,46,32);
    }
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(4,4); t.colorSpace=THREE.SRGBColorSpace; return t;
}

const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness:1 });
const cobbleMat = new THREE.MeshStandardMaterial({ map: cobbleTexture(), roughness:.96 });
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), color:0xf0ebd0, roughness:.92 });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(220,220), grassMat);
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);

const plaza = new THREE.Mesh(new THREE.CylinderGeometry(16.8,16.8,.22,72), cobbleMat);
plaza.position.y=.09; plaza.receiveShadow=true; scene.add(plaza);

const road = new THREE.Mesh(new THREE.BoxGeometry(6,.10,36), cobbleMat);
road.position.set(0,.11,-33); road.receiveShadow=true; scene.add(road);

function addBorderPath(x,z,w,d,rot=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.06,d), cobbleMat); m.position.set(x,.08,z); m.rotation.y=rot; m.receiveShadow=true; scene.add(m); return m;
}
addBorderPath(-30,-4,27,3.2,.08); addBorderPath(30,-4,27,3.2,-.08);
addBorderPath(-30,23,30,3.2,-.12); addBorderPath(30,23,30,3.2,.12);

function addTree(x,z,scale=1){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.38*scale,.62*scale,4.4*scale,8),toon(0x8a6747));
  trunk.position.y=2.2*scale; trunk.castShadow=true; g.add(trunk);
  const crownMat=toon(0x68b957);
  [[0,5.2,0,2.35],[-1.25,4.8,.1,1.55],[1.15,4.65,.2,1.65],[.2,6.1,.15,1.55]].forEach(([a,b,c,r])=>{
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,1),crownMat); m.position.set(a*scale,b*scale,c*scale); m.castShadow=true; g.add(m);
  });
  g.position.set(x,0,z); scene.add(g); return g;
}
[
  [-26,-12,1.2],[-19,-21,.98],[23,-12,1.18],[17,-23,1.02],[-35,13,1.08],[34,15,1.14],
  [-28,34,.95],[27,35,1.02],[-44,-8,1.2],[46,-7,1.15],[-42,30,1.12],[43,32,1.05]
].forEach(v=>addTree(...v));

function addLamp(x,z){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.075,.09,3.6,8),toon(0x263f46)); pole.position.y=1.8; g.add(pole);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.33,.34,4),toon(0x263f46)); cap.position.y=3.72; cap.rotation.y=Math.PI/4; g.add(cap);
  const glowMat=new THREE.MeshStandardMaterial({color:0xffe29a,emissive:0xe4a63b,emissiveIntensity:1.3});
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),glowMat); glow.position.y=3.48; g.add(glow);
  g.position.set(x,0,z); scene.add(g);
}
[-5,5].forEach(x=>{[-17,-27,-37].forEach(z=>addLamp(x,z));});
addLamp(-13,5); addLamp(13,5);

function addBench(x,z,rot=0){
  const g=new THREE.Group(); const wood=toon(0x8d6744), metal=toon(0x31444a);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(3,.22,.75),wood); seat.position.y=.75; g.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(3,.85,.18),wood); back.position.set(0,1.25,.32); g.add(back);
  [-1.2,1.2].forEach(s=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,.8,.16),metal);leg.position.set(s,.4,0);g.add(leg)});
  g.position.set(x,0,z); g.rotation.y=rot; scene.add(g);
}
addBench(-8,8,.1); addBench(8,8,-.1); addBench(-12,-7,Math.PI/2); addBench(12,-7,-Math.PI/2);

function addFountain(){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.45,.55,48),stoneMat); base.position.y=.32; base.castShadow=base.receiveShadow=true; g.add(base);
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(2.75,2.9,.32,48),toon(0xd6d2b9)); basin.position.y=.66; g.add(basin);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(2.55,2.55,.08,48),new THREE.MeshStandardMaterial({color:0x69bad3,transparent:true,opacity:.72,roughness:.18,metalness:.05})); water.position.y=.86; g.add(water);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.38,.5,2.3,16),stoneMat); stem.position.y=1.75; g.add(stem);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(1.2,.72,.32,32),toon(0xd9d4bd)); bowl.position.y=2.75; g.add(bowl);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.46),new THREE.MeshStandardMaterial({color:0x83e6ef,emissive:0x1d7e8a,emissiveIntensity:.9})); crystal.position.y=3.45; crystal.castShadow=true; g.add(crystal);
  scene.add(g);
}
addFountain();

function addCottage(x,z,rot=0,scale=1){
  const g=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(7.5*scale,5.2*scale,6.3*scale),stoneMat);wall.position.y=2.6*scale;wall.castShadow=wall.receiveShadow=true;g.add(wall);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(5.8*scale,3.8*scale,4),toon(0x597985));roof.position.y=6.25*scale;roof.rotation.y=Math.PI/4;roof.scale.z=.82;roof.castShadow=true;g.add(roof);
  const door=new THREE.Mesh(new THREE.PlaneGeometry(1.55*scale,2.7*scale),toon(0x684c3b));door.position.set(0,1.4*scale,-3.16*scale);g.add(door);
  [-2.15,2.15].forEach(wx=>{const win=new THREE.Mesh(new THREE.PlaneGeometry(1.25*scale,1.45*scale),new THREE.MeshStandardMaterial({color:0x86bbca,emissive:0x1d4c59,emissiveIntensity:.14}));win.position.set(wx*scale,3.1*scale,-3.17*scale);g.add(win);});
  const beam=toon(0x6f5842);[-3.3,3.3].forEach(bx=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.18*scale,5.0*scale,.2*scale),beam);b.position.set(bx*scale,2.55*scale,-3.24*scale);g.add(b);});
  g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
}
addCottage(-27,5,.12,1.0);addCottage(27,5,-.12,1.0);addCottage(-30,29,.22,.92);addCottage(30,29,-.22,.92);

function addAcademy(){
  const g=new THREE.Group();
  const wall=stoneMat;
  const main=new THREE.Mesh(new THREE.BoxGeometry(28,13,9),wall); main.position.set(0,7,-57); main.castShadow=main.receiveShadow=true; g.add(main);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(20,7,4),toon(0x476f7b)); roof.position.set(0,16.2,-57); roof.rotation.y=Math.PI/4; roof.scale.z=.58; roof.castShadow=true; g.add(roof);
  [-12.5,12.5].forEach(x=>{
    const tower=new THREE.Mesh(new THREE.BoxGeometry(7.5,17,8),wall); tower.position.set(x,8.5,-56.7);tower.castShadow=tower.receiveShadow=true;g.add(tower);
    const tr=new THREE.Mesh(new THREE.ConeGeometry(5.7,7,4),toon(0x416b78));tr.position.set(x,20.1,-56.7);tr.rotation.y=Math.PI/4;tr.castShadow=true;g.add(tr);
  });
  const door=new THREE.Mesh(new THREE.BoxGeometry(4.8,6.1,.15),toon(0x253d43)); door.position.set(0,3.12,-52.42); g.add(door);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.42,.36,10,36,Math.PI),toon(0xc7c2a5)); arch.position.set(0,6.1,-52.28); arch.rotation.z=Math.PI; g.add(arch);
  for(let i=-2;i<=2;i++){
    if(i===0) continue;
    const win=new THREE.Mesh(new THREE.PlaneGeometry(2.0,3.0),new THREE.MeshStandardMaterial({color:0x7db2c9,emissive:0x2b596d,emissiveIntensity:.22,roughness:.32}));
    win.position.set(i*4.4,8.8,-52.42); g.add(win);
  }
  const crest=new THREE.Mesh(new THREE.TorusGeometry(1.1,.16,8,32),toon(0xd8c579)); crest.position.set(0,11.2,-52.28); g.add(crest);
  scene.add(g);
}
addAcademy();

function makeWaylight(x,z){
  const g=new THREE.Group();
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(.65,.85,1.65,8),toon(0x87958b)); ped.position.y=.83;ped.castShadow=true;g.add(ped);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,.65,8),toon(0x566d6c)); neck.position.y=1.82;g.add(neck);
  const gemMat=new THREE.MeshStandardMaterial({color:0x70dbe8,emissive:0x165e6b,emissiveIntensity:.6,roughness:.25});
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.62),gemMat); gem.position.y=2.55; gem.castShadow=true; g.add(gem);
  g.position.set(x,0,z); g.userData={kind:'waylight',active:false,gem}; scene.add(g); return g;
}
const waylights=[makeWaylight(-4,-18),makeWaylight(4,-27),makeWaylight(-4,-36)];

function addGoldTrim(parent,x,y,z,w,h,d,rotZ=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(0xd5ba65));m.position.set(x,y,z);m.rotation.z=rotZ;parent.add(m);return m;
}

function makeHumanoid({coat=0x123f52,hair=0xe7e4df,skin=0xf0c8ad,face=true}={}){
  const g=new THREE.Group();
  const navy=toon(coat), gold=toon(0xd2b55f), skinMat=toon(skin), hairMat=toon(hair), bootMat=toon(0x1c2d39);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.36,1.65,.76),navy); torso.position.y=2.75; torso.castShadow=true; g.add(torso);
  const hips=new THREE.Mesh(new THREE.BoxGeometry(1.52,.65,.82),navy);hips.position.y=1.8;hips.castShadow=true;g.add(hips);
  const tailGeo=new THREE.BoxGeometry(.72,1.65,.12);
  [-.39,.39].forEach((x,i)=>{const t=new THREE.Mesh(tailGeo,navy);t.position.set(x,1.22,.3);t.rotation.x=-.10;t.rotation.z=(i?-.05:.05);t.castShadow=true;g.add(t)});
  const cape=new THREE.Mesh(new THREE.BoxGeometry(1.25,2.6,.08),toon(0x17394a));cape.position.set(0,2.05,.48);cape.rotation.x=-.10;cape.castShadow=true;g.add(cape);
  [-.86,.86].forEach(x=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.18,.20,1.75,8),navy);arm.position.set(x,2.53,0);arm.rotation.z=x<0?-.06:.06;arm.castShadow=true;g.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.20,10,8),skinMat);hand.position.set(x,1.58,0);hand.castShadow=true;g.add(hand);
    const ep=new THREE.Mesh(new THREE.BoxGeometry(.52,.14,.76),gold);ep.position.set(x*.89,3.63,.01);ep.rotation.z=x<0?-.08:.08;g.add(ep);
  });
  [-.36,.36].forEach(x=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.42,1.55,.48),bootMat);leg.position.set(x,.72,0);leg.castShadow=true;g.add(leg);
    const boot=new THREE.Mesh(new THREE.BoxGeometry(.48,.32,.78),bootMat);boot.position.set(x,.16,-.09);boot.castShadow=true;g.add(boot);
  });
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.18,.20,.28,10),skinMat);neck.position.y=3.78;g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.53,20,16),skinMat);head.scale.z=.88;head.position.y=4.33;head.castShadow=true;g.add(head);
  const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.565,20,12,0,Math.PI*2,0,Math.PI*.58),hairMat);hairCap.position.set(0,4.45,.015);hairCap.scale.z=.9;hairCap.castShadow=true;g.add(hairCap);
  // Long side/back hair locks keep the silhouette human instead of a white sphere.
  [[-.43,4.22,.13,.24,.9,.24,.16],[.43,4.22,.13,.24,.9,.24,-.16],[0,4.14,.43,.78,.95,.10,0]].forEach(([x,y,z,w,h,d,rz])=>{
    const lock=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),hairMat);lock.position.set(x,y,z);lock.rotation.z=rz;lock.castShadow=true;g.add(lock);
  });
  // Angular bangs.
  [-.28,-.05,.18,.34].forEach((x,i)=>{
    const b=new THREE.Mesh(new THREE.ConeGeometry(.12,.54,3),hairMat);b.position.set(x,4.37,-.47);b.rotation.z=(i-1.5)*.12;b.rotation.x=-.12;g.add(b);
  });
  if(face){
    const eyeMat=new THREE.MeshBasicMaterial({color:0x1f606b});
    [-.18,.18].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),eyeMat);e.position.set(x,4.35,-.495);e.scale.y=1.25;g.add(e)});
    const mouth=new THREE.Mesh(new THREE.BoxGeometry(.18,.018,.012),new THREE.MeshBasicMaterial({color:0x955d63}));mouth.position.set(0,4.12,-.505);g.add(mouth);
  }
  addGoldTrim(g,0,3.42,-.40,.12,.64,.045,0);
  addGoldTrim(g,-.21,3.23,-.405,.09,.72,.045,-.55);
  addGoldTrim(g,.21,3.23,-.405,.09,.72,.045,.55);
  addGoldTrim(g,-.62,2.57,-.405,.07,1.18,.045,0);
  addGoldTrim(g,.62,2.57,-.405,.07,1.18,.045,0);
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.10),new THREE.MeshStandardMaterial({color:0x65dce8,emissive:0x1a6671,emissiveIntensity:.8}));gem.position.set(0,3.11,-.47);g.add(gem);
  const staff=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,4.4,8),toon(0x5e4532));staff.position.set(1.08,2.2,0);staff.castShadow=true;g.add(staff);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.45,.065,8,32),gold);ring.position.set(1.08,4.35,0);g.add(ring);
  const staffGem=new THREE.Mesh(new THREE.OctahedronGeometry(.28),new THREE.MeshStandardMaterial({color:0x63def0,emissive:0x146979,emissiveIntensity:1.2}));staffGem.position.set(1.08,4.35,0);staffGem.castShadow=true;g.add(staffGem);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  return g;
}

const player=makeHumanoid(); player.position.set(state.position.x,0,state.position.z); scene.add(player);
const npc=makeHumanoid({coat:0x47786e,hair:0xe5d6c9}); npc.scale.set(.92,.92,.92); npc.position.set(7.2,0,3.6); npc.rotation.y=-2.5; npc.userData={kind:'npc',name:'Ilyra',role:'Keeper of the waylights'}; scene.add(npc);

return { player, npc, waylights };
}
