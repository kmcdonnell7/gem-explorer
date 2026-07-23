// ============================================================
//  Gem Explorer — "flying across the globe" travel animation
// ============================================================
import { getWorld } from "./worlds.js";

// rough map positions (SVG viewBox 0..100 x, 0..60 y)
const MAP = {
  la:     { x: 16, y: 30, label: "Los Angeles" },
  miami:  { x: 33, y: 41, label: "Miami" },
  london: { x: 71, y: 19, label: "London" },
};

let overlay = null;

function build() {
  overlay = document.createElement("div");
  overlay.id = "fly-screen";
  overlay.innerHTML = `
    <div class="fly-inner">
      <h2 class="fly-title">✈️ Flying…</h2>
      <svg id="fly-map" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="globeG" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#3aa0ff"/><stop offset="100%" stop-color="#1f6fce"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="30" r="29" fill="url(#globeG)" stroke="#ffffff55" stroke-width="0.6"/>
        <!-- stylized landmasses -->
        <path d="M10,26 Q18,18 26,24 Q30,30 24,36 Q16,40 11,34 Z" fill="#5bbf6a"/>
        <path d="M28,36 Q33,34 35,42 Q33,50 29,47 Q26,42 28,36 Z" fill="#5bbf6a"/>
        <path d="M60,16 Q72,10 82,18 Q86,26 78,30 Q66,32 61,24 Z" fill="#66c977"/>
        <path d="M64,34 Q74,32 78,40 Q74,48 66,44 Q60,40 64,34 Z" fill="#66c977"/>
        <!-- meridians for a globe feel -->
        <ellipse cx="50" cy="30" rx="29" ry="12" fill="none" stroke="#ffffff33" stroke-width="0.4"/>
        <ellipse cx="50" cy="30" rx="12" ry="29" fill="none" stroke="#ffffff33" stroke-width="0.4"/>
        <path id="fly-arc" fill="none" stroke="#fff" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.9"/>
        <g id="fly-dots"></g>
      </svg>
      <div id="fly-plane">✈️</div>
      <p class="fly-sub"></p>
    </div>`;
  document.body.appendChild(overlay);
}

function bezier(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

// flyTo(fromId, toId, onArrive) — plays ~2.4s then calls onArrive() once.
export function flyTo(fromId, toId, onArrive) {
  if (!overlay) build();
  const from = MAP[fromId] || MAP.la;
  const to = MAP[toId] || MAP.london;
  const dest = getWorld(toId);

  overlay.querySelector(".fly-title").textContent = `✈️ Flying to ${dest.name} ${dest.emoji}`;
  overlay.querySelector(".fly-sub").textContent = `${from.label}  →  ${to.label}`;

  // city dots
  const dots = overlay.querySelector("#fly-dots");
  dots.innerHTML = "";
  for (const [id, m] of Object.entries(MAP)) {
    const active = id === fromId || id === toId;
    dots.insertAdjacentHTML("beforeend",
      `<circle cx="${m.x}" cy="${m.y}" r="${active ? 1.6 : 1}" fill="${active ? "#ffd24a" : "#ffffffaa"}"/>` +
      `<text x="${m.x}" y="${m.y - 2.4}" font-size="3" fill="#fff" text-anchor="middle" opacity="${active ? 1 : 0.6}">${m.label}</text>`);
  }

  // arc path
  const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 16 };
  const arc = overlay.querySelector("#fly-arc");
  arc.setAttribute("d", `M${from.x},${from.y} Q${ctrl.x},${ctrl.y} ${to.x},${to.y}`);

  const plane = overlay.querySelector("#fly-plane");
  const map = overlay.querySelector("#fly-map");

  overlay.classList.add("show");

  const DURATION = 2400;
  let start = null, done = false;
  const finish = () => {
    if (done) return; done = true;
    overlay.classList.remove("show");
    setTimeout(onArrive, 260);       // let the fade-out play
  };

  // position the plane along the arc, mapping SVG coords → pixels
  function place(t) {
    const p = bezier(from, ctrl, to, t);
    const pAhead = bezier(from, ctrl, to, Math.min(1, t + 0.01));
    const rect = map.getBoundingClientRect();
    const px = rect.left + (p.x / 100) * rect.width;
    const py = rect.top + (p.y / 60) * rect.height;
    const ang = Math.atan2(pAhead.y - p.y, pAhead.x - p.x) * 180 / Math.PI;
    plane.style.left = px + "px";
    plane.style.top = py + "px";
    plane.style.transform = `translate(-50%,-50%) rotate(${ang + 45}deg)`;
  }
  place(0);

  function step(now) {
    if (start === null) start = now;
    const t = Math.min(1, (now - start) / DURATION);
    place(t);
    if (t < 1) requestAnimationFrame(step);
    else finish();
  }
  requestAnimationFrame(step);
  // safety: guarantee arrival even if rAF is throttled
  setTimeout(finish, DURATION + 900);
}
