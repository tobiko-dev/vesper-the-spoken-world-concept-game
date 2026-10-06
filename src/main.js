import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { playableSpells, futureSpells, matchSpellFromSpeech, findAnySpellByName } from './spells.js';
import { createWorld } from './world.js';

const SAVE_KEY = 'vesper-spoken-world-save-v2';
const root = document.querySelector('#app');

const state = {
  name: 'Wayfarer',
  mana: 100,
  hp: 100,
  quest: 0,
  paused: false,
  started: false,
  selectedSpell: playableSpells[0],
  cooldowns: new Map(),
  shieldUntil: 0,
  lastSaved: null,
  position: { x: 0, y: 0, z: 7 },
  voiceStatus: 'Voice ready',
  lastTranscript: '',
  helpSpell: null
};

const ui = document.createElement('div');
ui.className = 'ui-shell';
root.append(ui);

const gameCanvas = document.createElement('canvas');
gameCanvas.id = 'game-canvas';
root.prepend(gameCanvas);

const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79b9df);
scene.fog = new THREE.FogExp2(0xa8d6e7, 0.0065);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 300);
let cameraYaw = 0;
let cameraPitch = 0.42;
let cameraDistance = 12;

scene.add(new THREE.HemisphereLight(0xc6ebff, 0x7da25c, 2.7));
const sun = new THREE.DirectionalLight(0xfff4d5, 3.2);
sun.position.set(-20, 35, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const { player, npc, waylights } = createWorld(THREE, scene, state);

const keys = new Set();
let dragging = false;
let px = 0, py = 0;
addEventListener('keydown', (e) => {
  if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  keys.add(e.code);
  if (e.code === 'Escape') togglePause();
  if (e.code === 'KeyJ') openBook('journal');
  if (e.code === 'KeyG') openBook('grimoire');
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyV') beginVoiceCast();
  const n = Number(e.key);
  if (n >= 1 && n <= 9) castSpell(playableSpells[n - 1], .65, 'assisted');
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('pointerdown', e => { if (e.button === 2) { dragging = true; px = e.clientX; py = e.clientY; } });
addEventListener('pointerup', e => { if (e.button === 2) dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging || state.paused) return;
  cameraYaw -= (e.clientX - px) * .006;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + (e.clientY - py) * .004, .12, 1.08);
  px = e.clientX; py = e.clientY;
});
addEventListener('wheel', e => cameraDistance = THREE.MathUtils.clamp(cameraDistance + e.deltaY * .01, 7, 18), { passive:true });

const spellEffects = [];
function effectMesh(spell) {
  const color = {
    fire: 0xff7f43, heal:0x6fe7c4, shield:0x8fc9ff, wind:0xc8fff1,
    ice:0x9ee7ff, blade:0xffaa66, lightning:0xd3c7ff, star:0xfff1a8
  }[spell.effect] || 0xffffff;
  if (spell.effect === 'shield') {
    const shield = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 16), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.22, wireframe:true }));
    shield.position.copy(player.position).add(new THREE.Vector3(0,2.2,0));
    scene.add(shield);
    spellEffects.push({ mesh:shield, born:performance.now(), life:6000, follow:true });
    state.shieldUntil = performance.now() + 6000;
    return;
  }
  if (spell.effect === 'heal') {
    state.hp = Math.min(100, state.hp + 24);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4,.08,8,40), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.9}));
    ring.rotation.x = Math.PI/2;
    ring.position.copy(player.position).add(new THREE.Vector3(0,.15,0));
    scene.add(ring);
    spellEffects.push({mesh:ring,born:performance.now(),life:1100,scale:true});
    return;
  }
  const geom = spell.effect === 'star' ? new THREE.IcosahedronGeometry(.8,1) : new THREE.SphereGeometry(.38,12,8);
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  mesh.position.copy(player.position).add(new THREE.Vector3(0,2.3,0)).add(forward.clone().multiplyScalar(2));
  if (spell.effect === 'star') mesh.position.y += 10;
  scene.add(mesh);
  spellEffects.push({mesh,born:performance.now(),life:spell.effect==='star'?1500:1200,velocity: spell.effect==='star' ? new THREE.Vector3(0,-8,0) : forward.multiplyScalar(12)});
}

function toast(message, tone='normal') {
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.textContent = message;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(()=>el.remove(),300); }, 2300);
}

function castSpell(spell, potency = 1, source = 'voice') {
  if (!state.started || state.paused) return;
  const now = performance.now();
  const readyAt = state.cooldowns.get(spell.name) || 0;
  if (readyAt > now) return toast(`${spell.name} is still recovering.`, 'warn');
  if (state.mana < spell.mana) return toast('Not enough mana.', 'warn');
  state.mana -= spell.mana;
  state.selectedSpell = spell;
  state.cooldowns.set(spell.name, now + spell.recovery * 1000);
  effectMesh(spell);
  state.helpSpell = spell;
  state.lastTranscript = source === 'voice' ? `Level ${spell.level}. ${spell.name}.` : '';
  toast(`${spell.name} · ${source === 'voice' ? 'voice cast' : `assisted ${Math.round(potency*100)}%`}`);
  renderHud();
  renderSpellHelp();
}

function nearestInteractable() {
  const p = player.position;
  const items = [npc, ...waylights.filter(w => !w.userData.active)];
  return items.map(obj => ({ obj, d: obj.position.distanceTo(p) })).sort((a,b)=>a.d-b.d)[0];
}

function interact() {
  if (!state.started || state.paused) return;
  const hit = nearestInteractable();
  if (!hit || hit.d > 5.2) return toast('Nothing nearby answers.');
  if (hit.obj.userData.kind === 'npc') {
    openDialogue();
  } else if (hit.obj.userData.kind === 'waylight') {
    hit.obj.userData.active = true;
    const gem = hit.obj.userData.gem || hit.obj;
    gem.material.emissive.setHex(0x68d9ff);
    gem.material.emissiveIntensity = 2.2;
    state.quest = Math.min(3, state.quest + 1);
    toast(`Waylight awakened · ${state.quest}/3`);
    renderHud(); saveGame();
  }
}

function openDialogue() {
  state.paused = true;
  const panel = document.createElement('div');
  panel.className = 'modal dialogue';
  panel.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="eyebrow">ILYRA · KEEPER OF THE WAYLIGHTS</div>
    <h2>“The road listens before the Academy does.”</h2>
    <p>${state.quest < 3 ? 'Wake the three waylights on the academy road. Do not rush the words. A spell cast carelessly still remembers its caster.' : 'All three are awake. Bellwether can see the road again. When you are ready, walk north and let the Academy decide what it thinks of you.'}</p>
    <div class="dialogue-actions">
      <button data-line="spells">Ask about spell levels</button>
      <button data-line="voice">Ask about voice casting</button>
      <button data-line="academy">Ask about the Academy</button>
    </div>
    <p class="reply" id="reply"></p>`;
  ui.append(panel);
  panel.querySelector('.close').onclick = () => { panel.remove(); state.paused = false; };
  panel.querySelectorAll('[data-line]').forEach(btn => btn.onclick = () => {
    const replies = {
      spells: 'Levels are not grades. They describe the spell itself. A gifted novice can know a high spell and still lack the mana, control, or experience to survive using it.',
      voice: 'The name and level must still be spoken. Long invocations guide the structure; masters can abandon the scaffolding, but not the declaration.',
      academy: 'The Academy likes clean answers. The Unbound Road likes useful ones. Either path can make a mage — neither guarantees a good one.'
    };
    panel.querySelector('#reply').textContent = replies[btn.dataset.line];
  });
}

function beginVoiceCast() {
  if (!state.started || state.paused) return;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    state.voiceStatus = 'Voice unavailable — use 1–9';
    renderHud();
    toast('Speech recognition is unavailable in this browser. Keyboard casting still works.', 'warn');
    return;
  }
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  state.voiceStatus = 'Listening…'; renderHud();
  recognition.onresult = (event) => {
    const options = [...event.results[0]].map(x => x.transcript);
    state.lastTranscript = options[0] || '';
    const spell = options.map(matchSpellFromSpeech).find(Boolean);
    if (spell) castSpell(spell, 1, 'voice');
    else {
      const lore = options.map(findAnySpellByName).find(Boolean);
      if (lore && futureSpells.includes(lore)) toast(`${lore.name} is recorded as locked lore, not a Chapter I cast.`, 'warn');
      else toast(`The world did not recognize “${state.lastTranscript}”. Say the level and spell name.`, 'warn');
    }
  };
  recognition.onerror = () => { state.voiceStatus = 'Voice ready'; renderHud(); };
  recognition.onend = () => { state.voiceStatus = 'Voice ready'; renderHud(); };
  recognition.start();
}

function saveGame() {
  const payload = {
    name: state.name, hp: state.hp, mana: state.mana, quest: state.quest,
    position: { x: player.position.x, y: 0, z: player.position.z },
    awakened: waylights.map(w => !!w.userData.active),
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  state.lastSaved = payload.savedAt;
  renderHud();
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    state.name = s.name || state.name;
    state.hp = s.hp ?? 100; state.mana = s.mana ?? 100; state.quest = s.quest ?? 0;
    state.lastSaved = s.savedAt || null;
    if (s.position) player.position.set(s.position.x || 0, 0, s.position.z || 7);
    (s.awakened || []).forEach((active, i) => {
      if (active && waylights[i]) {
        waylights[i].userData.active = true;
        const gem = waylights[i].userData.gem || waylights[i];
        gem.material.emissive.setHex(0x68d9ff);
        gem.material.emissiveIntensity = 2.2;
      }
    });
    return true;
  } catch { return false; }
}

function startScreen() {
  ui.innerHTML = `
    <section class="title-screen">
      <div class="title-card">
        <div class="eyebrow">A VOICEBOUND CHRONICLE</div>
        <div class="chapter">CHAPTER I · THE QUIET BETWEEN BELLS</div>
        <h1>VESPER</h1>
        <h2>THE SPOKEN WORLD</h2>
        <p class="tagline">The world remembers every word. What will it remember of yours?</p>
        <label>YOUR NAME<input id="name-input" maxlength="24" value="Wayfarer" aria-label="Your character's name" /></label>
        <button class="primary" id="begin">Begin your story</button>
        <button class="secondary" id="discover">Discover the world</button>
        <button class="secondary" id="controls">Controls & settings</button>
        <div class="footer-note">SINGLE PLAYER · VOICE SPELLCASTING<br/>Lantern Vale, Year 430 ◆ First bell season</div>
      </div>
    </section>`;
  const input = ui.querySelector('#name-input');
  ui.querySelector('#begin').onclick = () => {
    state.name = input.value.trim() || 'Wayfarer';
    const hadSave = loadGame();
    if (!hadSave) player.position.set(0,0,7);
    state.started = true;
    ui.innerHTML = '';
    renderHud();
    toast(hadSave ? 'Chronicle restored.' : 'Bellwether remembers your first step.');
  };
  ui.querySelector('#discover').onclick = () => openBook('codex', true);
  ui.querySelector('#controls').onclick = () => showControls(true);
}

function renderHud() {
  if (!state.started) return;
  const existing = ui.querySelector('.hud'); if (existing) existing.remove();
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="hud-card player-card">
      <div class="portrait" aria-hidden="true"><b>E</b></div><div><strong>${escapeHtml(state.name)}</strong><span>Unaffiliated</span>
      <div class="bar"><i style="width:${state.hp}%"></i></div>
      <div class="bar mana"><i style="width:${state.mana}%"></i></div></div>
    </div>
    <div class="hud-card quest-card"><small>YOUR CHRONICLE</small><h3>A light worth keeping</h3><p>Wake the three waylights on the academy road with Tinder. ${state.quest}/3</p><span>Open journal · J</span></div>
    <div class="location">W&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;N&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;E<br/><strong>Bellwether</strong></div>
    <div class="menu-buttons"><button data-book="atlas">⌘</button><button data-book="journal">▤</button><button data-book="grimoire">▭</button><button data-book="codex">◉</button><button data-settings>⚙</button></div>
    <div class="minimap" aria-label="Bellwether minimap"><i class="map-road"></i><i class="map-player"></i><i class="map-light l1"></i><i class="map-light l2"></i><i class="map-light l3"></i><span>Bellwether</span></div>
    <div class="voice-state">${state.voiceStatus}</div>
    <div class="hotbar">${playableSpells.map(s => `<button data-slot="${s.slot}" class="${state.selectedSpell?.name===s.name?'selected':''}"><b>${s.slot}</b><span>${spellGlyph(s.effect)}</span><em>${s.level}</em></button>`).join('')}</div>
    <div class="cast-controls"><button id="voice-cast">V · INVOKE</button><span>Voice 100% · Assisted 65% · E interact · right-drag camera</span></div>
    <div class="autosave">Auto-save · this browser${state.lastSaved ? ` · ${new Date(state.lastSaved).toLocaleTimeString()}` : ''}</div>`;
  ui.append(hud);
  hud.querySelectorAll('[data-slot]').forEach(btn => btn.onclick = () => castSpell(playableSpells[Number(btn.dataset.slot)-1], .65, 'assisted'));
  hud.querySelector('#voice-cast').onclick = beginVoiceCast;
  hud.querySelectorAll('[data-book]').forEach(btn => btn.onclick = () => openBook(btn.dataset.book));
  hud.querySelector('[data-settings]').onclick = () => showControls(false);
}

function spellGlyph(effect) {
  return ({fire:'♨',heal:'♒',shield:'⬟',wind:'≋',ice:'❄',blade:'⚔',lightning:'ϟ',star:'☆'})[effect] || '✦';
}

function renderSpellHelp() {
  ui.querySelector('.spell-help')?.remove();
  if (!state.helpSpell || state.paused) return;
  const spell = state.helpSpell;
  const el = document.createElement('div');
  el.className = 'spell-help';
  el.innerHTML = `<button class="close">×</button><h3>${spell.name}</h3><p>Ready to cast again after ${spell.recovery}s.</p><p>${spell.description}</p><blockquote>“${spell.invocation}”</blockquote><div><span>${spell.slot} · assisted cast (65% potency)</span><span>V · voice cast</span></div>`;
  el.querySelector('.close').onclick = () => { state.helpSpell = null; el.remove(); };
  ui.append(el);
}

function bookShell(active) {
  const panel = document.createElement('section');
  panel.className = 'book modal';
  panel.innerHTML = `
    <button class="close">×</button><div class="eyebrow">VESPER · THE SPOKEN WORLD</div>
    <h2>${active==='grimoire'?'The grimoire':active==='journal'?'Your chronicle':active==='atlas'?'The atlas':'The codex'}</h2>
    <p class="book-sub">${active==='grimoire'?'Every great spell begins as an imperfect small one.':'The world is paused while you are here.'}</p>
    <nav>${['journal','grimoire','atlas','codex'].map(x=>`<button data-tab="${x}" class="${x===active?'active':''}">${cap(x)}</button>`).join('')}</nav>
    <div class="book-body"></div><footer>Ⅱ THE WORLD IS PAUSED <span>World guide ↓</span></footer>`;
  panel.querySelector('.close').onclick = () => { panel.remove(); state.paused = false; renderHud(); };
  panel.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => { panel.remove(); openBook(btn.dataset.tab); });
  return panel;
}

function openBook(tab='journal', fromTitle=false) {
  if (!state.started && !fromTitle) return;
  state.paused = true;
  ui.querySelectorAll('.modal').forEach(x => x.remove());
  const panel = bookShell(tab);
  const body = panel.querySelector('.book-body');
  if (tab === 'journal') body.innerHTML = `<div class="journal-entry"><small>ACTIVE</small><h3>A light worth keeping</h3><p>Wake the three waylights on the academy road.</p><strong>${state.quest}/3 awakened</strong><hr/><p>Ilyra says the Academy judges answers. The road judges whether your magic survives contact with the world.</p></div>`;
  if (tab === 'atlas') body.innerHTML = `<div class="cards">${[['Bellwether','The first-bell town at the foot of the Academy road.'],['Hushwood','A forest where sound behaves strangely.'],['Northwatch','A cold frontier settlement built around old wards.'],['Sunken Choir','Ruins beneath the vale where silence has weight.']].map(([a,b])=>`<article><h3>${a}</h3><p>${b}</p></article>`).join('')}</div>`;
  if (tab === 'codex') body.innerHTML = `<div class="codex"><h3>Magic is spoken structure</h3><p>Spell levels run from 1 to 10. The declaration — level and spell name — remains mandatory even for masters who can cast without an incantation. Parallel casting is a rare discipline beyond ordinary direct casting.</p><h3>Ranks are people, not spells</h3><p>Adventurer ranks run E → A → S → SS. Spell level, personal rank, refinement and mana control are separate measures.</p><h3>Level Ten</h3><p>Level 10 spells are mythic and are often named for their creators, especially the magic emperors associated with an element.</p><h3>Creative inspiration</h3><p>Vesper’s spellcasting progression was inspired in part by <em>Rakudai Kenja no Gakuin Musou: Nidome no Tensei, S-Rank Cheat Majutsushi Boukenroku</em>. Vesper uses its own setting, characters and presentation.</p></div>`;
  if (tab === 'grimoire') renderGrimoire(body);
  ui.append(panel);
}

function renderGrimoire(body) {
  body.className = 'book-body grimoire-body';
  body.innerHTML = `<aside class="spell-list"></aside><main class="spell-detail"></main>`;
  const list = body.querySelector('.spell-list');
  const detail = body.querySelector('.spell-detail');
  const entries = [...playableSpells, ...futureSpells.map(s => ({...s, locked:true, element:s.kind, description:s.note, invocation:'Locked lore. Not a Chapter I cast.', mana:'—', recovery:'—'}))];
  entries.forEach((s, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${s.locked?'◇':spellGlyph(s.effect)}</span><div><strong>${s.name}</strong><small>${s.level?`LEVEL ${s.level} · ${s.element}`:s.element}</small></div>${s.locked?'🔒':''}`;
    b.onclick = () => { [...list.children].forEach(x=>x.classList.remove('active')); b.classList.add('active'); showSpell(s); };
    list.append(b);
    if (i === 4) { b.classList.add('active'); showSpell(s); }
  });
  function showSpell(s) {
    detail.innerHTML = `<small>${s.level?`LEVEL ${s.level} · ${s.element}`:s.element}</small><h2>${s.name}</h2><p>${s.description || s.note}</p><blockquote><small>THE INVOCATION</small>“${s.invocation || 'Recorded only as future lore.'}”</blockquote><div class="stats"><div><small>MANA COST</small><strong>${s.mana ?? '—'}</strong></div><div><small>RECOVERY</small><strong>${typeof s.recovery==='number'?`${s.recovery}s`:s.recovery || '—'}</strong></div><div><small>REFINEMENT</small><strong>${s.locked?'Locked':'0%'}</strong></div></div><p class="flavor">${s.locked?'This entry is intentionally non-castable in Chapter I.':s.name==='Ember Lance'?'The familiar academy demonstration spell. Power is easy to notice; efficiency is easy to miss.':'Practice changes efficiency before it changes spectacle.'}</p>`;
  }
}

function showControls(fromTitle=false) {
  state.paused = state.started;
  const panel = document.createElement('section');
  panel.className = 'modal settings-panel';
  panel.innerHTML = `<button class="close">×</button><div class="eyebrow">CONTROLS & SETTINGS</div><h2>Speak, move, remember.</h2><div class="cards"><article><h3>Movement</h3><p>WASD move · Shift dodge · right-drag camera · mouse wheel zoom.</p></article><article><h3>World</h3><p>E interact · J journal · G grimoire · Esc pause.</p></article><article><h3>Casting</h3><p>V listens for “Level [number]. [Spell name].” Keys 1–9 perform assisted casts at 65% potency.</p></article><article><h3>Saving</h3><p>Local browser save every 10 seconds, on pause and when leaving the page.</p></article></div><button id="save-now" class="primary">Save now</button>`;
  panel.querySelector('.close').onclick = () => { panel.remove(); if (state.started) state.paused=false; };
  panel.querySelector('#save-now').onclick = () => { if (state.started) { saveGame(); toast('Chronicle saved.'); } else toast('Begin a chronicle before saving.', 'warn'); };
  ui.append(panel);
}

function togglePause() {
  if (!state.started) return;
  if (state.paused) { ui.querySelectorAll('.modal').forEach(x=>x.remove()); state.paused=false; return; }
  state.paused = true; saveGame();
  const panel = document.createElement('section');
  panel.className = 'modal pause-panel';
  panel.innerHTML = `<button class="close">×</button><div class="eyebrow">VESPER · THE SPOKEN WORLD</div><h2>A moment of stillness</h2><p>The world is paused while you are here.</p><nav>${['journal','grimoire','atlas','codex'].map(x=>`<button data-book="${x}">${cap(x)}</button>`).join('')}<button data-settings>Settings</button></nav><div class="save-panel"><h3>Your chronicle</h3><p>Last saved ${state.lastSaved?new Date(state.lastSaved).toLocaleTimeString():'not yet'} on this browser.</p><p>Auto-saves every 10 seconds, when paused, and when leaving the page.</p><button class="primary" id="save-now">Save now</button><button id="return">Return to the vale</button><button id="new">Begin a new chronicle</button></div>`;
  panel.querySelector('.close').onclick = panel.querySelector('#return').onclick = () => { panel.remove(); state.paused=false; };
  panel.querySelector('#save-now').onclick = () => { saveGame(); toast('Chronicle saved.'); };
  panel.querySelector('#new').onclick = () => { localStorage.removeItem(SAVE_KEY); location.reload(); };
  panel.querySelectorAll('[data-book]').forEach(b => b.onclick = () => { panel.remove(); openBook(b.dataset.book); });
  panel.querySelector('[data-settings]').onclick = () => { panel.remove(); showControls(false); };
  ui.append(panel);
}

function escapeHtml(s) { return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function cap(s){ return s[0].toUpperCase()+s.slice(1); }

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(.05, (now-last)/1000); last = now;
  if (state.started && !state.paused) {
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3(Math.sin(cameraYaw),0,-Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw),0,Math.sin(cameraYaw));
    if (keys.has('KeyW')) dir.add(fwd); if (keys.has('KeyS')) dir.sub(fwd);
    if (keys.has('KeyD')) dir.add(right); if (keys.has('KeyA')) dir.sub(right);
    if (dir.lengthSq()) {
      dir.normalize();
      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 10 : 6;
      player.position.addScaledVector(dir, speed * dt);
      player.rotation.y = Math.atan2(dir.x, dir.z);
    }
    state.mana = Math.min(100, state.mana + dt * 3.2);
  }
  const target = player.position.clone().add(new THREE.Vector3(0,2.2,0));
  const off = new THREE.Vector3(Math.sin(cameraYaw)*Math.cos(cameraPitch), Math.sin(cameraPitch), Math.cos(cameraYaw)*Math.cos(cameraPitch)).multiplyScalar(cameraDistance);
  camera.position.lerp(target.clone().add(off), .12);
  camera.lookAt(target);

  for (let i=spellEffects.length-1;i>=0;i--) {
    const e = spellEffects[i];
    const age = now-e.born;
    if (e.follow) e.mesh.position.copy(player.position).add(new THREE.Vector3(0,2.2,0));
    if (e.velocity) e.mesh.position.addScaledVector(e.velocity, dt);
    if (e.scale) e.mesh.scale.setScalar(1 + age/e.life*3);
    e.mesh.material.opacity = Math.max(0, 1-age/e.life);
    e.mesh.rotation.x += dt*2; e.mesh.rotation.y += dt*2.5;
    if (age>e.life) { scene.remove(e.mesh); spellEffects.splice(i,1); }
  }
  renderer.render(scene,camera);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
setInterval(() => { if (state.started) saveGame(); }, 10000);
addEventListener('beforeunload', () => { if (state.started) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) saveGame(); });

startScreen();
requestAnimationFrame(animate);
