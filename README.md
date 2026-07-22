# 💎 Gem Explorer

A Roblox-style, kid-friendly exploration game. Wander three cities — **Los Angeles**, **London**, and **Miami** — collect gems everywhere you go, and trade them for money to buy **bikes, cars, houses, and airplanes**. Play solo, or with a friend across separate browsers/iPads.

Built with plain HTML + [Three.js](https://threejs.org/) (isometric 3D-lite). No build step — it's all static files, perfect for GitHub Pages.

## ▶️ Play
Open `index.html` in a browser, or visit the GitHub Pages link once deployed.

**Controls (touch or keyboard):**
- Move: on-screen joystick (bottom-left) or **WASD / arrow keys**
- Jump: green **JUMP** button or **Spacebar**
- 🛒 Shop · ✈️ Travel between cities · ☰ Menu / garage

## 🌍 The worlds
| City | Landmarks |
|------|-----------|
| 🌴 Los Angeles | Hollywood sign, Griffith Observatory, palm-lined streets, movie studios |
| 🎡 London | Big Ben, Tower Bridge, the London Eye, red double-decker buses & phone boxes |
| 🏖️ Miami | Art-deco beach strip, ocean & yachts, lifeguard tower, palms & umbrellas |

Gems and money carry across all three cities and are saved in your browser.

## 👯 Two-player (optional)
Cross-browser multiplayer uses a **free Firebase Realtime Database**. The game is 100% playable solo without it. To turn on "Play with a friend", add your Firebase config in [`js/config.js`](js/config.js) — see the comments at the top of that file.

## 🗂️ Structure
```
index.html         layout + UI overlay
css/style.css      styling / HUD
js/config.js       tuning + Firebase config
js/worlds.js       the three cities & landmarks
js/player.js       blocky avatar
js/controls.js     joystick + keyboard
js/game.js         engine: camera, gems, loop, collisions
js/shop.js         shop, inventory, save/load
js/multiplayer.js  Firebase sync (lazy-loaded)
js/main.js         wires it all together
```
