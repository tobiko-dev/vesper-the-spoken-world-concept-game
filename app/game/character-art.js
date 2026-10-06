import * as THREE from 'three';

const TAU = Math.PI * 2;
const GOLD = 0xd4b778, INK = 0x233043, IVORY = 0xf1e9d7;

// Closed elliptical cross-sections keep the profile as deliberate as the front.
function volume(w, rings, color, segments = 16) {
  const vertices = [], indices = [];
  for (const [y, rx, rz, z = 0, x = 0] of rings) for (let j = 0; j <= segments; j++) {
    const a = j / segments * TAU;
    vertices.push(x + Math.sin(a) * rx, y, z + Math.cos(a) * rz);
  }
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  for (const [row, reverse] of [[0, true], [rings.length - 1, false]]) {
    const [y, , , z = 0, x = 0] = rings[row], c = vertices.length / 3;
    vertices.push(x, y, z);
    for (let j = 0; j < segments; j++) {const a = row * (segments + 1) + j; indices.push(c, reverse ? a + 1 : a, reverse ? a : a + 1);}
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  return w.mesh(geo, color);
}
function oval(w, color, x, y, z, sx, sy, sz, segments = 12, rows = 6) {
  const m = w.mesh(new THREE.SphereGeometry(1, segments, rows), color, x, y, z); m.scale.set(sx, sy, sz); return m;
}
// Swept oval solids, rather than camera-facing ribbons, for hair and fabric.
function strand(w, points, width, depth, color, segments = 9, sides = 6, taper = true) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(segments, false), vertices = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, p = curve.getPointAt(t), shape = taper ? Math.max(.008, Math.pow(1 - t, .6) * (.65 + Math.sin(Math.PI * t) * .65)) : .8 + Math.sin(Math.PI * t) * .2;
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * TAU, q = p.clone().addScaledVector(frames.normals[i], Math.cos(a) * width * shape).addScaledVector(frames.binormals[i], Math.sin(a) * depth * shape);
      vertices.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {const a = i * (sides + 1) + j, b = a + sides + 1; indices.push(a, b, a + 1, a + 1, b, b + 1);}
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  return w.mesh(geo, color, 0, 0, 0, {side: THREE.DoubleSide});
}
function piping(w, points, color, radius = .009) {return strand(w, points, radius, radius, color, 6, 4, false);}
function plate(w, points, color, thickness = .022) {
  const vertices = [], indices = [], n = points.length;
  for (const z of [-thickness / 2, thickness / 2]) for (const p of points) vertices.push(p[0], p[1], p[2] + z);
  for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i, n, n + i, n + i + 1);
  for (let i = 0; i < n; i++) {const j = (i + 1) % n; indices.push(i, j, n + j, i, n + j, n + i);}
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));geo.setIndex(indices);geo.computeVertexNormals();return w.mesh(geo, color, 0, 0, 0, {side: THREE.DoubleSide});
}
function coatSkirt(w, side, color) {
  const rows = [[1.32,.234,.198],[1.15,.246,.209],[.86,.287,.24],[.56,.352,.284]], vertices = [], indices = [], n = 10;
  for (const layer of [0, .024]) for (let r = 0; r < rows.length; r++) for (let j = 0; j <= n; j++) {
    const a = .24 + j / n * 2.45, [y,rx,rz] = rows[r], fold = r / 3 * Math.sin(j / n * Math.PI * 4) * .012;
    vertices.push(side * Math.sin(a) * (rx + layer + fold), y + (r === 3 ? Math.cos(a) * .10 : 0), Math.cos(a) * (rz + layer + fold) - .015);
  }
  const size = rows.length * (n + 1);
  for (let layer = 0; layer < 2; layer++) for (let r = 0; r < 3; r++) for (let j = 0; j < n; j++) {
    const a = layer * size + r * (n + 1) + j, b = a + n + 1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  const boundary = [...Array.from({length:n+1},(_,j)=>j),...Array.from({length:3},(_,r)=>(r+1)*(n+1)+n),...Array.from({length:n},(_,j)=>size-2-j),...Array.from({length:2},(_,r)=>(2-r)*(n+1))];
  for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];indices.push(a,b,b+size,a,b+size,a+size);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return w.mesh(geo,color,0,0,0,{side:THREE.DoubleSide});
}
function mantle(w, color, trim) {
  const g = new THREE.Group();g.position.set(0,1.98,-.02);
  // A curved shoulder mantle leaves the waist and lower-back silhouette visible.
  g.add(strand(w,[[-.28,-.03,0],[-.27,-.25,-.24],[-.21,-.60,-.32],[-.10,-.88,-.39]],.18,.026,color,7,6));
  g.add(piping(w,[[-.40,-.06,-.025],[-.39,-.26,-.22],[-.31,-.60,-.33],[-.10,-.88,-.39]],trim,.012));
  return g;
}
function eye(w, side, y, irisColor, hairColor, skin) {
  const group=new THREE.Group();group.position.set(side*.082,y,.155);group.rotation.y=side*.40;group.rotation.z=side*.055;
  const vertices=[0,0,.020],indices=[];
  for(let i=0;i<20;i++){const a=i/20*TAU;vertices.push(Math.cos(a)*.063,Math.sin(a)*(.026+Math.cos(a)*side*.005),.015-Math.abs(Math.cos(a))*.025);indices.push(0,i+1,(i+1)%20+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();group.add(w.mesh(geo,0xfff7ed,0,0,0,{side:THREE.DoubleSide}));
  group.add(oval(w,irisColor,0,0,.022,.024,.026,.010,12));
  group.add(oval(w,0x182c40,0,-.001,.031,.010,.020,.004,8));
  group.add(oval(w,0xfffcf0,-.009,.010,.036,.007,.007,.003,6,4));
  group.add(piping(w,[[-.064,0,.004],[-.028,.024,.019],[.025,.026,.020],[.064,.004,.005]],INK,.005));
  group.add(piping(w,[[-.058,-.003,.003],[0,-.028,.017],[.058,-.005,.005]],skin,.004));
  group.add(piping(w,[[-.051,.060,-.001],[0,.068,.010],[.05,.056,.003]],hairColor,.006));
  for(const child of group.children.slice(0,-1))child.userData.noInk=true;
  return group;
}
export function createCharacter(w, color, hair, player, identity = '') {
  const palettes={ilyra:[0x668980,0xdedbd2,0xd6bd8f],examiner:[0x344b73,0xc3c9d6,GOLD],sera:[0x625980,0xc5b6e5,0xc6b9dc],elian:[0x71594b,0x584b45,0xc4a983],merchant:[0x457065,0xa46750,0xc8b680],courier:[0x387886,0xddbf85,0xc1dce0]};
  const [coat,hairColor,trim]=player?[0x234f61,0xe8e5ed,GOLD]:(palettes[identity]||[color,hair,GOLD]);
  const skin=identity==='elian'?0xc7967f:identity==='merchant'?0xdcae90:0xf0c9b6;
  const hairShade=new THREE.Color(hairColor).multiplyScalar(.80), leather=0x283847;
  const g=new THREE.Group();g.userData.character=true;g.userData.identity=identity;g.userData.lineage='human';
  // Long, tapered limbs, a shaped rib cage and pelvis, and real chest/back depth.
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.143,1.245,0);
    leg.add(volume(w,[[-1.14,.077,.094,.033],[-.90,.078,.079,-.016],[-.67,.102,.103,-.020],[-.54,.080,.087,.008],[-.39,.092,.108,.015],[-.13,.115,.127,-.010],[.025,.118,.125,-.025]],leather,10));
    leg.add(volume(w,[[-1.18,.09,.123,.033],[-1.03,.082,.090,0],[-.86,.085,.087,-.015],[-.68,.10,.105,-.02],[-.59,.091,.100,-.005]],0x334755,10));
    leg.add(oval(w,0x1c2c3c,0,-1.145,.101,.096,.083,.19));
    leg.add(volume(w,[[-.63,.095,.103,-.005],[-.596,.095,.104,-.005]],trim,12));
    g.add(leg);g.userData[side<0?'leftLeg':'rightLeg']=leg;
  }
  const body=volume(w,[[1.17,.214,.176,-.012],[1.32,.23,.192,-.012],[1.47,.184,.154,.006],[1.60,.203,.169,.011],[1.80,.26,.206,.016],[1.95,.292,.18,-.002],[2.05,.204,.127,-.008],[2.10,.104,.09,0]],coat,16);
  body.name='Sculpted torso';g.add(body);
  for(const side of [-1,1]){
    g.add(coatSkirt(w,side,coat));
    g.add(piping(w,[[side*.060,1.31,.206],[side*.073,.95,.25],[side*.090,.66,.29]],trim,.010));
    const arm=new THREE.Group();arm.position.set(side*.283,1.951,-.013);arm.rotation.z=side*.065;
    arm.add(volume(w,[[-.78,.048,.053,.018,side*.041],[-.69,.060,.066,.01,side*.037],[-.55,.080,.083,0,side*.03],[-.43,.066,.075,-.016,side*.024],[-.27,.087,.092,-.024,side*.015],[-.09,.105,.104,-.010],[.038,.070,.075,-.01]],coat,10));
    arm.add(volume(w,[[-.79,.058,.063,.021,side*.041],[-.755,.065,.072,.017,side*.04]],trim,12));
    arm.add(oval(w,skin,side*.045,-.87,.03,.059,.10,.051,10));
    arm.add(oval(w,skin,-side*.006,-.845,.055,.028,.050,.029,8));
    // Small shoulder plates follow the form instead of floating as boxes.
    arm.add(oval(w,trim,side*.021,-.008,-.009,.111,.058,.119,12));
    g.add(arm);g.userData[side<0?'leftArm':'rightArm']=arm;
  }
  g.add(volume(w,[[1.397,.194,.169,.006],[1.447,.194,.169,.006]],0x584744,20));
  g.add(w.mesh(new THREE.OctahedronGeometry(.052),trim,0,1.425,.187));
  g.add(plate(w,[[-.10,2.062,.128],[.10,2.062,.128],[.087,1.846,.215],[0,1.65,.188],[-.087,1.846,.215]],IVORY));
  for(const s of [-1,1]){
    g.add(plate(w,[[s*.092,2.081,.125],[s*.22,1.998,.139],[s*.121,1.812,.223],[s*.014,1.596,.181],[s*.070,1.864,.231]],trim,.027));
    g.add(piping(w,[[s*.092,2.081,.146],[s*.119,1.851,.241],[s*.014,1.596,.198]],coat,.009));
  }
  g.add(volume(w,[[2.04,.086,.087,0],[2.21,.072,.080,.014],[2.26,.081,.085,.019]],skin,14));
  const collar=w.mesh(new THREE.CylinderGeometry(.11,.12,.11,16,1,true,.55,TAU-1.1),coat,0,2.10,-.003);collar.scale.z=.86;g.add(collar);
  const gem=w.mesh(new THREE.OctahedronGeometry(.049),0x8cdedc,0,1.993,.174);gem.scale.y=1.36;g.add(gem);
  const cape=mantle(w,coat,trim);g.add(cape);g.userData.cape=cape;

  // Continuous jaw/cheek/skull silhouette with a projecting bridge and lips.
  const headStart=g.children.length;
  const head=volume(w,[[2.15,.025,.045,.064],[2.178,.066,.077,.044],[2.214,.113,.115,.020],[2.27,.157,.151,0],[2.333,.183,.167,-.004],[2.396,.183,.167,-.009],[2.463,.178,.157,-.013],[2.519,.148,.133,-.015],[2.563,.092,.083,-.017],[2.584,.012,.012,-.019]],skin,24);
  head.name='Sculpted face';g.add(head);
  for(const side of [-1,1]){
    g.add(oval(w,skin,side*.183,2.365,-.022,.032,.060,.035,10));
    g.add(eye(w,side,2.393,player?0x439eae:identity==='sera'?0x9e85c9:0x698f84,hairShade,skin));
  }
  const nose=volume(w,[[2.296,.008,.009,.183],[2.31,.019,.018,.184],[2.33,.016,.025,.177],[2.353,.010,.017,.170],[2.393,.006,.004,.157]],skin,10);nose.userData.noInk=true;g.add(nose);
  g.add(piping(w,[[-.034,2.254,.146],[-.013,2.255,.157],[0,2.251,.163],[.013,2.255,.157],[.034,2.254,.146]],0xc48c88,.0028));
  g.children.at(-1).userData.noInk=true;
  g.add(oval(w,0xc48c88,0,2.246,.161,.024,.004,.004,10,4));
  g.children.at(-1).userData.noInk=true;
  g.children.at(-1).material=w.material(0xc48c88,{side:THREE.DoubleSide});
  const cap=w.mesh(new THREE.SphereGeometry(1,18,10,0,TAU,0,Math.PI*.66),hairColor,0,2.426,-.035);cap.scale.set(.208,.19,.191);g.add(cap);
  // Back layers and face-framing locks have a full oval cross-section.
  const longHair=identity==='ilyra'||identity==='merchant'||identity==='sera';
  for(let i=0;i<9;i++){
    const a=.94+i/8*(TAU-1.88),x=Math.sin(a),z=Math.cos(a);
    g.add(strand(w,[[x*.092,2.592,z*.085-.031],[x*.213,2.483,z*.198-.027],[x*.223,2.326,z*.206-.023],[x*(longHair?.22:.216),longHair?1.88:2.177,z*(longHair?.23:.215)-.018]],.060,.041,i%4===0?hairShade:hairColor,7,6));
  }
  for(const [x,endX,endY] of [[-.134,-.151,2.384],[-.068,-.046,2.422],[.018,.079,2.447],[.090,.184,2.397]]){
    g.add(strand(w,[[x*.35,2.607,.016],[x,2.563,.137],[x+.026,2.490,.183],[endX,endY,.178]],.052,.025,hairColor,7,6));
  }
  // One swept crown lock adds movement without a spiky crown of flat ribbons.
  g.add(strand(w,[[-.116,2.566,-.11],[-.023,2.669,-.145],[.151,2.594,-.219]],.061,.035,hairColor,7,6));
  const faceGroup=new THREE.Group();
  for(const child of g.children.slice(headStart)){child.position.y-=2.17;faceGroup.add(child);}
  faceGroup.position.y=2.17;
  if(['ilyra','sera','merchant'].includes(identity))faceGroup.scale.set(.95,.98,1.015);
  g.add(faceGroup);
  if(identity==='elian'){g.add(plate(w,[[-.135,1.934,.21],[.135,1.934,.21],[.205,.80,.232],[-.205,.80,.232]],0xa78665,.028));}
  if(identity==='merchant')g.add(oval(w,0x917055,.264,1.32,-.015,.108,.137,.094));
  if(player){
    const staff=new THREE.Group();staff.position.set(.435,.03,.105);
    staff.add(w.cyl(.022,.031,2.32,0x4e4351,0,1.18,0,8));
    staff.add(w.mesh(new THREE.OctahedronGeometry(.135),0x9ae0ef,0,2.45,0,{emissive:0x438bac,emissiveIntensity:.65}));
    staff.add(w.mesh(new THREE.TorusGeometry(.18,.019,6,20),GOLD,0,2.40,0));
    for(const s of [-1,1]){const prong=w.mesh(new THREE.ConeGeometry(.049,.29,4),GOLD,s*.16,2.53,0);prong.rotation.z=-s*.32;staff.add(prong);}
    for(const y of [.13,1.04,1.12,2.12])staff.add(w.cyl(.041,.041,.040,GOLD,0,y,0,8));g.add(staff);g.userData.staff=staff;
    const sword=new THREE.Group();sword.position.set(-.265,1.34,-.23);sword.rotation.z=-.23;
    sword.add(w.box(.060,.76,.050,0x46586d,0,-.40,0),w.box(.23,.039,.065,GOLD),w.cyl(.032,.032,.16,0x584744,0,.10,0));g.add(sword);
  }
  g.traverse(o=>{if(o.isMesh){o.userData.softSurface=true;o.userData.ink=!o.userData.noInk;if(o.userData.ink)o.material=w.inkMaterial(o.material);}});
  if(w.renderer.isSoftwareRenderer){const shadow=new THREE.Mesh(new THREE.CircleGeometry(.57,20),new THREE.MeshBasicMaterial({color:0x263c49,transparent:true,opacity:.19,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.135;shadow.scale.y=.63;shadow.userData.shadow=true;g.add(shadow);}
  return g;
}
