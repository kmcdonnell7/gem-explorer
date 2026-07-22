// ============================================================
//  Gem Explorer — multiplayer via Firebase Realtime Database
//  Loads Firebase from CDN only when a room is actually joined,
//  so single-player has zero network cost.
// ============================================================
import { FIREBASE_CONFIG, MULTIPLAYER_ENABLED } from "./config.js";

const FB_APP = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
const FB_DB  = "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export class Multiplayer {
  constructor() {
    this.enabled = MULTIPLAYER_ENABLED;
    this.connected = false;
    this.roomCode = null;
    this.playerId = "p_" + Math.random().toString(36).slice(2, 9);
    this.others = {};          // playerId -> {name,color,world,x,z,ry}
    this._db = null;
    this._playersRef = null;
    this._onChange = null;
    this._lastSend = 0;
  }

  onPlayersChanged(cb) { this._onChange = cb; }

  async join(roomCode, profile) {
    if (!this.enabled) throw new Error("multiplayer-disabled");
    const [{ initializeApp }, dbMod] = await Promise.all([import(FB_APP), import(FB_DB)]);
    const { getDatabase, ref, onValue, onDisconnect, set, remove } = dbMod;

    const app = initializeApp(FIREBASE_CONFIG);
    this._db = getDatabase(app);
    this._fb = { ref, onValue, onDisconnect, set, remove };
    this.roomCode = roomCode.toUpperCase();

    const meRef = ref(this._db, `rooms/${this.roomCode}/players/${this.playerId}`);
    this._meRef = meRef;
    await set(meRef, { name: profile.name, color: profile.color, world: profile.world, x: 0, z: 0, ry: 0, t: 0 });
    onDisconnect(meRef).remove();

    this._playersRef = ref(this._db, `rooms/${this.roomCode}/players`);
    onValue(this._playersRef, (snap) => {
      const val = snap.val() || {};
      this.others = {};
      for (const [id, p] of Object.entries(val)) {
        if (id !== this.playerId) this.others[id] = p;
      }
      if (this._onChange) this._onChange(this.others);
    });
    this.connected = true;
    return this.roomCode;
  }

  // Throttled position broadcast (~10/sec)
  send(x, z, ry, world, now) {
    if (!this.connected) return;
    if (now - this._lastSend < 90) return;
    this._lastSend = now;
    this._fb.set(this._meRef, {
      name: this._name, color: this._color, world,
      x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(2), t: 0
    });
  }

  setProfile(name, color) { this._name = name; this._color = color; }

  leave() {
    if (this._meRef && this._fb) { this._fb.remove(this._meRef); }
    this.connected = false;
    this.others = {};
  }
}
