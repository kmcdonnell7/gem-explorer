// ============================================================
//  Gem Explorer — core engine
// ============================================================
import * as THREE from "three";
import { buildWorld, getWorld } from "./worlds.js";
import { makeAvatar, animateWalk } from "./player.js";
import { buildHouseExterior, buildHouseInterior } from "./house.js";
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
const HOME_POS = { x: 32, z: -28 };   // your house plot (same spot in every city)

export class Game {
  constructor(canvasParent, state, callbacks) {
    this.state = state;
    this.cb = callbacks;              // { character, vehicle(), house(), onGems, onWorld, onDoorPrompt }
    this.clock = new THREE.Clock();
    this.gems = [];
    this.obstacles = [];              // active collision set
    this._worldObstacles = [];
    this.worldGroup = null;
    this.remoteAvatars = {};
    this.multiplayer = null;
    this.running = false;

    // house / interior state
    this.inside = false;
    this.houseTier = null;
    this.doorWorld = null;
    this._interiors = {};             // cached interiors per tier
    this.activeInterior = null;
    this._doorPrompt = null;

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

    const aspect = window.innerWidth / window.innerHeight;
    const d = 26;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 400);
    this.camOffset = new THREE.Vector3(60, 70, 60);
    this.camera.position.copy(this.camOffset);
    this.camera.lookAt(0, 0, 0);

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

    this.avatar = makeAvatar(this.cb.character || "max", this.state.name || "You");
    this.playerHolder = new THREE.Group();
    this.playerHolder.add(this.avatar);
    this.scene.add(this.playerHolder);
    this.pos = new THREE.Vector2(0, 6);
    this.facing = 0;

    // Ground-plane directions that map to "up" and "right" on the iso screen.
    this.screenUp = new THREE.Vector2(-1, -1).normalize();
    this.screenRight = new THREE.Vector2(1, -1).normalize();
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
    // if we were indoors, drop back outside first
    if (this.inside) this._forceOutside();

    const world = getWorld(worldId);
    this.state.world = worldId;
    this.scene.background = new THREE.Color(world.sky);
    this.scene.fog = new THREE.Fog(world.sky, 160, 260);

    if (this.worldGroup) { this.scene.remove(this.worldGroup); this._disposeGroup(this.worldGroup); }
    this.gems.forEach(g => this.scene.remove(g.mesh));
    this.gems = [];

    const built = buildWorld(worldId);
    this.worldGroup = built.group;
    this._worldObstacles = built.obstacles.slice();

    this._placeHouse();                       // add your home if you own one
    this.obstacles = this._worldObstacles;
    this.scene.add(this.worldGroup);

    this._spawnGems(worldId);

    this.pos.set(0, 8);
    this.playerHolder.position.set(0, 0, 8);

    if (this.cb.onWorld) this.cb.onWorld(world);
  }

  // (re)build & place the owned house into the current world
  refreshHouse() {
    if (!this.worldGroup) return;
    this._placeHouse();
    if (!this.inside) this.obstacles = this._worldObstacles;
  }

  _placeHouse() {
    // remove a previous exterior
    if (this._houseGroup) { this.worldGroup.remove(this._houseGroup); this._disposeGroup(this._houseGroup); this._houseGroup = null; }
    const tier = this.cb.house ? this.cb.house() : null;   // "cottage" | "mansion" | null
    this.houseTier = tier;
    this.doorWorld = null;
    if (!tier) return;

    const { group, door, radius } = buildHouseExterior(tier);
    group.position.set(HOME_POS.x, 0, HOME_POS.z);
    this._houseGroup = group;
    this.worldGroup.add(group);
    this.doorWorld = { x: HOME_POS.x + door.x, z: HOME_POS.z + door.z };
    // solid collision so you walk up to the door, not through the walls
    this._worldObstacles.push({ x: HOME_POS.x, z: HOME_POS.z, r: radius });
  }

  _spawnGems(worldId) {
    const rng = mulberry32(hash(worldId));
    const collected = new Set(this.state.collected?.[worldId] || []);
    let placed = 0, tries = 0, idx = 0;
    while (placed < GEMS_PER_WORLD && tries < GEMS_PER_WORLD * 40) {
      tries++;
      const x = (rng() * 2 - 1) * (WORLD_SIZE - 6);
      const z = (rng() * 2 - 1) * (WORLD_SIZE - 6);
      let ok = true;
      for (const o of this._worldObstacles) { if (Math.hypot(x - o.x, z - o.z) < o.r + 2) { ok = false; break; } }
      if (!ok) continue;
      const thisIndex = idx++; placed++;
      if (collected.has(thisIndex)) continue;
      this._addGem(x, z, thisIndex);
    }
  }

  _addGem(x, z, index) {
    const color = GEM_COLORS[index % GEM_COLORS.length];
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.7),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
    m.position.set(x, 1.6, z); m.castShadow = true;
    this.scene.add(m);
    this.gems.push({ mesh: m, x, z, index, base: 1.6 });
  }

  // ---- enter / exit house ----
  enterHouse() {
    if (this.inside || !this.houseTier) return;
    const tier = this.houseTier;
    if (!this._interiors[tier]) {
      const built = buildHouseInterior(tier);
      built.group.visible = false;
      this.scene.add(built.group);
      this._interiors[tier] = built;
    }
    const inter = this._interiors[tier];
    this.activeInterior = inter;
    inter.group.visible = true;

    this.worldGroup.visible = false;
    this.gems.forEach(g => g.mesh.visible = false);
    Object.values(this.remoteAvatars).forEach(h => h.visible = false);

    this.obstacles = inter.obstacles;
    this.bounds = inter.bounds;
    this._outsidePos = this.pos.clone();
    this.pos.set(inter.entrance.x, inter.entrance.z);
    this.playerHolder.position.set(this.pos.x, 0, this.pos.y);
    this.inside = true;
    this._setPrompt(null);
  }

  exitHouse() {
    if (!this.inside) return;
    this._forceOutside();
  }

  _forceOutside() {
    if (this.activeInterior) this.activeInterior.group.visible = false;
    this.activeInterior = null;
    if (this.worldGroup) this.worldGroup.visible = true;
    this.gems.forEach(g => g.mesh.visible = true);
    Object.values(this.remoteAvatars).forEach(h => h.visible = true);
    this.obstacles = this._worldObstacles;
    this.bounds = null;
    this.inside = false;
    if (this.doorWorld) { this.pos.set(this.doorWorld.x, this.doorWorld.z + 1.2); }
    this._setPrompt(null);
  }

  _setPrompt(p) {
    if (p !== this._doorPrompt) {
      this._doorPrompt = p;
      if (this.cb.onDoorPrompt) this.cb.onDoorPrompt(p);
    }
  }

  // ---- multiplayer ----
  attachMultiplayer(mp) {
    this.multiplayer = mp;
    mp.onPlayersChanged((others) => this._syncRemote(others));
  }
  _syncRemote(others) {
    for (const [id, p] of Object.entries(others)) {
      if (p.world !== this.state.world) { this._removeRemote(id); continue; }
      let holder = this.remoteAvatars[id];
      if (!holder) {
        const av = makeAvatar(p.char || "max", p.name || "Friend");
        holder = new THREE.Group(); holder.add(av);
        holder.userData.avatar = av;
        holder.visible = !this.inside;
        this.scene.add(holder);
        this.remoteAvatars[id] = holder;
      }
      holder.userData.avatar.userData._target = { x: p.x, z: p.z, ry: p.ry };
    }
    for (const id of Object.keys(this.remoteAvatars)) if (!others[id]) this._removeRemote(id);
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

    const mv = this.controls.getMove();
    const fwd = -mv.z, right = mv.x;
    let dx = fwd * this.screenUp.x + right * this.screenRight.x;
    let dz = fwd * this.screenUp.y + right * this.screenRight.y;
    const mag = Math.hypot(dx, dz);
    const moving = mag > 0.05;

    if (moving) {
      dx /= mag; dz /= mag;
      const vmul = this.inside ? 1 : VEHICLE_SPEED_BONUS[this.cb.vehicle() || "none"];
      const speed = PLAYER_SPEED * vmul;
      let nx = this.pos.x + dx * speed * dt;
      let nz = this.pos.y + dz * speed * dt;
      ({ nx, nz } = this._resolveCollision(nx, nz));
      const lim = this.inside && this.bounds ? this.bounds : { x: WORLD_SIZE, z: WORLD_SIZE };
      nx = Math.max(-lim.x, Math.min(lim.x, nx));
      nz = Math.max(-lim.z, Math.min(lim.z, nz));
      this.pos.set(nx, nz);
      this.facing = Math.atan2(dx, dz);
    }
    this.playerHolder.position.x = this.pos.x;
    this.playerHolder.position.z = this.pos.y;
    this.playerHolder.rotation.y += ((this.facing - this.playerHolder.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 12);
    animateWalk(this.avatar, moving, t);

    // jump (outdoors only)
    if (!this.inside && this.controls.consumeJump() && this._jumpV === undefined) this._jumpV = 9;
    else if (this.inside) this.controls.consumeJump();
    if (this._jumpV !== undefined) {
      this._jumpH = (this._jumpH || 0) + this._jumpV * dt;
      this._jumpV -= 26 * dt;
      if (this._jumpH <= 0) { this._jumpH = 0; this._jumpV = undefined; }
      this.playerHolder.position.y = this._jumpH || 0;
    }

    // door prompt
    if (!this.inside && this.doorWorld) {
      const d = Math.hypot(this.pos.x - this.doorWorld.x, this.pos.y - this.doorWorld.z);
      this._setPrompt(d < 3.6 ? "enter" : null);
    } else if (this.inside && this.activeInterior) {
      const e = this.activeInterior.exit;
      const d = Math.hypot(this.pos.x - e.x, this.pos.y - e.z);
      this._setPrompt(d < 2.2 ? "exit" : null);
    }

    // gems (outdoors only)
    if (!this.inside) {
      for (let i = this.gems.length - 1; i >= 0; i--) {
        const g = this.gems[i];
        g.mesh.rotation.y += dt * 2;
        g.mesh.position.y = g.base + Math.sin(t * 3 + g.index) * 0.2;
        if (Math.hypot(this.pos.x - g.x, this.pos.y - g.z) < 1.6) { this._collect(g); this.gems.splice(i, 1); }
      }
    }

    // camera
    this.camera.position.set(this.pos.x + this.camOffset.x, this.camOffset.y, this.pos.y + this.camOffset.z);
    this.camera.lookAt(this.pos.x, 2, this.pos.y);
    this.sun.target.position.set(this.pos.x, 0, this.pos.y);
    this.sun.position.set(this.pos.x + 50, 80, this.pos.y + 30);

    // remote avatars
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

    // broadcast (freeze at door while indoors)
    if (this.multiplayer && this.multiplayer.connected) {
      const bx = this.inside ? (this.doorWorld?.x ?? this.pos.x) : this.pos.x;
      const bz = this.inside ? (this.doorWorld?.z ?? this.pos.y) : this.pos.y;
      this.multiplayer.send(bx, bz, this.playerHolder.rotation.y, this.state.world, performance.now());
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
