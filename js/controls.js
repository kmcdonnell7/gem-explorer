// ============================================================
//  Gem Explorer — input (touch joystick + keyboard)
// ============================================================

export class Controls {
  constructor() {
    this.move = { x: 0, z: 0 };     // normalized -1..1
    this.jumpQueued = false;
    this.keys = {};
    this._joyId = null;
    this._initKeyboard();
    this._initJoystick();
    this._initJump();
  }

  _initKeyboard() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === " ") { this.jumpQueued = true; e.preventDefault(); }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  _keyboardVector() {
    const k = this.keys;
    let x = 0, z = 0;
    if (k["w"] || k["arrowup"]) z -= 1;
    if (k["s"] || k["arrowdown"]) z += 1;
    if (k["a"] || k["arrowleft"]) x -= 1;
    if (k["d"] || k["arrowright"]) x += 1;
    if (x || z) { const m = Math.hypot(x, z) || 1; return { x: x / m, z: z / m }; }
    return null;
  }

  _initJoystick() {
    const zone = document.getElementById("joystick-zone");
    const base = document.getElementById("joystick-base");
    const thumb = document.getElementById("joystick-thumb");
    const radius = 48;

    const start = (id, cx, cy, rect) => {
      this._joyId = id;
      // place base where the finger touched (within the zone)
      const zr = zone.getBoundingClientRect();
      const bx = cx - zr.left, by = cy - zr.top;
      base.style.left = (bx - 65) + "px";
      base.style.bottom = (zr.height - by - 65) + "px";
      base.style.display = "block";
    };
    const moveTo = (cx, cy) => {
      const br = base.getBoundingClientRect();
      const ccx = br.left + br.width / 2, ccy = br.top + br.height / 2;
      let dx = cx - ccx, dy = cy - ccy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, radius);
      const ang = Math.atan2(dy, dx);
      const tx = Math.cos(ang) * clamped, ty = Math.sin(ang) * clamped;
      thumb.style.left = (34 + tx) + "px";
      thumb.style.top = (34 + ty) + "px";
      this.move.x = (tx / radius);
      this.move.z = (ty / radius);
    };
    const end = () => {
      this._joyId = null;
      base.style.display = "none";
      thumb.style.left = "34px"; thumb.style.top = "34px";
      this.move.x = 0; this.move.z = 0;
    };

    zone.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      start(t.identifier, t.clientX, t.clientY);
      moveTo(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) { moveTo(t.clientX, t.clientY); }
      }
      e.preventDefault();
    }, { passive: false });
    const finish = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this._joyId) end();
    };
    zone.addEventListener("touchend", finish);
    zone.addEventListener("touchcancel", finish);

    // Mouse fallback (desktop testing)
    let mouseDown = false;
    zone.addEventListener("mousedown", (e) => { mouseDown = true; start("m", e.clientX, e.clientY); moveTo(e.clientX, e.clientY); });
    window.addEventListener("mousemove", (e) => { if (mouseDown) moveTo(e.clientX, e.clientY); });
    window.addEventListener("mouseup", () => { if (mouseDown) { mouseDown = false; end(); } });
  }

  _initJump() {
    const btn = document.getElementById("btn-jump");
    const fire = (e) => { this.jumpQueued = true; e.preventDefault(); };
    btn.addEventListener("touchstart", fire, { passive: false });
    btn.addEventListener("mousedown", fire);
  }

  // Called each frame by the game: returns movement direction, prefers keyboard if active
  getMove() {
    const kb = this._keyboardVector();
    if (kb) return kb;
    return { x: this.move.x, z: this.move.z };
  }

  consumeJump() {
    if (this.jumpQueued) { this.jumpQueued = false; return true; }
    return false;
  }
}
