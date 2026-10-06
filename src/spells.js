export const playableSpells = [
  {
    slot: 1,
    name: 'Tinder',
    level: 1,
    element: 'Ember',
    mana: 6,
    recovery: 1.2,
    description: 'A palm-sized flame for light, warmth, and the first lessons of fire.',
    invocation: 'Goddess of fire, lend this hand a single ember. Level 1. Tinder.',
    effect: 'fire'
  },
  {
    slot: 2,
    name: 'Mend',
    level: 1,
    element: 'Tide',
    mana: 10,
    recovery: 2.5,
    description: 'Closes minor wounds and steadies the caster.',
    invocation: 'Gentle tide, gather what has been torn apart. Level 1. Mend.',
    effect: 'heal'
  },
  {
    slot: 3,
    name: 'Stoneward',
    aliases: ['Stonewall'],
    level: 1,
    element: 'Stone',
    mana: 12,
    recovery: 6,
    description: 'Protects you immediately for 6 seconds. No target needed; cast before an incoming hit.',
    invocation: 'Patient earth, stand between this fragile heart and harm. Level 1. Stoneward.',
    effect: 'shield'
  },
  {
    slot: 4,
    name: 'Gale',
    level: 2,
    element: 'Breath',
    mana: 18,
    recovery: 3,
    description: 'A cutting burst of wind that pushes outward from the caster.',
    invocation: 'Restless wind, pass through me and answer. Level 2. Gale.',
    effect: 'wind'
  },
  {
    slot: 5,
    name: 'Ember Lance',
    level: 2,
    element: 'Ember',
    mana: 25,
    recovery: 3.5,
    description: 'A long-range bolt. More force than Tinder, with a much higher mana cost.',
    invocation: 'Goddess of fire, gather your scattered embers into a single spear. Level 2. Ember Lance.',
    effect: 'fire'
  },
  {
    slot: 6,
    name: 'Rime',
    level: 2,
    element: 'Tide',
    mana: 20,
    recovery: 4,
    description: 'Freezes moisture into a brief field of biting frost.',
    invocation: 'Quiet tide, forget your motion and become winter. Level 2. Rime.',
    effect: 'ice'
  },
  {
    slot: 7,
    name: 'Flame Edge',
    level: 3,
    element: 'Ember',
    mana: 28,
    recovery: 5,
    description: 'Wraps a weapon-shaped arc of flame around the caster’s strike.',
    invocation: 'Flame that knows the shape of steel, take an edge. Level 3. Flame Edge.',
    effect: 'blade'
  },
  {
    slot: 8,
    name: 'Thunder',
    level: 3,
    element: 'Storm',
    mana: 32,
    recovery: 6,
    description: 'Calls a violent stroke of lightning into the marked ground.',
    invocation: 'Sky above, answer the earth in one bright instant. Level 3. Thunder.',
    effect: 'lightning'
  },
  {
    slot: 9,
    name: 'Falling Star',
    level: 4,
    element: 'Astral',
    mana: 50,
    recovery: 10,
    description: 'Draws down a small astral impact: the first spell that feels larger than the caster.',
    invocation: 'Distant light, cross the dark and fall where I name. Level 4. Falling Star.',
    effect: 'star'
  }
];

export const futureSpells = [
  { name: 'Parallel Cast', level: null, kind: 'Casting technique', note: 'Maintain two independent spell structures at once.' },
  { name: 'Multicast', level: null, kind: 'Casting technique', note: 'Release multiple prepared spells in one sequence.' },
  { name: 'Triple Cast', level: null, kind: 'Casting technique', note: 'Three concurrent spell structures.' },
  { name: 'Quad Cast', level: null, kind: 'Casting technique', note: 'Four concurrent structures — one for each arm and leg.' },
  { name: 'Magic Jammer', level: 5, kind: 'Interference', note: 'Disrupts nearby spell formation.' },
  { name: 'Perfect Wall', level: 7, kind: 'Barrier', note: 'A legendary defensive wall.' },
  { name: 'Chaos Weed', level: 7, kind: 'Breath', note: 'A large triangular area attack of violent wind.' },
  { name: 'Evil Flare', level: 7, kind: 'Ember', note: 'A high-order flare of destructive flame.' },
  { name: 'Icing Titan', level: 7, kind: 'Tide', note: 'A massive ice manifestation.' },
  { name: 'Teleport', level: 8, kind: 'Spatial', note: 'Instant relocation across a bounded distance.' },
  { name: "Thor's Hammer", level: 8, kind: 'Storm', note: 'A catastrophic lightning impact.' },
  { name: 'Perfect Dispel', level: 8, kind: 'Dispel', note: 'Unravels exceptionally powerful magic.' },
  { name: "Thor's Lance", level: 9, kind: 'Storm', note: 'A near-mythical lightning spear.' },
  { name: 'X-Gravity', level: 9, kind: 'Gravity', note: 'High-order gravity manipulation.' },
  { name: 'Caldris', level: 10, kind: 'Scale', note: 'A creator-named scale-explosion art associated with a magic emperor.' },
  { name: 'Vaelith', level: 10, kind: 'Storm', note: 'A creator-named art that absorbs lightning and turns it toward god-slaying force.' }
];

export function normalizeCastText(value = '') {
  return value
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\b(one|first)\b/g, '1')
    .replace(/\b(two|second)\b/g, '2')
    .replace(/\b(three|third)\b/g, '3')
    .replace(/\b(four|fourth)\b/g, '4')
    .replace(/\b(five|fifth)\b/g, '5')
    .replace(/\b(six|sixth)\b/g, '6')
    .replace(/\b(seven|seventh)\b/g, '7')
    .replace(/\b(eight|eighth)\b/g, '8')
    .replace(/\b(nine|ninth)\b/g, '9')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchSpellFromSpeech(text) {
  const normalized = normalizeCastText(text);
  return playableSpells.find((spell) => {
    const names = [spell.name, ...(spell.aliases || [])].map(normalizeCastText);
    const hasName = names.some((name) => normalized.includes(name));
    const hasLevel = normalized.includes(String(spell.level)) || normalized.includes(`level ${spell.level}`);
    return hasName && hasLevel;
  }) || null;
}

export function findAnySpellByName(text) {
  const normalized = normalizeCastText(text);
  const all = [...playableSpells, ...futureSpells];
  return all.find((spell) => normalized.includes(normalizeCastText(spell.name))) || null;
}
