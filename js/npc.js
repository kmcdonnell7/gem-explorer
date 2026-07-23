// ============================================================
//  Gem Explorer — city crowd: wandering people & dogs
// ============================================================
import * as THREE from "three";
import { makeAvatar, animateWalk, CHARACTERS } from "./player.js";

const GREET_DIST = 6;
const BUBBLES = ["👋", "😀", "😎", "🎈", "⭐", "🙌", "🍦", "💬"];

function makeBubble(emoji) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  x.font = "92px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(2.6, 2.6, 1); return s;
}

function noShadow(obj) { obj.traverse(o => { o.castShadow = false; o.receiveShadow = false; }); }

function makeDog(rng) {
  const g = new THREE.Group();
  const coat = [0x8a5a34, 0x2b2b2b, 0xe0c08a, 0xd8d8d8][Math.floor(rng() * 4)];
  const m = (w, h, d, x, y, z, c = coat) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
    b.position.set(x, y, z); return b;
  };
  g.add(m(0.9, 0.7, 1.7, 0, 0.7, 0));                 // body
  g.add(m(0.7, 0.7, 0.7, 0, 0.95, 1.05));             // head
  g.add(m(0.25, 0.35, 0.25, 0.4, 1.35, 1.15));        // ear
  g.add(m(0.25, 0.35, 0.25, -0.4, 1.35, 1.15));       // ear
  g.add(m(0.15, 0.15, 0.05, 0.18, 1.0, 1.42, 0x111)); // eye
  g.add(m(0.15, 0.15, 0.05, -0.18, 1.0, 1.42, 0x111));// eye
  const tail = m(0.2, 0.2, 0.7, 0, 0.9, -1.0); tail.rotation.x = -0.6; g.add(tail);
  for (const [dx, dz] of [[0.3, 0.6], [-0.3, 0.6], [0.3, -0.6], [-0.3, -0.6]]) g.add(m(0.22, 0.7, 0.22, dx, 0.35, dz));
  g.scale.set(0.8, 0.8, 0.8);
  return g;
}

// spawnCrowd(parent, rng, randPos, {people, dogs})
export function spawnCrowd(parent, rng, randPos, counts = { people: 11, dogs: 3 }) {
  const crowd = [];
  for (let i = 0; i < counts.people; i++) {
    const char = CHARACTERS[Math.floor(rng() * CHARACTERS.length)].id;
    const av = makeAvatar(char, "");
    av.scale.set(0.92, 0.92, 0.92);
    noShadow(av);
    const holder = new THREE.Group(); holder.add(av);
    const p = randPos();
    holder.position.set(p.x, 0, p.z);
    const bubble = makeBubble(BUBBLES[Math.floor(rng() * BUBBLES.length)]);
    bubble.position.y = 4.2; bubble.visible = false; holder.add(bubble);
    parent.add(holder);
    const t = randPos();
    crowd.push({ holder, avatar: av, bubble, kind: "person",
      pos: new THREE.Vector2(p.x, p.z), target: new THREE.Vector2(t.x, t.z),
      speed: 2 + rng() * 1.6, phase: rng() * 10, face: 0 });
  }
  for (let i = 0; i < counts.dogs; i++) {
    const dog = makeDog(rng); noShadow(dog);
    const holder = new THREE.Group(); holder.add(dog);
    const p = randPos();
    holder.position.set(p.x, 0, p.z);
    parent.add(holder);
    const t = randPos();
    crowd.push({ holder, avatar: null, kind: "dog",
      pos: new THREE.Vector2(p.x, p.z), target: new THREE.Vector2(t.x, t.z),
      speed: 3.4 + rng() * 1.5, phase: rng() * 10, face: 0 });
  }
  return crowd;
}

export function updateCrowd(crowd, dt, t, playerPos, randPos) {
  for (const n of crowd) {
    let dx = n.target.x - n.pos.x, dz = n.target.y - n.pos.y;
    const d = Math.hypot(dx, dz);
    const moving = d > 0.6;
    if (moving) {
      dx /= d; dz /= d;
      n.pos.x += dx * n.speed * dt;
      n.pos.y += dz * n.speed * dt;
      n.face = Math.atan2(dx, dz);
    } else {
      const nt = randPos(); n.target.set(nt.x, nt.z);   // pick a new place to wander to
    }
    n.holder.position.x = n.pos.x;
    n.holder.position.z = n.pos.y;
    const cur = n.holder.rotation.y;
    n.holder.rotation.y = cur + ((n.face - cur + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 8);
    if (n.avatar) animateWalk(n.avatar, moving, t + n.phase);
    if (n.bubble) {
      const near = Math.hypot(playerPos.x - n.pos.x, playerPos.y - n.pos.y) < GREET_DIST;
      n.bubble.visible = near;
    }
    if (n.kind === "dog") n.holder.position.y = Math.abs(Math.sin((t + n.phase) * 10)) * 0.15; // trot bounce
  }
}
