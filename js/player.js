// ============================================================
//  Gem Explorer — avatars & character roster (girls + boys)
// ============================================================
import * as THREE from "three";

// Skin / hair palette
const SKIN = { light: 0xf6cfa6, tan: 0xe0ac7e, brown: 0xc68642, deep: 0x8d5524 };
const HAIR = { brown: 0x5a3a22, black: 0x201a17, blonde: 0xe6c26a, ginger: 0xb5561f, pink: 0xff77c8 };

// Pickable characters. style: short | long | ponytail | bun | spiky
export const CHARACTERS = [
  // girls
  { id: "ruby",  name: "Ruby",  type: "girl", skin: SKIN.light, hair: HAIR.brown,  style: "long",     top: 0xff5ea8, bottom: 0xd63e86, dress: true },
  { id: "luna",  name: "Luna",  type: "girl", skin: SKIN.brown, hair: HAIR.black,  style: "ponytail", top: 0x8a5cff, bottom: 0x2ec4b6, dress: false },
  { id: "mia",   name: "Mia",   type: "girl", skin: SKIN.deep,  hair: HAIR.black,  style: "bun",      top: 0xffd24a, bottom: 0xff8a3d, dress: true },
  { id: "ivy",   name: "Ivy",   type: "girl", skin: SKIN.light, hair: HAIR.blonde, style: "long",     top: 0x38d39f, bottom: 0x1f9e8a, dress: true },
  // boys
  { id: "max",   name: "Max",   type: "boy",  skin: SKIN.light, hair: HAIR.brown,  style: "short",    top: 0x4a7bff, bottom: 0x2a3d63 },
  { id: "leo",   name: "Leo",   type: "boy",  skin: SKIN.tan,   hair: HAIR.black,  style: "short",    top: 0x35c46a, bottom: 0x7a5a34 },
  { id: "kai",   name: "Kai",   type: "boy",  skin: SKIN.deep,  hair: HAIR.black,  style: "spiky",    top: 0xff5e5e, bottom: 0x2b2b2b },
  { id: "sam",   name: "Sam",   type: "boy",  skin: SKIN.light, hair: HAIR.ginger, style: "short",    top: 0xff9f1c, bottom: 0x3a6ea5 },
];

export function getCharacter(id) { return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]; }

// ---- 3D avatar -------------------------------------------------------------
function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z); m.castShadow = true; return m;
}

export function makeAvatar(charOrId, name = "") {
  const c = typeof charOrId === "string" ? getCharacter(charOrId) : (charOrId || CHARACTERS[0]);
  const g = new THREE.Group();

  const legColor = c.dress ? c.skin : c.bottom;
  const legH = 1.1;
  const legGeo = new THREE.BoxGeometry(0.5, legH, 0.5);
  const legMat = new THREE.MeshLambertMaterial({ color: legColor });
  const legL = new THREE.Mesh(legGeo, legMat); const legR = new THREE.Mesh(legGeo, legMat.clone());
  legL.position.set(-0.32, 0.55, 0); legR.position.set(0.32, 0.55, 0);
  legL.castShadow = legR.castShadow = true;

  // torso
  const torso = box(1.3, 1.3, 0.7, c.top, 0, 1.75, 0);

  // skirt / dress flare
  if (c.dress) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.15, 1.1, 12),
      new THREE.MeshLambertMaterial({ color: c.bottom }));
    skirt.position.set(0, 1.2, 0); skirt.castShadow = true;
    g.add(skirt);
  }

  // arms (bare skin — short sleeves read well on the blocky style)
  const armGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const armMat = new THREE.MeshLambertMaterial({ color: c.skin });
  const armL = new THREE.Mesh(armGeo, armMat); const armR = new THREE.Mesh(armGeo, armMat.clone());
  armL.position.set(-0.9, 1.8, 0); armR.position.set(0.9, 1.8, 0);
  armL.castShadow = armR.castShadow = true;
  // little sleeve caps in the top colour
  g.add(box(0.46, 0.35, 0.46, c.top, -0.9, 2.3, 0));
  g.add(box(0.46, 0.35, 0.46, c.top, 0.9, 2.3, 0));

  // head + face
  const head = box(1, 1, 1, c.skin, 0, 2.9, 0);
  const eyeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.05);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x241d1a });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.22, 2.95, 0.5); eyeR.position.set(0.22, 2.95, 0.5);
  const smile = box(0.4, 0.06, 0.05, 0x9c5b4a, 0, 2.66, 0.5);

  g.add(legL, legR, torso, armL, armR, head, eyeL, eyeR, smile);
  addHair(g, c);

  g.userData.limbs = { legL, legR, armL, armR };

  if (name) { const tag = makeNameTag(name); tag.position.y = 4.4; g.add(tag); }
  return g;
}

function addHair(g, c) {
  const col = c.hair;
  // base cap on top of the head
  g.add(box(1.08, 0.4, 1.08, col, 0, 3.42, 0));
  g.add(box(1.1, 0.28, 0.35, col, 0, 3.15, 0.42)); // front fringe

  if (c.style === "long") {
    g.add(box(1.06, 1.5, 0.28, col, 0, 2.6, -0.5));   // back sheet
    g.add(box(0.26, 1.2, 1.02, col, -0.62, 2.75, 0)); // left side
    g.add(box(0.26, 1.2, 1.02, col, 0.62, 2.75, 0));  // right side
  } else if (c.style === "ponytail") {
    g.add(box(0.42, 0.5, 0.42, col, 0, 3.2, -0.55));
    const tail = box(0.36, 1.2, 0.36, col, 0, 2.55, -0.7);
    tail.rotation.x = 0.4; g.add(tail);
  } else if (c.style === "bun") {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10),
      new THREE.MeshLambertMaterial({ color: col }));
    bun.position.set(0, 3.75, -0.25); bun.castShadow = true; g.add(bun);
  } else if (c.style === "spiky") {
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, 0]]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6),
        new THREE.MeshLambertMaterial({ color: col }));
      spike.position.set(dx, 3.75, dz); spike.castShadow = true; g.add(spike);
    }
  } else { // short
    g.add(box(1.08, 0.5, 1.08, col, 0, 3.25, 0));
  }
}

export function animateWalk(avatar, moving, t) {
  const l = avatar.userData.limbs; if (!l) return;
  const swing = moving ? Math.sin(t * 12) * 0.6 : 0;
  l.legL.rotation.x = swing; l.legR.rotation.x = -swing;
  l.armL.rotation.x = -swing; l.armR.rotation.x = swing;
  avatar.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
}

// ---- name tag sprite -------------------------------------------------------
function makeNameTag(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = Math.min(240, ctx.measureText(name).width + 40);
  ctx.fillStyle = "rgba(20,20,40,0.72)";
  roundRect(ctx, (256 - w) / 2, 12, w, 40, 20); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(name, 128, 33);
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(3.2, 0.8, 1); return spr;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---- flat SVG preview for the character-select cards -----------------------
export function characterSVG(c) {
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  const skin = hex(c.skin), hair = hex(c.hair), top = hex(c.top), bottom = hex(c.bottom);
  const longHair = (c.style === "long") ? `<rect x="20" y="30" width="60" height="55" rx="14" fill="${hair}"/>` : "";
  const bun = (c.style === "bun") ? `<circle cx="50" cy="22" r="10" fill="${hair}"/>` : "";
  const tail = (c.style === "ponytail") ? `<rect x="60" y="30" width="12" height="34" rx="6" fill="${hair}"/>` : "";
  const spikes = (c.style === "spiky")
    ? `<polygon points="34,30 40,14 46,30" fill="${hair}"/><polygon points="46,30 52,12 58,30" fill="${hair}"/><polygon points="58,30 64,16 70,30" fill="${hair}"/>` : "";
  const body = c.dress
    ? `<polygon points="50,60 30,96 70,96" fill="${top}"/>`
    : `<rect x="34" y="60" width="32" height="30" rx="8" fill="${top}"/><rect x="38" y="86" width="10" height="14" fill="${bottom}"/><rect x="52" y="86" width="10" height="14" fill="${bottom}"/>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${longHair}${bun}${tail}
    <ellipse cx="50" cy="30" rx="24" ry="20" fill="${hair}"/>
    <rect x="32" y="26" width="36" height="34" rx="14" fill="${skin}"/>
    ${spikes}
    <circle cx="43" cy="40" r="3" fill="#241d1a"/><circle cx="57" cy="40" r="3" fill="#241d1a"/>
    <path d="M44 48 Q50 53 56 48" stroke="#9c5b4a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${body}
  </svg>`;
}
