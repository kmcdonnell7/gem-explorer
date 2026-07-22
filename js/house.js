// ============================================================
//  Gem Explorer — houses you can buy, enter & live in
// ============================================================
import * as THREE from "three";

function box(w, h, d, color, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y + h / 2, z); m.rotation.y = rotY;
  m.castShadow = m.receiveShadow = true; return m;
}
function slab(w, h, d, color, x, y, z) { // centered exactly at y (for roofs/floors)
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
}
function flower(x, z, color) {
  const g = new THREE.Group();
  g.add(box(0.1, 0.6, 0.1, 0x3a9d4a, 0, 0, 0));
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshLambertMaterial({ color }));
  bloom.position.set(0, 0.8, 0); g.add(bloom);
  g.position.set(x, 0, z); return g;
}

// A gabled roof made of two slanted slabs meeting at a ridge.
function gableRoof(w, d, color, y, ridge = 3) {
  const g = new THREE.Group();
  const slope = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.3, d + 1.2),
    new THREE.MeshLambertMaterial({ color }));
  const left = slope.clone(), right = slope.clone();
  left.position.set(-w * 0.17, y + ridge / 2, 0); left.rotation.z = Math.atan2(ridge, w * 0.55);
  right.position.set(w * 0.17, y + ridge / 2, 0); right.rotation.z = -Math.atan2(ridge, w * 0.55);
  left.castShadow = right.castShadow = true;
  g.add(left, right);
  // gable end triangles (filler) — simple flat panels
  g.add(box(0.2, ridge, d + 0.4, color, -w / 2 + 0.1, y, 0));
  g.add(box(0.2, ridge, d + 0.4, color, w / 2 - 0.1, y, 0));
  return g;
}

// ============================================================
//  EXTERIOR — returns { group, door:{x,z}, radius }
//  Placed at a home plot; door faces +z (toward the street).
// ============================================================
export function buildHouseExterior(tier = "cottage") {
  const mansion = tier === "mansion";
  const g = new THREE.Group();
  const W = mansion ? 18 : 11, D = mansion ? 15 : 10, H = mansion ? 8 : 5;
  const wall = mansion ? 0xf3e9d8 : 0xfce8c8;
  const roofC = mansion ? 0x6d4b8a : 0xb85b4a;
  const trim = mansion ? 0xd8c39a : 0xe0b98a;

  // lawn plot
  const lawn = slab(W + 10, 0.12, D + 12, 0x74c56f, 0, 0.06, -1);
  g.add(lawn);

  // main body
  g.add(box(W, H, D, wall, 0, 0.12, 0));
  // corner trim pilasters
  g.add(box(0.6, H, 0.6, trim, -W / 2 + 0.3, 0.12, D / 2 - 0.3));
  g.add(box(0.6, H, 0.6, trim, W / 2 - 0.3, 0.12, D / 2 - 0.3));

  // roof
  const roof = gableRoof(W, D, roofC, H + 0.12, mansion ? 4.5 : 3);
  g.add(roof);

  // chimney + smoke
  g.add(box(1, 3, 1, 0x8a6a52, W / 2 - 2, H + 0.12, -1));
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.4 + i * 0.12, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xdedede, transparent: true, opacity: 0.7 - i * 0.15 }));
    puff.position.set(W / 2 - 2, H + 3.5 + i * 0.9, -1 + i * 0.3); g.add(puff);
  }

  // front door (facing +z)
  const doorColor = mansion ? 0x5a3d2b : 0x7a4a2a;
  g.add(box(1.8, 3, 0.25, doorColor, 0, 0.12, D / 2 + 0.02));
  g.add(box(0.16, 0.16, 0.16, 0xffd24a, 0.55, 1.6, D / 2 + 0.16)); // knob
  // little porch step + path
  g.add(slab(3, 0.2, 1.4, 0xcfc3a6, 0, 0.16, D / 2 + 0.9));
  for (let i = 1; i <= 5; i++) g.add(slab(2, 0.14, 1.2, 0xd9cdb0, 0, 0.12, D / 2 + 0.9 + i * 1.5));

  // front windows
  const winY = 1.9;
  const winXs = mansion ? [-6, -2.4, 2.4, 6] : [-3.4, 3.4];
  winXs.forEach(x => {
    g.add(box(2, 1.8, 0.2, 0xffffff, x, winY - 0.9 + 0.12, D / 2 + 0.02));   // frame
    g.add(box(1.6, 1.4, 0.22, 0x9fdcff, x, winY - 0.9 + 0.12, D / 2 + 0.04)); // glass
  });
  if (mansion) {
    // second-floor windows + columns for grandeur
    [-6, -2.4, 2.4, 6].forEach(x => g.add(box(1.6, 1.4, 0.22, 0x9fdcff, x, 5.4, D / 2 + 0.04)));
    g.add(box(0.7, H, 0.7, 0xffffff, -2.4, 0.12, D / 2 + 0.9));
    g.add(box(0.7, H, 0.7, 0xffffff, 2.4, 0.12, D / 2 + 0.9));
  }

  // garden flowers + hedges
  const cols = [0xff5e8a, 0xffd24a, 0x8a5cff, 0xff8a3d, 0xffffff];
  for (let i = 0; i < (mansion ? 12 : 7); i++) {
    const side = i % 2 ? 1 : -1;
    g.add(flower(side * (W / 2 + 1.5), D / 2 - i * 1.3, cols[i % cols.length]));
  }
  g.add(box(mansion ? 5 : 3, 1, 1, 0x3f9d4a, -W / 2 - 1.2, 0.12, 2)); // hedge
  g.add(box(mansion ? 5 : 3, 1, 1, 0x3f9d4a, W / 2 + 1.2, 0.12, 2));

  return { group: g, door: { x: 0, z: D / 2 + 3 }, radius: Math.max(W, D) / 2 + 0.4 };
}

// ============================================================
//  INTERIOR — a cozy furnished room centered at the origin.
//  Returns { group, exit:{x,z}, bounds:{x,z}, obstacles:[{x,z,r}] }
//  Doorway gap is on the +z wall; the exit mat sits just inside.
// ============================================================
export function buildHouseInterior(tier = "cottage") {
  const mansion = tier === "mansion";
  const g = new THREE.Group();
  const RX = mansion ? 16 : 11, RZ = mansion ? 13 : 9;  // room half-extents
  const wallH = 5;
  const obstacles = [];

  // floor (wood) + rug
  g.add(slab(RX * 2, 0.2, RZ * 2, mansion ? 0xcaa06a : 0xb98a5a, 0, 0.1, 0));
  const rug = slab(RX * 1.1, 0.06, RZ * 1.0, mansion ? 0x8a5cff : 0xd6604a, 0, 0.24, -1);
  g.add(rug);

  // walls (leave a doorway gap on +z)
  const wc = mansion ? 0xf1e4cf : 0xf7ead2;
  g.add(box(RX * 2, wallH, 0.4, wc, 0, 0, -RZ));            // back (−z)
  g.add(box(0.4, wallH, RZ * 2, wc, -RX, 0, 0));            // left
  g.add(box(0.4, wallH, RZ * 2, wc, RX, 0, 0));            // right
  const doorGap = 3;
  const seg = (RX * 2 - doorGap) / 2;
  g.add(box(seg, wallH, 0.4, wc, -(doorGap / 2 + seg / 2), 0, RZ)); // front-left
  g.add(box(seg, wallH, 0.4, wc, (doorGap / 2 + seg / 2), 0, RZ));  // front-right

  // ceiling-ish beam + warm light feel via a soft panel (visual only)
  g.add(box(RX * 2, 0.3, 0.6, wc, 0, wallH - 0.4, 0));

  // a wall window (back wall) so it feels bright
  g.add(box(4, 2.4, 0.1, 0x9fdcff, 0, 3, -RZ + 0.25));

  // ---- furniture (each becomes a collision circle) ----
  const add = (mesh, r) => { g.add(mesh); if (r) obstacles.push({ x: mesh.position.x, z: mesh.position.z, r }); };

  // bed
  const bed = new THREE.Group();
  bed.add(box(3.4, 0.8, 5, 0xffffff, 0, 0, 0));
  bed.add(box(3.4, 1.4, 0.4, 0x8a5a3a, 0, 0, -2.4));      // headboard
  bed.add(box(3.2, 0.5, 1.4, 0xff8ab0, 0, 0.8, -1.6));    // pillow area
  bed.add(box(3.2, 0.4, 3.2, 0x6aa9ff, 0, 0.8, 0.5));     // blanket
  bed.position.set(-RX + 2.4, 0, -RZ + 3.2);
  add(bed, 2.6);

  // sofa
  const sofa = new THREE.Group();
  sofa.add(box(4, 1, 1.6, 0x3f8a6a, 0, 0, 0));
  sofa.add(box(4, 1.4, 0.5, 0x357a5c, 0, 0, -0.8));
  sofa.add(box(0.5, 1.2, 1.6, 0x357a5c, -1.9, 0, 0));
  sofa.add(box(0.5, 1.2, 1.6, 0x357a5c, 1.9, 0, 0));
  sofa.position.set(RX - 3, 0, 1.5);
  sofa.rotation.y = -Math.PI / 2;
  add(sofa, 2.4);

  // coffee table + TV
  add(box(2.2, 0.8, 1.2, 0x6b4a2f, RX - 6.5, 0, 1.5), 1.4);
  const tv = new THREE.Group();
  tv.add(box(0.6, 1.2, 0.6, 0x333, 0, 0, 0));
  tv.add(box(4, 2.4, 0.3, 0x111, 0, 1.6, 0));
  tv.add(box(3.6, 2, 0.32, 0x2a6cff, 0, 1.6, 0.02));
  tv.position.set(RX - 0.8, 0, 1.5); tv.rotation.y = -Math.PI / 2;
  add(tv, 1.2);

  // rug lamp + bookshelf + plant
  const lamp = new THREE.Group();
  lamp.add(box(0.2, 3, 0.2, 0x9a9a9a, 0, 0, 0));
  lamp.add(new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 12), new THREE.MeshLambertMaterial({ color: 0xffe6a3, emissive: 0xffcf6a, emissiveIntensity: 0.5 })));
  lamp.children[1].position.y = 3;
  lamp.position.set(-RX + 1.5, 0, RZ - 2); add(lamp, 0.8);

  add(box(1, 3.6, 3, 0x7a5230, -RX + 1.2, 0, -1), 1.4); // bookshelf
  const plant = new THREE.Group();
  plant.add(box(1, 1, 1, 0xcf7a4a, 0, 0, 0));
  plant.add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3f9d4a })));
  plant.children[1].position.y = 1.6; plant.position.set(RX - 1.5, 0, -RZ + 1.5);
  add(plant, 1);

  // dining table for the mansion
  if (mansion) {
    add(box(4, 1, 2, 0x6b4a2f, -3, 0, RZ - 3), 2.2);
    for (const dx of [-1.4, 1.4]) for (const dz of [-0.8, 0.8])
      g.add(box(0.6, 1.6, 0.6, 0x8a5a3a, -3 + dx, 0, RZ - 3 + dz));
    // fireplace
    add(box(3, 3, 1, 0x9a8368, -RX + 4, 0, -RZ + 0.6), 1.6);
    g.add(box(2, 1.4, 0.2, 0xff8a3d, -RX + 4, 0.7, -RZ + 1.1)); // fire glow
  }

  // welcome mat / exit pad just inside the doorway
  const mat = slab(2.4, 0.08, 1.4, 0xffca5c, 0, 0.26, RZ - 1.3);
  g.add(mat);

  return { group: g, exit: { x: 0, z: RZ - 1.3 }, entrance: { x: 0, z: RZ - 2.6 }, bounds: { x: RX - 0.8, z: RZ - 0.8 }, obstacles };
}
