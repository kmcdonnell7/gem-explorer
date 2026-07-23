// ============================================================
//  Gem Explorer — bootstrap & UI wiring
// ============================================================
import { Game } from "./game.js";
import { Controls } from "./controls.js";
import { CHARACTERS, characterSVG, getCharacter } from "./player.js";
import { WORLDS, getWorld } from "./worlds.js";
import {
  loadState, saveState, SHOP_ITEMS, bestVehicle, bestHouse,
  renderShop, renderGarage
} from "./shop.js";
import { Multiplayer, makeRoomCode } from "./multiplayer.js";
import { flyTo } from "./fly.js";
import { MULTIPLAYER_ENABLED, GEM_VALUE } from "./config.js";

const $ = (id) => document.getElementById(id);

const state = loadState();
if (!state.character) state.character = CHARACTERS[0].id;
const myColor = getCharacter(state.character).top;
let game = null;
let controls = null;
let mp = null;

// prefill name
$("player-name").value = state.name || "";

// ---------- character picker ----------
function renderCharGrid() {
  const grid = $("char-grid");
  grid.innerHTML = "";
  for (const c of CHARACTERS) {
    const card = document.createElement("button");
    card.className = "char-card" + (c.id === state.character ? " selected" : "");
    card.innerHTML = characterSVG(c) + `<div class="cname">${c.name}</div>`;
    card.addEventListener("click", () => {
      state.character = c.id;
      saveState(state);
      renderCharGrid();
    });
    grid.appendChild(card);
  }
}
renderCharGrid();

// ---------- helpers ----------
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 1400);
}

function refreshHUD() {
  $("money").textContent = state.money.toLocaleString();
  $("gem-count").textContent = state.gems.toLocaleString();
  const w = getWorld(state.world);
  $("world-name").textContent = w.name;
  updateHint();
  saveState(state);
}

// dynamic "what should I do next" nudge
function updateHint() {
  const pill = $("hint-pill");
  const owned = state.owned;
  const hasVehicle = SHOP_ITEMS.some(i => owned.includes(i.id) && (i.type === "bike" || i.type === "car"));
  const hasHouse = bestHouse(state);
  const bikePrice = SHOP_ITEMS.find(i => i.id === "bmx").price;
  const housePrice = SHOP_ITEMS.find(i => i.id === "cottage").price;
  const cheapest = SHOP_ITEMS.filter(i => !owned.includes(i.id)).sort((a, b) => a.price - b.price)[0];
  let msg;
  if (state.gems === 0) msg = "💎 Walk around and grab some gems!";
  else if (!hasVehicle && state.money < bikePrice) msg = `💎 Collect ${Math.ceil((bikePrice - state.money) / GEM_VALUE)} more to buy a 🚲 bike!`;
  else if (!hasVehicle && state.money >= bikePrice) msg = "🛒 You can buy a 🚲 bike now — tap the cart!";
  else if (!hasHouse && state.money < housePrice) msg = "💎 Keep collecting to buy your own 🏠 house!";
  else if (!hasHouse && state.money >= housePrice) msg = "🛒 You can buy a 🏠 house now — tap the cart!";
  else if (hasHouse) msg = "🏠 Follow the golden beam to your home — or ✈️ travel!";
  else if (cheapest) msg = `🛒 Save up for a ${cheapest.emoji} ${cheapest.name}!`;
  else msg = "🌍 Explore and have fun!";
  pill.textContent = msg;
  pill.classList.remove("hidden");
}

// home compass arrow (updated every frame by the engine)
let _lastArrowDeg = 999;
function updateHomeArrow(data) {
  const el = $("home-arrow");
  if (!data.show) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  if (Math.abs(data.deg - _lastArrowDeg) > 1.5) {
    el.querySelector(".arrow").style.transform = `rotate(${data.deg - 90}deg)`; // ➤ points right at 0°
    _lastArrowDeg = data.deg;
  }
  el.querySelector(".ha-dist").textContent = data.dist + "m";
}

// contextual enter/exit-house button
function updateDoorButton(prompt) {
  const btn = $("btn-door");
  if (!prompt) { btn.classList.add("hidden"); return; }
  btn.innerHTML = prompt === "enter" ? "🏠<br><small>ENTER</small>" : "🚪<br><small>EXIT</small>";
  btn.dataset.mode = prompt;
  btn.classList.remove("hidden");
}
$("btn-door").addEventListener("click", () => {
  if (!game) return;
  if ($("btn-door").dataset.mode === "enter") game.enterHouse();
  else game.exitHouse();
});

function openPanel(id) {
  if (id === "shop-panel") renderShop(state, buyItem);
  if (id === "menu-panel") renderGarage(state);
  if (id === "travel-panel") renderTravel();
  $(id).classList.remove("hidden");
}
function closePanel(id) { $(id).classList.add("hidden"); }

// ---------- game start ----------
function startGame() {
  state.name = ($("player-name").value || "Explorer").trim().slice(0, 12);
  saveState(state);

  $("start-screen").classList.add("hidden");
  $("room-screen").classList.add("hidden");
  $("hud").classList.remove("hidden");

  if (!game) {
    controls = new Controls();
    game = new Game(document.body, state, {
      character: state.character,
      color: myColor,
      vehicle: () => bestVehicle(state),
      house: () => bestHouse(state),
      onGems: () => { refreshHUD(); toast(`💎 +${GEM_VALUE}!`); },
      onWorld: (w) => refreshHUD(),
      onDoorPrompt: updateDoorButton,
      onHomeArrow: updateHomeArrow,
      onRespawn: () => toast("✨ Fresh gems appeared!"),
    });
    game.loadWorld(state.world);
    if (mp) game.attachMultiplayer(mp);
    game.start(controls);
  }
  refreshHUD();

  // show the how-to-play the very first time
  if (!state.seenHelp) {
    state.seenHelp = true; saveState(state);
    setTimeout(() => openPanel("help-panel"), 350);
  }
}

// ---------- shop ----------
function buyItem(item) {
  if (state.owned.includes(item.id) || state.money < item.price) return;
  state.money -= item.price;
  state.owned.push(item.id);
  saveState(state);
  renderShop(state, buyItem);
  refreshHUD();
  if (item.type === "house" && game) game.refreshHouse();   // drop the new home into the world
  if (game && (item.type === "bike" || item.type === "car" || item.type === "airplane")) game.refreshVehicle();
  const line = { bike: "Zoom zoom! You're faster now! 🚲",
                 car: "Vroom! Cars are super fast! 🚗",
                 house: "Home sweet home! Find your 🏠 and go inside!",
                 airplane: "Wheee! Fastest of all! ✈️" }[item.type];
  toast(`${item.emoji} ${line}`);
}

// ---------- travel ----------
function renderTravel() {
  const grid = $("travel-items");
  grid.innerHTML = "";
  for (const w of WORLDS) {
    const card = document.createElement("button");
    card.className = "travel-card" + (w.id === state.world ? " current" : "");
    card.style.background = w.gradient;
    card.innerHTML = `<div style="font-size:2.6rem">${w.emoji}</div><h3>${w.name}</h3>
      <small>${w.id === state.world ? "You are here" : "Tap to fly ✈️"}</small>`;
    if (w.id !== state.world) card.addEventListener("click", () => travelTo(w.id));
    grid.appendChild(card);
  }
}
function travelTo(worldId) {
  closePanel("travel-panel");
  const from = state.world;
  flyTo(from, worldId, () => { game.loadWorld(worldId); refreshHUD(); });
}

// ---------- multiplayer room UI ----------
function showRoomScreen() {
  const info = $("room-info");
  if (!MULTIPLAYER_ENABLED) {
    info.innerHTML = `<p class="room-hint">👋 Playing with a friend isn't set up yet.<br><br>
      Ask the grown-up who made this game to add the free Firebase code —
      then you and a friend can explore together!</p>`;
    $("start-screen").classList.add("hidden");
    $("room-screen").classList.remove("hidden");
    return;
  }
  info.innerHTML = `
    <button id="btn-create-room" class="big-btn">✨ Start a new room</button>
    <div class="divider">— or —</div>
    <p class="room-hint">Enter your friend's code:</p>
    <input id="join-code" class="code-input" maxlength="4" placeholder="ABCD" />
    <button id="btn-join-room" class="big-btn" style="margin-top:12px">Join room</button>
    <p id="room-msg" class="mp-status"></p>`;
  $("start-screen").classList.add("hidden");
  $("room-screen").classList.remove("hidden");

  $("btn-create-room").addEventListener("click", async () => {
    const code = makeRoomCode();
    await connectRoom(code, true);
  });
  $("btn-join-room").addEventListener("click", async () => {
    const code = ($("join-code").value || "").toUpperCase().trim();
    if (code.length !== 4) { $("room-msg").textContent = "Type the 4-letter code."; return; }
    await connectRoom(code, false);
  });
}

async function connectRoom(code, isHost) {
  const msg = $("room-msg");
  if (msg) msg.textContent = "Connecting…";
  try {
    state.name = ($("player-name").value || "Explorer").trim().slice(0, 12) || "Explorer";
    mp = new Multiplayer();
    mp.setProfile(state.name, myColor, state.character);
    await mp.join(code, { name: state.name, color: myColor, char: state.character, world: state.world });
    // show the code big, then start
    $("room-info").innerHTML = `
      <p class="room-hint">${isHost ? "Share this code with your friend:" : "Joined room:"}</p>
      <div class="code-box">${mp.roomCode}</div>
      <p class="room-hint">Travel to the same city to see each other! ✈️</p>`;
    setTimeout(() => {
      startGame();
      if (game) game.attachMultiplayer(mp);
      toast(`👯 Room ${mp.roomCode} — explore together!`);
    }, isHost ? 1600 : 600);
  } catch (e) {
    if (msg) msg.textContent = "Couldn't connect. Check the Firebase setup.";
    console.error(e);
  }
}

// ---------- events ----------
$("btn-play-solo").addEventListener("click", startGame);
$("btn-host").addEventListener("click", showRoomScreen);
$("btn-room-back").addEventListener("click", () => {
  $("room-screen").classList.add("hidden");
  $("start-screen").classList.remove("hidden");
});

$("btn-shop").addEventListener("click", () => openPanel("shop-panel"));
$("btn-travel").addEventListener("click", () => openPanel("travel-panel"));
$("btn-help").addEventListener("click", () => openPanel("help-panel"));
$("btn-help-ok").addEventListener("click", () => closePanel("help-panel"));
$("btn-menu").addEventListener("click", () => openPanel("menu-panel"));
document.querySelectorAll(".close-btn").forEach(b =>
  b.addEventListener("click", () => closePanel(b.dataset.close)));

$("btn-invite").addEventListener("click", () => { closePanel("menu-panel"); showRoomScreen(); });
$("btn-quit").addEventListener("click", () => {
  closePanel("menu-panel");
  $("hud").classList.add("hidden");
  $("start-screen").classList.remove("hidden");
});

// keep gems/money saved on the way out
window.addEventListener("beforeunload", () => { if (mp) mp.leave(); saveState(state); });

// expose for debugging
window.__gem = { state, get game() { return game; }, get controls() { return controls; } };
