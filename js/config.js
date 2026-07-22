// ============================================================
//  Gem Explorer — configuration
// ============================================================
//
//  MULTIPLAYER (optional):
//  The game plays fully in single-player with NO setup.
//  To play with a friend across separate browsers/iPads, create a
//  free Firebase project and paste its config below (see the
//  checklist your assistant gave you). Until then, "Play with a
//  friend" will show a friendly "not set up yet" message.
//
//  1. Go to https://console.firebase.google.com  → Add project
//  2. Build → Realtime Database → Create database → Start in TEST mode
//  3. Project settings (gear) → "Your apps" → Web (</>) → register
//  4. Copy the firebaseConfig values into the object below.
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA1yLvDfjP9PrvmpNv40ys-IMKmZuWmCkI",
  authDomain: "gem-explorer-9fbb6.firebaseapp.com",
  databaseURL: "https://gem-explorer-9fbb6-default-rtdb.firebaseio.com",
  projectId: "gem-explorer-9fbb6",
  storageBucket: "gem-explorer-9fbb6.firebasestorage.app",
  messagingSenderId: "761108066426",
  appId: "1:761108066426:web:ffafbc74b46e5d70e7cbc3",
  measurementId: "G-F8CW4WWB1Q"
};

// Multiplayer is considered "available" only when a databaseURL is present.
export const MULTIPLAYER_ENABLED = !!FIREBASE_CONFIG.databaseURL;

// ---- Gameplay tuning -------------------------------------------------------
export const GEM_VALUE = 10;          // money per gem when collected
export const GEMS_PER_WORLD = 40;     // gems scattered around each world
export const PLAYER_SPEED = 9;        // walk speed (units/sec)
export const VEHICLE_SPEED_BONUS = {  // speed multiplier while owning/using
  none: 1, bike: 1.6, car: 2.4, airplane: 3.4
};
export const WORLD_SIZE = 90;         // half-extent of each city ground plane

// A little starting money so the shop feels alive immediately.
export const STARTING_MONEY = 0;
