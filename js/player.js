// ============================================================
//  Gem Explorer — avatar (blocky character + name tag)
// ============================================================
import * as THREE from "three";

const SKIN = 0xf3c8a2;

export function makeAvatar(color = 0x4a7bff, name = "") {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const skinMat = new THREE.MeshLambertMaterial({ color: SKIN });

  // legs (animated)
  const legGeo = new THREE.BoxGeometry(0.5, 1.1, 0.5);
  const legL = new THREE.Mesh(legGeo, new THREE.MeshLambertMaterial({ color: 0x33405c }));
  const legR = legL.clone();
  legL.position.set(-0.32, 0.55, 0); legR.position.set(0.32, 0.55, 0);
  legL.castShadow = legR.castShadow = true;

  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.7), bodyMat);
  torso.position.y = 1.75; torso.castShadow = true;

  // arms (animated)
  const armGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const armL = new THREE.Mesh(armGeo, bodyMat);
  const armR = armL.clone();
  armL.position.set(-0.9, 1.8, 0); armR.position.set(0.9, 1.8, 0);
  armL.castShadow = armR.castShadow = true;

  // head
  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skinMat);
  head.position.y = 2.9; head.castShadow = true;
  // eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.22, 2.95, 0.5); eyeR.position.set(0.22, 2.95, 0.5);
  // hair cap
  const hair = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.35, 1.06),
    new THREE.MeshLambertMaterial({ color: 0x4a3222 }));
  hair.position.y = 3.4;

  g.add(legL, legR, torso, armL, armR, head, eyeL, eyeR, hair);
  g.userData.limbs = { legL, legR, armL, armR };

  // floating name tag
  if (name) {
    const tag = makeNameTag(name);
    tag.position.y = 4.3;
    g.add(tag);
  }

  g.castShadow = true;
  return g;
}

export function animateWalk(avatar, moving, t) {
  const l = avatar.userData.limbs;
  if (!l) return;
  const swing = moving ? Math.sin(t * 12) * 0.6 : 0;
  l.legL.rotation.x = swing;
  l.legR.rotation.x = -swing;
  l.armL.rotation.x = -swing;
  l.armR.rotation.x = swing;
  // gentle idle bob
  avatar.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
}

function makeNameTag(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // pill background
  const w = Math.min(240, ctx.measureText(name).width + 40);
  ctx.fillStyle = "rgba(20,20,40,0.72)";
  roundRect(ctx, (256 - w) / 2, 12, w, 40, 20); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(name, 128, 33);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(3.2, 0.8, 1);
  return spr;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Distinct bright colors for players
export const AVATAR_COLORS = [0x4a7bff, 0xff5e5e, 0x35c46a, 0xffb020, 0xb45eff, 0x21c7c7];
