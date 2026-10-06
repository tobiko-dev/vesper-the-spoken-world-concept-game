import * as THREE from 'three';
export {createCharacter} from './character-art.js';

// Shared visual language: ink silhouettes, sculpted cloth and three-tone light.
const TAU = Math.PI * 2;
const INK = 0x213344;
const GOLD = 0xe9c677;
const IVORY = 0xf7e5bb;

function ellipsoid(w, color, x, y, z, sx, sy, sz, detail = 12) {
  const m = w.mesh(new THREE.SphereGeometry(1, detail, 8), color, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function tube(w, points, radius, color) {
  return w.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 10, radius, 4, false), color);
}
function panel(w, points, color) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
  const m = w.mesh(new THREE.ShapeGeometry(shape), color);
  m.material = w.material(color, {side: THREE.DoubleSide});
  return m;
}
function hairLock(w, start, middle, end, width, color) {
  const path = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...start), new THREE.Vector3(...middle), new THREE.Vector3(...end));
  const vertices = [], indices = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5, p = path.getPoint(t), b = width * (1 - t) * (.8 + Math.sin(t * Math.PI) * .3);
    vertices.push(p.x - b, p.y, p.z, p.x, p.y + .018, p.z + b * .35, p.x + b, p.y, p.z);
    if (i < 5) for (let j = 0; j < 2; j++) { const a = i * 3 + j; indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  return w.mesh(geo, color, 0, 0, 0, {side: THREE.DoubleSide});
}
function cloth(w, color, width, length, z = -.17) {
  const geo = new THREE.PlaneGeometry(width, length, 6, 6), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const y = a.getY(i), f = (.5 - y / length); a.setXYZ(i, a.getX(i) * (.64 + f * .42), y - length / 2, z - f * .17 + Math.cos(a.getX(i) * 15) * f * .045); }
  geo.computeVertexNormals();
  return w.mesh(geo, color, 0, 0, 0, {side: THREE.DoubleSide});
}
function contactShadow(w, radius, x = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshBasicMaterial({color: 0x273f50, transparent: true, opacity: .19, depthWrite: false}));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .135, z); m.scale.y = .60;
  m.material.userData.outlineParameters = {visible: false}; m.userData.shadow = true; return m;
}

export function createCreature(w, kind) {
  const g = new THREE.Group();
  if (kind === 'boss') {
    const violet = 0x655380, armor = 0xe9ddbf;
    const skirt = w.mesh(new THREE.CylinderGeometry(.65, 1.3, 2.75, 14, 1, true), violet, 0, 1.85, 0); g.add(skirt);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, plate = panel(w, [[-.21, 0], [.21, 0], [.30, -1.55], [0, -1.87], [-.30, -1.55]], i % 2 ? 0xc5c5c5 : armor); plate.position.set(Math.sin(a) * .8, 2.6, Math.cos(a) * .8); plate.rotation.y = a; g.add(plate); }
    g.add(ellipsoid(w, armor, 0, 3.20, 0, .83, .82, .47));
    const mask = ellipsoid(w, 0xffeaca, 0, 4.38, .05, .48, .66, .34); g.add(mask);
    for (const s of [-1, 1]) {
      g.add(tube(w, [[s * .05, 4.84, .37], [s * .30, 4.43, .37], [s * .12, 4.0, .30]], .024, GOLD));
      g.add(tube(w, [[s * .08, 4.46, .38], [s * .23, 4.44, .36], [s * .30, 4.52, .30]], .04, INK));
      g.add(ellipsoid(w, GOLD, s * .18, 4.46, .39, .06, .015, .015));
      const shoulder = w.mesh(new THREE.OctahedronGeometry(.66), armor, s * 1.02, 3.58, 0); shoulder.scale.set(1.15, .66, .85); g.add(shoulder);
      const arm = w.cyl(.24, .20, 1.8, violet, s * 1.3, 2.49, 0, 10); arm.rotation.z = s * .16; g.add(arm);
      g.add(w.cyl(.32, .25, .65, armor, s * 1.43, 1.97, .02, 10));
      g.add(ellipsoid(w, INK, s * 1.49, 1.5, .06, .22, .3, .17));
      g.add(hairLock(w, [s * .30, 4.7, -.17], [s * .70, 3.4, -.37], [s * .96, 2.36, -.17], .24, 0xe1d8c3));
    }
    const halo = new THREE.Group(); halo.position.set(0, 4.66, -.37); halo.add(w.mesh(new THREE.TorusGeometry(1.01, .07, 6, 48), GOLD));
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, ray = w.mesh(new THREE.ConeGeometry(.075, .50, 4), GOLD, Math.sin(a) * 1.22, Math.cos(a) * 1.22, 0); ray.rotation.z = -a; halo.add(ray); }
    g.add(halo); g.userData.halo = halo;
    g.add(w.mesh(new THREE.OctahedronGeometry(.22), 0xc995da, 0, 3.35, .50, {emissive: 0x775699, emissiveIntensity: .5}));
  } else {
    const fur = 0x74a5b9, pale = 0xcae8e8;
    g.add(ellipsoid(w, fur, 0, 1.02, -.08, .43, .50, .77));
    g.add(ellipsoid(w, pale, 0, 1.4, .48, .29, .39, .26));
    g.add(ellipsoid(w, fur, 0, 1.61, .68, .28, .30, .34));
    g.add(ellipsoid(w, 0xe4f7ec, 0, 1.47, .98, .18, .13, .19));
    g.add(ellipsoid(w, 0x283c54, 0, 1.51, 1.12, .10, .065, .06));
    for (const s of [-1, 1]) {
      for (const z of [-.5, .43]) { const leg = w.cyl(.09, .057, .75, fur, s * .29, .47, z, 8); g.add(leg); g.add(ellipsoid(w, 0x37465e, s * .29, .1, z + .04, .085, .085, .14)); }
      const ear = w.mesh(new THREE.ConeGeometry(.12, .42, 4), pale, s * .26, 1.96, .63); ear.rotation.z = -s * .45; g.add(ear);
      g.add(ellipsoid(w, INK, s * .21, 1.68, .89, .08, .06, .017));
      g.add(ellipsoid(w, 0xebacd8, s * .21, 1.686, .905, .039, .044, .012));
      g.add(tube(w, [[s * .18, 1.88, .49], [s * .33, 2.21, .39], [s * .52, 2.45, .43]], .035, IVORY));
      g.add(tube(w, [[s * .31, 2.16, .40], [s * .57, 2.23, .57], [s * .67, 2.37, .62]], .025, IVORY));
    }
    const tail = w.mesh(new THREE.ConeGeometry(.16, .80, 6), pale, 0, 1.14, -.99); tail.rotation.x = -1.1; g.add(tail);
    for (let i = 0; i < 5; i++) { const crystal = w.mesh(new THREE.OctahedronGeometry(.12), 0xc6c0ed, 0, 1.52, -.58 + i * .23); crystal.scale.y = 1.5; g.add(crystal); }
  }
  g.traverse(o => { if (o.isMesh) {o.userData.ink = true;o.material=w.inkMaterial(o.material);} });
  if (w.renderer.isSoftwareRenderer) g.add(contactShadow(w, kind === 'boss' ? 1.8 : 1));
  return g;
}

export function createHouse(w, x, z, width = 8, depth = 8, height = 5, roofColor = 0x427c92) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const wall = w.box(width, height, depth, IVORY, 0, height / 2, 0); wall.material = w.surface('stone', 0xffffff, width / 4, height / 3); g.add(wall);
  const roof = w.mesh(new THREE.ConeGeometry(width * .83, height > 10 ? 7 : 3.4, 4), roofColor, 0, height + (height > 10 ? 3.4 : 1.6), 0); roof.rotation.y = Math.PI / 4; roof.scale.z = depth / width; roof.material = w.surface('roof', 0xffffff, 2, 1.5); g.add(roof);
  g.add(w.box(width + .3, .42, depth + .3, 0x7a8b88, 0, .21, 0));
  // Oak frame, ridge gilding, deep window reveals, shutters and porch steps.
  for (const side of [-1, 1]) { g.add(w.box(.22, height, .22, 0x52656b, side * (width / 2 - .1), height / 2, depth / 2 + .04)); g.add(w.box(width + .65, .21, .28, 0x384f61, 0, height, side * (depth / 2 + .12))); }
  g.add(w.box(width + .2, .17, .24, 0x587077, 0, height * .48, depth / 2 + .08));
  g.add(w.box(1.78, 2.8, .18, 0x304452, 0, 1.45, depth / 2 + .12));
  g.add(w.box(1.36, 2.5, .20, 0x6b6760, 0, 1.32, depth / 2 + .20));
  g.add(w.mesh(new THREE.TorusGeometry(.065, .017, 5, 12), GOLD, .39, 1.28, depth / 2 + .33));
  g.add(w.box(2.15, .18, 1.0, 0xd3c6a4, 0, .11, depth / 2 + .43));
  for (const v of [-width * .31, width * .31]) {
    g.add(w.box(1.58, 1.96, .24, 0x47606b, v, height * .61, depth / 2 + .10));
    g.add(w.box(1.27, 1.59, .26, 0xffd490, v, height * .61, depth / 2 + .14));
    g.add(w.box(.09, 1.68, .31, IVORY, v, height * .61, depth / 2 + .17));
    g.add(w.box(1.38, .10, .31, IVORY, v, height * .61, depth / 2 + .17));
    g.add(w.box(1.8, .18, .48, 0x51656a, v, height * .61 - 1, depth / 2 + .21));
    if (height < 10) { g.add(w.box(1.68, .38, .42, 0x9b7354, v, height * .61 - 1.23, depth / 2 + .25)); for (let j = 0; j < 5; j++) g.add(ellipsoid(w, j % 2 ? 0xf2c0ce : 0x86b769, v - .6 + j * .29, height * .61 - .98, depth / 2 + .33, .20, .20, .17, 6)); }
  }
  if (height < 10) {
    g.add(w.box(.9, 2.2, 1, IVORY, -width * .28, height + 1.8, -depth * .13));
    g.add(w.box(1.18, .25, 1.22, 0x556f7e, -width * .28, height + 2.91, -depth * .13));
    const awning = w.box(3, .16, 1.6, 0x527f82, 0, 3.15, depth / 2 + .6); awning.rotation.x = .15; g.add(awning);
    for (const side of [-1, 1]) g.add(w.cyl(.045, .06, 2.9, 0x6d6a54, side * 1.3, 1.45, depth / 2 + 1.16, 8));
  }
  if (w.renderer.isSoftwareRenderer) { const shadow = contactShadow(w, width * .72, width * .28, -depth * .25); shadow.scale.y = depth / width; g.add(shadow); }
  w.scene.add(g); w.block(x, z, width, depth, height + 4); return g;
}

export function addWorldDetail(w) {
  // Academy banners, gallery columns, roof finials and garden beds.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = s * (7 + i * 2.8); w.scene.add(w.cyl(.15, .19, 6.4, IVORY, x, 6.3, -40.03, 10));
      if (i % 2 === 0) { const banner = cloth(w, 0x347f96, 1.05, 3.4, 0); banner.position.set(x, 9, -39.8); w.scene.add(banner); w.banners.push(banner); const emblem = w.mesh(new THREE.TorusGeometry(.25, .025, 4, 20), GOLD, x, 7.8, -39.71); w.scene.add(emblem); }
    }
    for (const z of [-28, -16]) {
      w.scene.add(w.box(2.2, .3, 5, 0xb3b99c, s * 11, .15, z));
      for (let j = 0; j < 8; j++) w.scene.add(ellipsoid(w, j % 3 ? 0x80b871 : 0xe8c4dc, s * 11 + Math.sin(j * 4) * .65, .6, z - 2 + j * .55, .6, .45, .6, 8));
    }
  }
  // Town street furniture anchors the painted architecture in the world.
  for (const [x, z] of [[-9, 42], [10, 54], [18, 46]]) {
    w.scene.add(w.box(2.4, .18, .62, 0x947450, x, .72, z));
    for (const s of [-1, 1]) w.scene.add(w.box(.14, .75, .48, 0x475d64, x + s * .9, .37, z));
    w.scene.add(w.box(2.4, .65, .12, 0x947450, x, 1.13, z - .25));
  }
  for (const [x, z] of [[-24, 50], [19, 60], [26, 41]]) for (let i = 0; i < 2; i++) {
    w.scene.add(w.cyl(.38, .34, .86, 0x8b7354, x + i * .78, .43, z, 12));
    for (const y of [.16, .70]) w.scene.add(w.cyl(.393, .393, .05, 0x465d63, x + i * .78, y, z, 12));
  }
  // A bridge-like pergola and reflected lilies at Mirrorwater.
  const dock = w.box(4, .22, 7.5, 0xac9063, 41, .18, 64); w.scene.add(dock);
  for (let i = 0; i < 9; i++) w.scene.add(w.box(4, .025, .035, 0x635c52, 41, .31, 60.5 + i * .8));
  for (const z of [61, 67]) for (const x of [39.2, 42.8]) w.scene.add(w.cyl(.085, .12, 1.25, 0x947451, x, .50, z, 8));
  for (let i = 0; i < 12; i++) { const x = 53 + Math.sin(i * 2) * 10, z = 66 + Math.cos(i * 3) * 7, leaf = w.mesh(new THREE.CircleGeometry(.4, 12), 0x85ae70, x, .19, z, {side: THREE.DoubleSide}); leaf.rotation.x = -Math.PI / 2; w.scene.add(leaf); if (i % 3 === 0) w.scene.add(ellipsoid(w, 0xf5ceda, x, .32, z, .22, .18, .22, 8)); }
}

export function createSky(w) {
  const texture = new THREE.TextureLoader().load('/art/sky.webp'); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.MirroredRepeatWrapping; texture.repeat.x = 2;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(370, 40, 24), new THREE.MeshBasicMaterial({map: texture, side: THREE.BackSide, fog: false, depthWrite: false}));
  sky.material.userData.outlineParameters = {visible: false};
  sky.rotation.y = -.8; sky.userData.sky = true; sky.renderOrder = -20; w.scene.add(sky);
  if (w.renderer.isSoftwareRenderer) w.renderer.setSky('/art/sky.webp');
}

export function createNature(w) {
  const rand = w.random, pts = [];
  for (let i = 0; i < 1000 && pts.length < 170; i++) {
    const x = (rand() - .5) * 256, z = (rand() - .5) * 260;
    const near = Math.abs(x) < 11 || Math.abs(z - 48) < 10 && Math.abs(x) < 42 || Math.hypot(x - 60, z + 5) < 22 || Math.abs(x - 66) < 13 && z < -12 || Math.abs(x + 60) < 12 && Math.abs(z + 30) < 15 || Math.abs(x - 51) < 21 && Math.abs(z - 64) < 18 || Math.abs(x) < 36 && z < -25 || Math.abs(x - 66) < 22 && z < -55 || Math.abs(z - (32 - x * .48)) < 7 && x > 0 && x < 62 || Math.abs(z - (-6 + x * .43)) < 6 && x < 0 && x > -62;
    if (!near) pts.push([x, z, .7 + rand() * .8, rand()]);
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.19, .37, 5.4, 7), w.material(0x756f57), pts.length);
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 6), w.material(0xffffff), pts.length * 5), dummy = new THREE.Object3D();
  pts.forEach(([x, z, s, r], i) => {
    if (w.renderer.isSoftwareRenderer) { const shadow = contactShadow(w, s * 3, x + s, z - s); w.scene.add(shadow); }
    dummy.position.set(x, s * 2.7, z); dummy.scale.set(s, s, s); dummy.rotation.set(0, r * TAU, .035); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 5; j++) { const a = j * 2.4, upper = j === 4; dummy.position.set(x + (upper ? 0 : Math.sin(a) * 1.3 * s), s * (upper ? 7.7 : 5.6 + j * .25), z + (upper ? 0 : Math.cos(a) * 1.2 * s)); dummy.scale.set(s * (upper ? 2.1 : 2.45), s * (upper ? 1.8 : 1.7), s * 2.05); dummy.updateMatrix(); crown.setMatrixAt(i * 5 + j, dummy.matrix); const color = new THREE.Color().setHSL(r > .88 ? .92 : .23 + r * .12, r > .88 ? .38 : .40, .42 + j * .028 + r * .08); crown.setColorAt(i * 5 + j, color); }
  });
  trunk.castShadow = crown.castShadow = crown.receiveShadow = true; w.scene.add(trunk, crown);
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(.075, .42, 3), w.material(0xabc67e), 1100);
  for (let i = 0; i < grass.count; i++) { const x = (rand() - .5) * 220, z = (rand() - .5) * 220; dummy.position.set(x, Math.abs(x) < 8 ? -.4 : .16, z); dummy.scale.set(1, .5 + rand(), 1); dummy.rotation.set(0, rand() * TAU, 0); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix); } w.scene.add(grass);
  const flowers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.10), w.material(0xf8e5ab), 450);
  for (let i = 0; i < flowers.count; i++) { const x = (rand() - .5) * 175, z = (rand() - .5) * 175; dummy.position.set(x, Math.abs(x) < 8 ? -1 : .34, z); dummy.scale.set(1, .7, 1); dummy.updateMatrix(); flowers.setMatrixAt(i, dummy.matrix); flowers.setColorAt(i, new THREE.Color(i % 3 ? 0xffefb8 : 0xdfb9e2)); } w.scene.add(flowers);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), w.material(0x8faba0), 70);
  for (let i = 0; i < rocks.count; i++) { const x = (rand() - .5) * 250, z = (rand() - .5) * 250; dummy.position.set(x, Math.abs(x) < 30 || Math.hypot(x - 66, z + 78) < 22 ? -3 : .3, z); dummy.scale.set(1 + rand() * 2, .6 + rand(), 1 + rand()); dummy.rotation.set(rand(), rand() * TAU, rand()); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix); } rocks.castShadow = true; w.scene.add(rocks);
  const positions = new Float32Array(160 * 3); for (let i = 0; i < 160; i++) { positions[i * 3] = (rand() - .5) * 150; positions[i * 3 + 1] = 1 + rand() * 8; positions[i * 3 + 2] = (rand() - .5) * 170; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); w.motes = new THREE.Points(geo, new THREE.PointsMaterial({color: 0xffe3a1, size: .11, transparent: true, opacity: .8, depthWrite: false})); w.scene.add(w.motes);
}

export function castSigil(w, x, z, color, level = 1) {
  const g = new THREE.Group(); g.position.set(x, .10, z);
  const m = new THREE.MeshBasicMaterial({color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending});
  for (const r of [1.05, 1.34, 1.45]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r - .023, r, 64), m); ring.rotation.x = -Math.PI / 2; g.add(ring); }
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; const mark = new THREE.Mesh(new THREE.PlaneGeometry(.075, .18), m); mark.rotation.set(-Math.PI / 2, 0, a); mark.position.set(Math.sin(a) * 1.20, 0, Math.cos(a) * 1.20); g.add(mark); }
  const star = new THREE.Mesh(new THREE.RingGeometry(.65, .68, 3), m); star.rotation.x = -Math.PI / 2; g.add(star);
  const star2 = star.clone(); star2.rotation.z = Math.PI; g.add(star2);
  w.scene.add(g); w.sigilEffects.push({mesh: g, material: m, life: 1.15, max: 1.15, level});
}
