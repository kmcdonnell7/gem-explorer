// ============================================================
//  Gem Explorer — world definitions & landmark builders
// ============================================================
import * as THREE from "three";

export const WORLDS = [
  { id: "la",     name: "Los Angeles", emoji: "🌴", sky: 0x8fd3ff, ground: 0x6ec46e, gradient: "linear-gradient(160deg,#ff9a3d,#ff5e8a)" },
  { id: "london", name: "London",      emoji: "🎡", sky: 0xb9c4cf, ground: 0x5aa15a, gradient: "linear-gradient(160deg,#5b6b8c,#2b3a63)" },
  { id: "miami",  name: "Miami",       emoji: "🏖️", sky: 0xffd39b, ground: 0xf3e2b3, gradient: "linear-gradient(160deg,#00c6ff,#ff5ecb)" },
];

export function getWorld(id) { return WORLDS.find(w => w.id === id) || WORLDS[0]; }

// ---- small geometry helpers ------------------------------------------------
const mat = (color, opts = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

function box(w, h, d, color, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rotY;
  m.castShadow = m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, color, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function cone(r, h, color, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  return m;
}
function sphere(r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A stylized palm tree (used in LA & Miami)
function palm(x, z, scale = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.28 * scale, 0.42 * scale, 5 * scale, 0x9c6b3f, 0, 0, 0, 8));
  const top = 5 * scale;
  for (let i = 0; i < 6; i++) {
    const frond = box(0.4 * scale, 0.15 * scale, 3.2 * scale, 0x3faa4d, 0, top, 0);
    frond.rotation.y = (i / 6) * Math.PI * 2;
    frond.rotation.z = 0.5;
    frond.position.x = Math.cos((i / 6) * Math.PI * 2) * 1.4 * scale;
    frond.position.z = Math.sin((i / 6) * Math.PI * 2) * 1.4 * scale;
    g.add(frond);
  }
  g.add(sphere(0.4 * scale, 0x7a4a28, 0, top, 0)); // coconuts hub
  g.position.set(x, 0, z);
  return g;
}

// A generic simple tree (leafy, for London parks)
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.25 * s, 0.35 * s, 2.4 * s, 0x8a5a34, 0, 0, 0, 8));
  g.add(sphere(1.5 * s, 0x3f9d4a, 0, 3 * s, 0));
  g.add(sphere(1.1 * s, 0x4bb058, 0.9 * s, 2.6 * s, 0.4 * s));
  g.position.set(x, 0, z);
  return g;
}

// simple low building block with roof color band
function building(x, z, w, h, d, wall, roof) {
  const g = new THREE.Group();
  g.add(box(w, h, d, wall, 0, 0, 0));
  g.add(box(w * 1.02, 0.6, d * 1.02, roof, 0, h, 0));
  // windows suggestion via darker strip
  g.add(box(w * 0.7, h * 0.7, 0.05, 0x9fd8ff, 0, h * 0.15, d / 2 + 0.03));
  g.position.set(x, 0, z);
  return g;
}

// straight road strip
function road(x, z, w, d, rotY = 0) {
  const m = box(w, 0.06, d, 0x40444d, x, 0.02, z, rotY);
  // dashed center line
  const line = box(w * 0.06, 0.07, d, 0xf2d64b, x, 0.03, z, rotY);
  const g = new THREE.Group(); g.add(m); g.add(line); return g;
}

// ============================================================
//  Per-world builders — return { group, obstacles }
//  obstacles: array of {x, z, r} circles the player can't walk through
// ============================================================

function baseGround(color) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), mat(color));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);
  return g;
}

// ---- extra city props used to fill the bigger map ----
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function streetlight(x, z) {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.2, 5, 0x555b66, 0, 0, 0, 8));
  g.add(box(1.4, 0.2, 0.4, 0x555b66, 0, 5, 0.5));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xfff3b0, emissive: 0xffe680, emissiveIntensity: 0.6 }));
  bulb.position.set(0, 4.9, 0.9); g.add(bulb);
  g.position.set(x, 0, z); return g;
}
function bench(x, z, rot) {
  const g = new THREE.Group();
  g.add(box(2.4, 0.2, 0.8, 0x8a5a34, 0, 0.6, 0));
  g.add(box(2.4, 0.8, 0.2, 0x7a4a28, 0, 1, -0.3));
  g.add(box(0.2, 0.6, 0.8, 0x555, -1, 0.3, 0));
  g.add(box(0.2, 0.6, 0.8, 0x555, 1, 0.3, 0));
  g.position.set(x, 0, z); g.rotation.y = rot; return g;
}
function fountain(x, z) {
  const g = new THREE.Group();
  g.add(cyl(4, 4.4, 1, 0xcfd3d8, 0, 0, 0, 20));
  g.add(cyl(3.4, 3.4, 0.6, 0x3fb0e0, 0, 0.5, 0, 20));   // water
  g.add(cyl(0.6, 0.8, 2.4, 0xcfd3d8, 0, 1, 0, 12));      // center column
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x7fdcff })));
  g.children.at(-1).position.set(0, 3.2, 0);
  g.position.set(x, 0, z); return g;
}
function emojiSprite(emoji, size = 2.4) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  x.font = "92px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(size, size, 1); return s;
}
function makeStand(x, z, emoji, color) {
  const g = new THREE.Group();
  g.add(box(3, 2.2, 2, 0xffffff, 0, 0, 0));           // cart body
  g.add(box(3.4, 0.5, 2.4, color, 0, 2.2, 0));        // striped canopy
  g.add(box(3.4, 0.5, 0.2, color, 0, 2.2, 1.1));
  g.add(cyl(0.5, 0.5, 0.4, 0x333, -1.2, 0, 1.2, 10)); g.children.at(-1).rotation.z = Math.PI / 2;
  g.add(cyl(0.5, 0.5, 0.4, 0x333, 1.2, 0, 1.2, 10));  g.children.at(-1).rotation.z = Math.PI / 2;
  const sign = emojiSprite(emoji, 2.6); sign.position.set(0, 4, 0); g.add(sign);
  g.position.set(x, 0, z); return g;
}

const STANDS = [
  { emoji: "🍦", message: "Yummy ice cream! 🍦", reward: 25, color: 0xff8ab0 },
  { emoji: "🎈", message: "A balloon for you! 🎈", reward: 20, color: 0xff5e5e },
  { emoji: "🌭", message: "Tasty hot dog! 🌭", reward: 25, color: 0xffd24a },
  { emoji: "🍿", message: "Popcorn time! 🍿", reward: 20, color: 0xffa64a },
  { emoji: "🥨", message: "Warm pretzel! 🥨", reward: 20, color: 0xc98a3a },
  { emoji: "🍩", message: "Sweet donut! 🍩", reward: 25, color: 0xff77c8 },
];
const FILL_COLORS = [0xf0c987, 0xa9c7e8, 0xe8a9c0, 0xa9e8c0, 0xd8c7f0, 0xf0d8a9, 0xc0d8e8];

// Add extra streets, props & interactive stands across the enlarged city.
// Returns the list of interactables: {x,z,r,emoji,message,reward}.
function populate(g, obstacles, worldId) {
  const rng = mulberry32(hashStr(worldId + "-pop"));
  const interactables = [];
  const S = 108;
  const onRoad = (x, z) => Math.abs(x) < 5.5 || Math.abs(z) < 5.5 || Math.abs(Math.abs(x) - 60) < 5.5 || Math.abs(Math.abs(z) - 60) < 5.5;
  const onLand = (z) => worldId !== "miami" || z > -12;   // Miami: keep props off the ocean
  const clear = (x, z, pad) =>
    !onRoad(x, z) && onLand(z) && Math.hypot(x - 32, z + 28) > 13 &&
    obstacles.every(o => Math.hypot(x - o.x, z - o.z) > o.r + pad);
  const tryPos = (pad) => { for (let k = 0; k < 40; k++) { const x = (rng() * 2 - 1) * S, z = (rng() * 2 - 1) * S; if (clear(x, z, pad)) return { x, z }; } return null; };

  // road grid across the bigger map
  g.add(road(0, 0, 9, 280));
  g.add(road(0, 0, 280, 9, Math.PI / 2));
  for (const off of [-60, 60]) { g.add(road(off, 0, 7, 280)); g.add(road(0, off, 280, 7, Math.PI / 2)); }

  // extra greenery
  const treeFn = worldId === "london" ? (x, z) => tree(x, z, 1) : (x, z) => palm(x, z, 1);
  for (let i = 0; i < 30; i++) { const p = tryPos(2.5); if (p) { g.add(treeFn(p.x, p.z)); obstacles.push({ x: p.x, z: p.z, r: 1.2 }); } }
  // streetlights (line them roughly along the outer ring roads)
  for (let i = 0; i < 18; i++) { const p = tryPos(1.5); if (p) g.add(streetlight(p.x, p.z)); }
  // benches
  for (let i = 0; i < 12; i++) { const p = tryPos(1.5); if (p) g.add(bench(p.x, p.z, rng() * 6.28)); }
  // extra buildings to fill blocks
  for (let i = 0; i < 12; i++) {
    const p = tryPos(7); if (!p) continue;
    const w = 7 + rng() * 7, h = 7 + rng() * 16, d = 7 + rng() * 7;
    g.add(building(p.x, p.z, w, h, d, FILL_COLORS[(rng() * FILL_COLORS.length) | 0], FILL_COLORS[(rng() * FILL_COLORS.length) | 0]));
    obstacles.push({ x: p.x, z: p.z, r: Math.max(w, d) / 2 + 0.5 });
  }
  // a fountain plaza
  const fp = tryPos(5); if (fp) { g.add(fountain(fp.x, fp.z)); obstacles.push({ x: fp.x, z: fp.z, r: 4.4 }); }
  // interactive food/fun stands
  for (const st of STANDS) {
    const p = tryPos(3); if (!p) continue;
    g.add(makeStand(p.x, p.z, st.emoji, st.color));
    obstacles.push({ x: p.x, z: p.z, r: 1.8 });
    interactables.push({ x: p.x, z: p.z, r: 3.4, emoji: st.emoji, message: st.message, reward: st.reward });
  }
  return interactables;
}

function buildLA() {
  const g = baseGround(0x74c56f);
  const obstacles = [];
  const add = (mesh) => g.add(mesh);

  // roads
  add(road(0, 0, 8, 200));
  add(road(0, 0, 200, 8, Math.PI / 2));

  // --- Hollywood-style sign on a hill (green mound + white letters) ---
  const hill = cyl(14, 20, 8, 0x5aa84f, -46, 0, -46, 20);
  add(hill);
  const letters = "HOLLYWOOD".split("");
  letters.forEach((ch, i) => {
    const lx = -60 + i * 3.2, lz = -40;
    add(box(2.2, 5, 0.5, 0xffffff, lx, 8, lz));
  });

  // --- Griffith Observatory (white domes) ---
  const obs = new THREE.Group();
  obs.add(box(14, 4, 8, 0xf3f1e7, 0, 0, 0));
  obs.add(cyl(2.4, 2.4, 3, 0xe8e4d4, -5, 4, 0));
  obs.add(sphere(2.4, 0xcfcabb, -5, 7, 0));
  obs.add(cyl(2.4, 2.4, 3, 0xe8e4d4, 5, 4, 0));
  obs.add(sphere(2.4, 0xcfcabb, 5, 7, 0));
  obs.add(cyl(2, 2, 5, 0xe8e4d4, 0, 4, 0));
  obs.add(sphere(3, 0xd8d2c2, 0, 9, 0));
  obs.position.set(44, 0, -44);
  add(obs);
  obstacles.push({ x: 44, z: -44, r: 9 });

  // --- Movie studio + walk-of-fame star buildings ---
  add(building(38, 40, 12, 10, 12, 0xe8b3d0, 0xb85b8a));
  add(building(-40, 42, 12, 14, 12, 0xbcd0f0, 0x5a78b8));
  obstacles.push({ x: 38, z: 40, r: 8 }, { x: -40, z: 42, r: 8 });

  // palms everywhere
  const palmSpots = [[14,14],[-16,10],[20,-16],[-22,-18],[10,-30],[-8,30],[30,8],[-30,-6],[6,46],[-46,8],[46,10]];
  palmSpots.forEach(([x,z]) => { add(palm(x, z, 1)); obstacles.push({ x, z, r: 1.2 }); });

  // a few pastel houses
  add(building(20, 24, 8, 6, 8, 0xffd27f, 0xef8f4a));
  add(building(-22, 22, 8, 6, 8, 0x9fe0c0, 0x39a583));
  obstacles.push({ x: 20, z: 24, r: 6 }, { x: -22, z: 22, r: 6 });

  return { group: g, obstacles };
}

function buildLondon() {
  const g = baseGround(0x5aa15a);
  const obstacles = [];
  const add = (m) => g.add(m);

  add(road(0, 0, 9, 200));
  add(road(0, 0, 200, 9, Math.PI / 2));

  // --- Big Ben (tall clock tower) ---
  const ben = new THREE.Group();
  ben.add(box(6, 34, 6, 0xcdb98f, 0, 0, 0));           // tower shaft
  ben.add(box(6.6, 4, 6.6, 0x9a8760, 0, 34, 0));       // clock band
  // clock faces
  [[0,3.35],[3.35,0],[0,-3.35],[-3.35,0]].forEach(([dx,dz]) =>
    ben.add(box(dx===0?3:0.2, 3, dz===0?3:0.2, 0xffffff, dx, 35.5, dz)));
  ben.add(box(5, 4, 5, 0xb7a274, 0, 38, 0));
  ben.add(cone(4, 8, 0x2f6b4a, 0, 42, 0));             // green spire
  ben.add(sphere(0.6, 0xffe27a, 0, 50.4, 0));          // gold finial
  ben.position.set(-44, 0, -40);
  add(ben);
  obstacles.push({ x: -44, z: -40, r: 6 });

  // --- Tower Bridge (two towers + span) ---
  const tb = new THREE.Group();
  const tower = (tx) => {
    const t = new THREE.Group();
    t.add(box(5, 16, 5, 0x9fb6cf, 0, 0, 0));
    t.add(box(5.4, 3, 5.4, 0x7f97b3, 0, 16, 0));
    t.add(cone(3.6, 5, 0x2f6b8a, 0, 19, 0, 4));
    t.position.x = tx; return t;
  };
  tb.add(tower(-7)); tb.add(tower(7));
  tb.add(box(14, 2, 4, 0x8aa0bb, 0, 8, 0));   // upper walkway
  tb.add(box(20, 1.4, 5, 0x6d564a, 0, 0.4, 0)); // deck
  tb.position.set(46, 0, 44);
  add(tb);
  obstacles.push({ x: 39, z: 44, r: 4 }, { x: 53, z: 44, r: 4 });

  // --- London Eye (ferris wheel) ---
  const eye = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(11, 0.5, 10, 40), mat(0xdfe8f2));
  ring.position.y = 13; eye.add(ring);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spoke = box(0.2, 0.2, 11, 0xcfd8e4, 0, 13, 0);
    spoke.rotation.x = a; eye.add(spoke);
    const cap = box(1.4, 1.2, 1, 0x7fd0ff, Math.cos(a) * 11, 13 + Math.sin(a) * 11, 0);
    eye.add(cap);
  }
  eye.add(box(1, 26, 1, 0xbfc9d6, -3, 0, 0)); // support legs
  eye.add(box(1, 26, 1, 0xbfc9d6, 3, 0, 0));
  eye.position.set(40, 0, -46);
  add(eye);
  obstacles.push({ x: 40, z: -46, r: 6 });

  // --- Red double-decker buses & phone boxes ---
  const bus = (x, z, rotY) => {
    const b = new THREE.Group();
    b.add(box(4, 4, 9, 0xd62828, 0, 0, 0));
    b.add(box(3.6, 1.6, 8.4, 0x9fd8ff, 0, 2.2, 0));
    b.add(cyl(0.7,0.7,0.6,0x222, -1.6,0.2,3,10)); b.children.at(-1).rotation.z=Math.PI/2;
    b.rotation.y = rotY; b.position.set(x, 0, z); return b;
  };
  add(bus(6, 20, 0)); add(bus(-6, -24, Math.PI));
  obstacles.push({ x: 6, z: 20, r: 3 }, { x: -6, z: -24, r: 3 });
  const phoneBox = (x, z) => { const p = box(1.6, 4.4, 1.6, 0xd62828, x, 0, z); return p; };
  add(phoneBox(12, 6)); add(phoneBox(-12, -8));

  // parks
  [[18,-16],[-18,16],[24,10],[-24,-10],[10,40],[-10,-40]].forEach(([x,z]) => {
    add(tree(x, z, 1.1)); obstacles.push({ x, z, r: 1.6 });
  });

  // rows of townhouses
  add(building(22, 26, 10, 12, 10, 0xcaa27a, 0x7a5b3a));
  add(building(-24, 24, 10, 12, 10, 0xb08d8d, 0x6f4a4a));
  obstacles.push({ x: 22, z: 26, r: 7 }, { x: -24, z: 24, r: 7 });

  return { group: g, obstacles };
}

function buildMiami() {
  const g = baseGround(0xf1e0ad); // sand
  const obstacles = [];
  const add = (m) => g.add(m);

  // ocean on one side
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(280, 130), mat(0x1fb6d6, { transparent: true, opacity: 0.92 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 0.05, -85);
  add(ocean);
  // wet-sand shoreline
  add(box(280, 0.08, 8, 0xe9cf8f, 0, 0.04, -18));

  add(road(0, 30, 10, 140, Math.PI / 2)); // ocean-drive style

  // --- Pastel Art-Deco strip ---
  const deco = [
    [ -50, 34, 12, 16, 12, 0xff9ec4, 0xffffff ],
    [ -30, 34, 12, 20, 12, 0x8fe3f0, 0xffffff ],
    [ -10, 34, 12, 14, 12, 0xffe08a, 0xffffff ],
    [  12, 34, 12, 22, 12, 0xb6a4ff, 0xffffff ],
    [  32, 34, 12, 16, 12, 0x9affc4, 0xffffff ],
    [  52, 34, 12, 18, 12, 0xffb38a, 0xffffff ],
  ];
  deco.forEach(([x,z,w,h,d,wall,roof]) => {
    const b = building(x, z, w, h, d, wall, roof);
    // deco vertical stripe
    b.add(box(1.2, h, 0.2, 0xffffff, 0, 0, d/2 + 0.05));
    add(b); obstacles.push({ x, z, r: 7 });
  });

  // --- Lifeguard tower (iconic Miami) ---
  const lg = new THREE.Group();
  lg.add(box(1, 6, 1, 0xffffff, -3, 0, 0)); lg.add(box(1, 6, 1, 0xffffff, 3, 0, 0));
  lg.add(box(1, 6, 1, 0xffffff, -3, 0, 3)); lg.add(box(1, 6, 1, 0xffffff, 3, 0, 3));
  lg.add(box(8, 4, 6, 0xff5e7a, 0, 6, 1.5));
  lg.add(cone(6, 3, 0x2ec4b6, 0, 10, 1.5, 4));
  lg.position.set(0, 0, -26); add(lg);
  obstacles.push({ x: 0, z: -26, r: 4 });

  // beach umbrellas + palms
  const umbrella = (x, z, c) => {
    const u = new THREE.Group();
    u.add(cyl(0.15, 0.15, 4, 0xffffff, 0, 0, 0, 8));
    u.add(cone(3, 1.4, c, 0, 4, 0, 12));
    u.position.set(x, 0, z); return u;
  };
  [[-20,-24,0xff5e7a],[18,-30,0x2ec4b6],[-8,-34,0xffd166],[30,-22,0x6a8cff]].forEach(([x,z,c]) => add(umbrella(x,z,c)));

  const palmSpots = [[-40,-8],[40,-6],[-16,8],[16,10],[-28,18],[28,16],[0,20],[-52,6],[52,4]];
  palmSpots.forEach(([x,z]) => { add(palm(x, z, 1)); obstacles.push({ x, z, r: 1.2 }); });

  // marina yachts on the water
  const yacht = (x) => { const y = box(6, 2, 12, 0xffffff, x, 0.2, -50); y.add(box(3,3,4,0xdfe8f2,0,2,0)); return y; };
  add(yacht(-30)); add(yacht(24));

  return { group: g, obstacles };
}

const BUILDERS = { la: buildLA, london: buildLondon, miami: buildMiami };

export function buildWorld(worldId) {
  const built = (BUILDERS[worldId] || buildLA)();
  const interactables = populate(built.group, built.obstacles, worldId);
  return { group: built.group, obstacles: built.obstacles, interactables };
}
