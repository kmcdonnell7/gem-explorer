// ============================================================
//  Gem Explorer — ride-on vehicles (shown under the player)
//  Built so the avatar stands at the local origin, facing +z.
// ============================================================
import * as THREE from "three";

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function wheel(x, y, z, r = 0.5) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 8, 16),
    new THREE.MeshLambertMaterial({ color: 0x1b1b1b }));
  m.position.set(x, y, z); m.rotation.y = Math.PI / 2; m.castShadow = true; // axle along x → rolls in z
  return m;
}

function makeBike() {
  const g = new THREE.Group();
  const frame = 0xff3b3b;
  g.add(wheel(0, 0.5, 0.85));
  g.add(wheel(0, 0.5, -0.85));
  g.add(box(0.12, 0.12, 1.7, frame, 0, 0.75, 0));       // top bar
  g.add(box(0.12, 0.7, 0.12, frame, 0, 0.5, 0.85));     // front fork
  g.add(box(0.12, 0.7, 0.12, frame, 0, 0.5, -0.85));    // seat post
  g.add(box(0.7, 0.1, 0.1, 0x222, 0, 1.05, 0.85));      // handlebars
  g.add(box(0.5, 0.16, 0.4, 0x222, 0, 0.95, -0.85));    // seat
  return g;
}

function makeCar(color = 0x2a6cff) {
  const g = new THREE.Group();
  // open-top go-kart the avatar stands in
  g.add(box(1.9, 0.4, 3.4, color, 0, 0.45, 0));          // floor pan
  g.add(box(1.9, 0.6, 0.9, color, 0, 0.9, 1.2));         // hood (front +z)
  g.add(box(1.9, 1.1, 0.4, color, 0, 1.1, -1.5));        // seat back
  g.add(box(0.25, 0.7, 3.2, color, -0.95, 0.9, 0));      // left rail
  g.add(box(0.25, 0.7, 3.2, color, 0.95, 0.9, 0));       // right rail
  g.add(box(1.3, 0.5, 0.1, 0x9fd8ff, 0, 1.3, 1.7));      // windshield
  g.add(box(0.5, 0.12, 0.5, 0x111, 0, 1.15, 0.4));       // steering column
  for (const [dx, dz] of [[-1, 1.1], [1, 1.1], [-1, -1.1], [1, -1.1]]) g.add(wheel(dx, 0.5, dz, 0.55));
  return g;
}

function makeAirplane(color = 0xff9f1c) {
  const g = new THREE.Group();
  g.add(box(1.3, 1.1, 4, color, 0, 0.9, 0));             // fuselage
  g.add(box(7, 0.25, 1.3, 0xf3f3f3, 0, 1.1, 0.2));       // main wing
  g.add(box(2.4, 0.2, 0.9, 0xf3f3f3, 0, 1.9, -1.7));     // tail wing
  g.add(box(0.2, 1.1, 0.9, color, 0, 2.2, -1.9));        // tail fin
  g.add(box(1.1, 0.6, 0.1, 0x9fd8ff, 0, 1.5, 0.9));      // cockpit glass
  // spinning propeller at the nose (+z)
  const prop = new THREE.Group();
  prop.add(box(0.16, 1.8, 0.16, 0x333, 0, 0, 0));
  prop.add(box(1.8, 0.16, 0.16, 0x333, 0, 0, 0));
  prop.position.set(0, 0.9, 2.1);
  g.add(prop); g.userData.prop = prop;
  for (const dx of [-2.4, 2.4]) g.add(wheel(dx, 0.4, 0.4, 0.4));
  g.add(wheel(0, 0.4, -1.6, 0.35));
  return g;
}

export function makeVehicle(type) {
  if (type === "bike") return makeBike();
  if (type === "car") return makeCar();
  if (type === "airplane") return makeAirplane();
  return null;
}
