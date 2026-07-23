// ============================================================
//  Gem Explorer — shop, inventory & persistent player state
// ============================================================
import { STARTING_MONEY } from "./config.js";

export const SHOP_ITEMS = [
  // bikes (fastest to afford)
  { id: "bmx",      name: "BMX Bike",     emoji: "🚲", price: 100,   type: "bike" },
  { id: "ebike",    name: "E-Bike",       emoji: "🛵", price: 250,   type: "bike" },
  // houses (cheap — a house is an early goal, not an endgame grind)
  { id: "cottage",  name: "Cozy House",   emoji: "🏠", price: 500,   type: "house" },
  { id: "mansion",  name: "Mega Mansion", emoji: "🏰", price: 2000,  type: "house" },
  // cars
  { id: "hatch",    name: "City Car",     emoji: "🚗", price: 800,   type: "car" },
  { id: "sports",   name: "Sports Car",   emoji: "🏎️", price: 1500,  type: "car" },
  // airplanes
  { id: "prop",     name: "Prop Plane",   emoji: "🛩️", price: 2500,  type: "airplane" },
  { id: "jet",      name: "Private Jet",  emoji: "✈️", price: 5000,  type: "airplane" },
];

const SAVE_KEY = "gem-explorer-save-v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    name: "",
    money: STARTING_MONEY,
    gems: 0,
    owned: [],          // array of item ids
    world: "la",
    collected: {},      // { worldId: [gemIndex,...] } gems already grabbed
  };
}

export function saveState(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

// best house the player owns → which home appears in the world ("mansion" | "cottage" | null)
export function bestHouse(state) {
  if (state.owned.includes("mansion")) return "mansion";
  if (state.owned.includes("cottage")) return "cottage";
  return null;
}

// best vehicle the player owns → drives their speed
export function bestVehicle(state) {
  if (state.owned.some(id => SHOP_ITEMS.find(i => i.id === id && i.type === "airplane"))) return "airplane";
  if (state.owned.some(id => SHOP_ITEMS.find(i => i.id === id && i.type === "car"))) return "car";
  if (state.owned.some(id => SHOP_ITEMS.find(i => i.id === id && i.type === "bike"))) return "bike";
  return "none";
}

// ---- UI rendering ----------------------------------------------------------

export function renderShop(state, onBuy) {
  document.querySelectorAll(".money-echo").forEach(el => el.textContent = state.money.toLocaleString());
  const grid = document.getElementById("shop-items");
  grid.innerHTML = "";
  for (const item of SHOP_ITEMS) {
    const owned = state.owned.includes(item.id);
    const canAfford = state.money >= item.price;
    const card = document.createElement("div");
    card.className = "shop-card";
    card.innerHTML = `
      <div class="emoji">${item.emoji}</div>
      <h3>${item.name}</h3>
      <div class="price">💰 ${item.price.toLocaleString()}</div>
      <button class="buy-btn ${owned ? "owned" : ""}" ${owned || !canAfford ? "disabled" : ""}>
        ${owned ? "✓ Owned" : canAfford ? "Buy" : "Need more 💰"}
      </button>`;
    if (!owned && canAfford) {
      card.querySelector("button").addEventListener("click", () => onBuy(item));
    }
    grid.appendChild(card);
  }
}

export function renderGarage(state) {
  const garage = document.getElementById("garage");
  garage.innerHTML = "";
  const owned = SHOP_ITEMS.filter(i => state.owned.includes(i.id));
  if (owned.length === 0) {
    garage.innerHTML = `<div class="slot empty" style="grid-column:1/-1">Nothing yet — collect gems and buy something in the 🛒 shop!</div>`;
    return;
  }
  for (const item of owned) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.innerHTML = `<div class="emoji">${item.emoji}</div><small>${item.name}</small>`;
    garage.appendChild(slot);
  }
}
