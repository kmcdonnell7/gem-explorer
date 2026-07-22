// ============================================================
//  Gem Explorer — core engine
// ============================================================
import * as THREE from "three";
import { buildWorld, getWorld } from "./worlds.js";
import { makeAvatar, animateWalk } from "./player.js";
import { GEM_VALUE, GEMS_PER_WORLD, PLAYER_SPEED, VEHICLE_SPEED_BONUS, WORLD_SIZE } from "./config.js";

// deterministic RNG so every player sees gems in the same spots
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const PLAYER_RADIUS = 0.9;
const GEM_COLORS = [0x59e0ff, 0xff5ec4, 0x9dff5e, 0xffd24a, 0xb45eff];

export class Game {
  constructor(canvasParent, state, callbacks) {
    this.state = state;
    this.cb = callbacks;              // { onGems, onToast }
    this.clock = new THREE.Clock();
    this.gems = [];
    this.obstacles = [];
    this.worldGroup = null;
    this.remoteAvatars = {};          // playerId -> THREE.Group
    this.multiplayer = null;
    this.running = false;

    this._initRenderer(canvasParent);
    this._initScene();
    this._bindResize();
  }

  _initRenderer(parent) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    parent.appendChild(renderer.domElement);
    this.renderer = renderer;
  }

  _initScene() {
    this.scene = new THREE.Scene();

    // Orthographic isometric camera
    const aspect = window.innerWidth / window.innerHeight;
    const d = 26;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 400);
    this.camOffset = new THREE.Vector3(60, 70, 60);
    this.camera.position.copy(this.camOffset);
    this.camera.lookAt(0, 0, 0);

    // lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x556b55, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sun.position.set(50, 80, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 120;
    this.sun.shadow.camera.left = -s; this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s; this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.far = 300;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // local player avatar
    this.avatar = makeAvatar(this.cb.color || 0x4a7bff, this.state.name || "You");
    this.playerHolder = new THREE.Group();      // holds avatar; we move this
    this.playerHolder.add(this.avatar);
    this.scene.add(this.playerHolder);
    this.pos = new THREE.Vector2(0, 6);
    this.facing = 0;

    // screen-space movement axes for the iso camera
    this.screenUp = new THREE.Vector2(-1, -1).normalize();
    this.screenRight = new THREE.Vector2(-1, 1).normalize();
  }

  _bindResize() {
    window.addEventListener("resize", () => {
      const aspect = window.innerWidth / window.innerHeight;
      const d = 26;
      this.camera.left = -d * aspect; this.camera.right = d * aspect;
      this.camera.top = d; this.camera.bottom = -d;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ---- world loading ----
  loadWorld(worldId) {
    const world = getWorld(worldId);
    this.state.world = worldId;
    this.scene.background = new THREE.Color(world.sky);
    this.scene.fog = new THREE.Fog(world.sky, 160, 260);

    // clear old world + gems
    if (this.worldGroup) { this.scene.remove(this.worldGroup); this._disposeGroup(this.worldGroup); }
    this.gems.forEach(g => this.scene.remove(g.mesh));
    this.gems = [];

    const built = buildWorld(worldId);
    this.worldGroup = built.group;
    this.obstacles = built.obstacles;
    this.scene.add(this.worldGroup);

    this._spawnGems(worldId);

    // reset player to a clear starting spot
    this.pos.set(0, 8);
    this.playerHolder.position.set(0, 0, 8);

    if (this.cb.onWorld) this.cb.onWorld(world);
  }

  _spawnGems(worldId) {
    const rng = mulberry32(hash(worldId));
    const collected = new Set(this.state.collected?.[worldId] || []);
    let placed = 0, tries = 0;
    let idx = 0;
    while (placed < GEMS_PER_WORLD && tries < GEMS_PER_WORLD * 40) {
      tries++;
      const x = (rng() * 2 - 1) * (WORLD_SIZE - 6);
      const z = (rng() * 2 - 1) * (WORLD_SIZE - 6);
      // keep off obstacles
      let ok = true;
      for (const o of this.obstacles) { if (Math.hypot(x - o.x, z - o.z) < o.r + 2) { ok = false; break; } }
      if (!ok) continue;
      const thisIndex = idx++;
      placed++;
      if (collected.has(thisIndex)) continue;   // already grabbed — skip visual
      this._addGem(x, z, thisIndex);
    }
  }

  _addGem(x, z, index) {
    const color = GEM_COLORS[index % GEM_COLORS.length];
    const geo = new THREE.OctahedronGeometry(0.7);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
    m.position.set(x, 1.6, z);
    m.castShadow = true;
    this.scene.add(m);
    this.gems.push({ mesh: m, x, z, index, base: 1.6 });
  }

  // ---- multiplayer wiring ----
  attachMultiplayer(mp) {
    this.multiplayer = mp;
    mp.onPlayersChanged((others) => this._syncRemote(others));
  }

  _syncRemote(others) {
    // add / update
    for (const [id, p] of Object.entries(others)) {
      if (p.world !== this.state.world) { this._removeRemote(id); continue; }
      let av = this.remoteAvatars[id];
      if (!av) {
        av = makeAvatar(p.color || 0xff5e5e, p.name || "Friend");
        const holder = new THREE.Group(); holder.add(av);
        this.scene.add(holder);
        this.remoteAvatars[id] = holder;
        holder.userData.avatar = av;
      }
      av.userData._target = { x: p.x, z: p.z, ry: p.ry };
    }
    // remove players who left
    for (const id of Object.keys(this.remoteAvatars)) {
      if (!others[id]) this._removeRemote(id);
    }
  }
  _removeRemote(id) {
    const h = this.remoteAvatars[id];
    if (h) { this.scene.remove(h); delete this.remoteAvatars[id]; }
  }

  // ---- main loop ----
  start(controls) {
    this.controls = controls;
    this.running = true;
    this.renderer.setAnimationLoop(() => this._frame());
  }
  stop() { this.running = false; this.renderer.setAnimationLoop(null); }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // movement
    const mv = this.controls.getMove();
    const fwd = -mv.z, right = mv.x;
    let dx = fwd * this.screenUp.x + right * this.screenRight.x;
    let dz = fwd * this.screenUp.y + right * this.screenRight.y;
    const mag = Math.hypot(dx, dz);
    const moving = mag > 0.05;

    if (moving) {
      dx /= mag; dz /= mag;
      const speed = PLAYER_SPEED * VEHICLE_SPEED_BONUS[this.cb.vehicle() || "none"];
      let nx = this.pos.x + dx * speed * dt;
      let nz = this.pos.y + dz * speed * dt;
      ({ nx, nz } = this._resolveCollision(nx, nz));
      nx = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, nx));
      nz = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, nz));
      this.pos.set(nx, nz);
      this.facing = Math.atan2(dx, dz);
    }
    this.playerHolder.position.x = this.pos.x;
    this.playerHolder.position.z = this.pos.y;
    this.playerHolder.rotation.y += ((this.facing - this.playerHolder.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 12);
    animateWalk(this.avatar, moving, t);

    // jump
    if (this.controls.consumeJump() && this._jumpV === undefined) this._jumpV = 9;
    if (this._jumpV !== undefined) {
      this._jumpH = (this._jumpH || 0) + this._jumpV * dt;
      this._jumpV -= 26 * dt;
      if (this._jumpH <= 0) { this._jumpH = 0; this._jumpV = undefined; }
      this.playerHolder.position.y = this._jumpH || 0;
    }

    // gems: spin, bob, collect
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.mesh.rotation.y += dt * 2;
      g.mesh.position.y = g.base + Math.sin(t * 3 + g.index) * 0.2;
      if (Math.hypot(this.pos.x - g.x, this.pos.y - g.z) < 1.6) {
        this._collect(g); this.gems.splice(i, 1);
      }
    }

    // camera follows
    this.camera.position.set(this.pos.x + this.camOffset.x, this.camOffset.y, this.pos.y + this.camOffset.z);
    this.camera.lookAt(this.pos.x, 2, this.pos.y);
    this.sun.target.position.set(this.pos.x, 0, this.pos.y);
    this.sun.position.set(this.pos.x + 50, 80, this.pos.y + 30);

    // remote avatars: smooth toward target
    for (const holder of Object.values(this.remoteAvatars)) {
      const av = holder.userData.avatar;
      const tg = av.userData._target;
      if (tg) {
        holder.position.x += (tg.x - holder.position.x) * Math.min(1, dt * 8);
        holder.position.z += (tg.z - holder.position.z) * Math.min(1, dt * 8);
        const rmoving = Math.hypot(tg.x - holder.position.x, tg.z - holder.position.z) > 0.05;
        holder.rotation.y += ((tg.ry - holder.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 8);
        animateWalk(av, rmoving, t);
      }
    }

    // broadcast my position
    if (this.multiplayer && this.multiplayer.connected) {
      this.multiplayer.send(this.pos.x, this.pos.y, this.playerHolder.rotation.y, this.state.world, performance.now());
    }

    this.renderer.render(this.scene, this.camera);
  }

  _resolveCollision(nx, nz) {
    for (const o of this.obstacles) {
      const d = Math.hypot(nx - o.x, nz - o.z);
      const min = o.r + PLAYER_RADIUS;
      if (d < min && d > 0.001) {
        const push = (min - d);
        nx += ((nx - o.x) / d) * push;
        nz += ((nz - o.z) / d) * push;
      }
    }
    return { nx, nz };
  }

  _collect(g) {
    this.scene.remove(g.mesh);
    this.state.gems += 1;
    this.state.money += GEM_VALUE;
    if (!this.state.collected[this.state.world]) this.state.collected[this.state.world] = [];
    this.state.collected[this.state.world].push(g.index);
    if (this.cb.onGems) this.cb.onGems();
  }

  _disposeGroup(group) {
    group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { Array.isArray(o.material) ? o.material.forEach(m => m.dispose()) : o.material.dispose(); }
    });
  }
}
