/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   Constants: SF1e data, subsystem types, weapon catalog
   ========================================================================== */

export const MODULE_ID = "starship-combat-ftl";
export const FLAG_KEY = "shipData";
export const IS_SHIP_FLAG = "isStarship";

// ── Size Modifiers ──────────────────────────────────────────────────────────
export const SIZE_CATEGORIES = {
  tiny:         { label: "Tiny",         acTlMod: 2  },
  small:        { label: "Small",        acTlMod: 1  },
  medium:       { label: "Medium",       acTlMod: 0  },
  large:        { label: "Large",        acTlMod: -1 },
  huge:         { label: "Huge",         acTlMod: -2 },
  gargantuan:   { label: "Gargantuan",   acTlMod: -4 },
  colossal:     { label: "Colossal",     acTlMod: -8 }
};

// ── Maneuverability ─────────────────────────────────────────────────────────
export const MANEUVERABILITY = {
  perfect:  { label: "Perfect",  pilotMod: 2,  turn: 0 },
  good:     { label: "Good",     pilotMod: 1,  turn: 1 },
  average:  { label: "Average",  pilotMod: 0,  turn: 2 },
  poor:     { label: "Poor",     pilotMod: -1, turn: 3 },
  clumsy:   { label: "Clumsy",   pilotMod: -2, turn: 4 }
};

// ── Subsystem Types (can have multiple of each) ─────────────────────────────
export const SUBSYSTEM_TYPES = {
  lifeSupport:  { label: "Life Support",  icon: "fa-heart-pulse", default: true },
  sensors:      { label: "Sensors",       icon: "fa-satellite-dish", default: true },
  weaponsArray: { label: "Weapons Array", icon: "fa-crosshairs", default: true },
  engines:      { label: "Engines",       icon: "fa-jet-fighter", default: true },
  powerCore:    { label: "Power Core",    icon: "fa-bolt", default: true },
  misc:         { label: "Misc",          icon: "fa-gear", default: false }
};

// ── Damage Conditions (4 states) ────────────────────────────────────────────
export const DAMAGE_CONDITIONS = {
  nominal:       { label: "Nominal",       severity: 0, color: "#22c55e" },
  glitching:     { label: "Glitching",     severity: 1, color: "#eab308" },
  malfunctioning:{ label: "Malfunctioning",severity: 2, color: "#f97316" },
  wrecked:       { label: "Wrecked",       severity: 3, color: "#ef4444" }
};

// ── Crew Roles ──────────────────────────────────────────────────────────────
export const ROLES = {
  pilot:    { label: "Pilot",          icon: "fa-plane",          primarySkill: "piloting" },
  gunner:   { label: "Gunner",         icon: "fa-crosshairs",     primarySkill: "gunnery" },
  security: { label: "Security",       icon: "fa-shield",         primarySkill: "computers" },
  arcnet:   { label: "ArcNet Officer", icon: "fa-wand-sparkles",  primarySkill: "mysticism" },
  engineer: { label: "Engineer",       icon: "fa-wrench",         primarySkill: "engineering" }
};

// ── Weapon Types ────────────────────────────────────────────────────────────
export const WEAPON_FIRING_TYPES = {
  directFire: { label: "Direct-Fire", checksAgainst: "ac" },
  tracking:   { label: "Tracking",    checksAgainst: "tl" }
};

// ── Tracking Speed Classes ──────────────────────────────────────────────────
export const TRACKING_SPEEDS = {
  fast:   { label: "Fast",   turnsToHit: 1 },
  medium: { label: "Medium", turnsToHit: 2 },
  slow:   { label: "Slow",   turnsToHit: 3 }
};

// ── Weapon Arcs ─────────────────────────────────────────────────────────────
export const ARCS = {
  forward:   { label: "Forward" },
  port:      { label: "Port" },
  starboard: { label: "Starboard" },
  aft:       { label: "Aft" },
  turret:    { label: "Turret" }
};

// ── Weapon Mount Sizes ──────────────────────────────────────────────────────
export const MOUNT_SIZES = ["light", "heavy", "capital", "spinal"];

// ── Weapon Catalog ──────────────────────────────────────────────────────────
export const WEAPON_CATALOG = {
  // Light Direct-Fire
  lightLaserCannon:     { name: "Light Laser Cannon",     type: "directFire", mount: "light", damage: "2d4",   range: "short",  pcu: 5,  bp: 2  },
  coilgun:              { name: "Coilgun",                 type: "directFire", mount: "light", damage: "4d4",   range: "long",   pcu: 10, bp: 10 },
  gyrolaser:            { name: "Gyrolaser",               type: "directFire", mount: "light", damage: "1d8",   range: "short",  pcu: 10, bp: 3  },
  lightParticleCannon:  { name: "Light Particle Cannon",   type: "directFire", mount: "light", damage: "3d6",   range: "medium", pcu: 10, bp: 10 },
  lightPlasmaCannon:    { name: "Light Plasma Cannon",     type: "directFire", mount: "light", damage: "2d12",  range: "short",  pcu: 10, bp: 12 },
  flakThrower:          { name: "Flak Thrower",            type: "directFire", mount: "light", damage: "3d4",   range: "short",  pcu: 10, bp: 5  },
  chainCannon:          { name: "Chain Cannon",            type: "directFire", mount: "light", damage: "6d4",   range: "short",  pcu: 15, bp: 10 },
  laserNet:             { name: "Laser Net",               type: "directFire", mount: "light", damage: "2d6",   range: "short",  pcu: 10, bp: 9  },
  miningLaser:          { name: "Mining Laser",            type: "directFire", mount: "light", damage: "2d6",   range: "short",  pcu: 10, bp: 5  },

  // Light Tracking
  lightTorpedoLauncher: { name: "Light Torpedo Launcher",  type: "tracking",   mount: "light", damage: "2d8",   range: "long",   pcu: 5,  bp: 7,  speed: 16, trackingClass: "fast" },
  micromissileBattery:  { name: "Micromissile Battery",    type: "tracking",   mount: "light", damage: "2d6",   range: "long",   pcu: 10, bp: 5,  speed: 10, trackingClass: "medium" },
  heMissileLauncher:    { name: "HE Missile Launcher",     type: "tracking",   mount: "light", damage: "4d8",   range: "long",   pcu: 10, bp: 14, speed: 12, trackingClass: "medium" },
  nuclearMissileLauncher:{ name: "Tactical Nuke Launcher", type: "tracking",   mount: "light", damage: "5d8",   range: "long",   pcu: 10, bp: 18, speed: 10, trackingClass: "slow" },
  slowBurnMissile:      { name: "Slow Burn Missile",       type: "tracking",   mount: "light", damage: "4d6",   range: "long",   pcu: 10, bp: 4,  speed: 8,  trackingClass: "slow" },

  // Heavy Direct-Fire
  heavyLaserCannon:     { name: "Heavy Laser Cannon",      type: "directFire", mount: "heavy", damage: "4d8",   range: "medium", pcu: 10, bp: 15 },
  particleBeam:         { name: "Particle Beam",           type: "directFire", mount: "heavy", damage: "8d6",   range: "long",   pcu: 25, bp: 20 },
  plasmaCannon:         { name: "Plasma Cannon",           type: "directFire", mount: "heavy", damage: "5d12",  range: "medium", pcu: 20, bp: 20 },
  maser:                { name: "Maser",                   type: "directFire", mount: "heavy", damage: "6d10",  range: "long",   pcu: 35, bp: 22 },
  gravityGun:           { name: "Gravity Gun",             type: "directFire", mount: "heavy", damage: "6d6",   range: "medium", pcu: 40, bp: 30 },
  persistentParticleBeam:{ name: "Persistent Particle Beam",type: "directFire",mount: "heavy", damage: "10d6",  range: "long",   pcu: 40, bp: 25 },

  // Heavy Tracking
  heavyTorpedoLauncher: { name: "Heavy Torpedo Launcher",  type: "tracking",   mount: "heavy", damage: "5d8",   range: "long",   pcu: 10, bp: 15, speed: 14, trackingClass: "medium" },
  heavyNukeLauncher:    { name: "Heavy Nuke Launcher",     type: "tracking",   mount: "heavy", damage: "10d8",  range: "long",   pcu: 15, bp: 30, speed: 10, trackingClass: "slow" },

  // Capital
  superlaserCannon:     { name: "Super Laser Cannon",      type: "directFire", mount: "capital", damage: "2d6x10", range: "long", pcu: 50, bp: 30 },

  // Ramming
  lightRammingProw:     { name: "Light Ramming Prow",      type: "directFire", mount: "light", damage: "3d4",   range: "special",pcu: 1,  bp: 6  },
  heavyRammingProw:     { name: "Heavy Ramming Prow",      type: "directFire", mount: "heavy", damage: "5d4",   range: "special",pcu: 1,  bp: 8  }
};

// ── Base Frames ─────────────────────────────────────────────────────────────
export const BASE_FRAMES = {
  racer:         { name: "Racer",          size: "tiny",   maneuverability: "perfect", hp: 20,  hpIncrement: 5,  dt: 0,  ct: 4,  speed: 12, bp: 4   },
  interceptor:   { name: "Interceptor",    size: "tiny",   maneuverability: "perfect", hp: 30,  hpIncrement: 5,  dt: 0,  ct: 6,  speed: 12, bp: 6   },
  fighter:       { name: "Fighter",        size: "tiny",   maneuverability: "good",    hp: 35,  hpIncrement: 5,  dt: 0,  ct: 7,  speed: 10, bp: 8   },
  shuttle:       { name: "Shuttle",        size: "small",  maneuverability: "perfect", hp: 35,  hpIncrement: 5,  dt: 0,  ct: 7,  speed: 10, bp: 6   },
  lightFreighter:{ name: "Light Freighter",size: "small",  maneuverability: "good",    hp: 40,  hpIncrement: 10, dt: 0,  ct: 8,  speed: 8,  bp: 10  },
  explorer:      { name: "Explorer",       size: "medium", maneuverability: "good",    hp: 55,  hpIncrement: 10, dt: 0,  ct: 11, speed: 8,  bp: 12  },
  transport:     { name: "Transport",      size: "medium", maneuverability: "average", hp: 70,  hpIncrement: 15, dt: 0,  ct: 14, speed: 8,  bp: 15  },
  destroyer:     { name: "Destroyer",      size: "large",  maneuverability: "average", hp: 150, hpIncrement: 20, dt: 0,  ct: 30, speed: 8,  bp: 30  },
  heavyFreighter:{ name: "Heavy Freighter",size: "large",  maneuverability: "average", hp: 120, hpIncrement: 20, dt: 0,  ct: 24, speed: 6,  bp: 40  },
  cruiser:       { name: "Cruiser",        size: "huge",   maneuverability: "average", hp: 180, hpIncrement: 25, dt: 5,  ct: 36, speed: 6,  bp: 60  },
  carrier:       { name: "Carrier",        size: "gargantuan",maneuverability: "poor", hp: 240, hpIncrement: 30, dt: 10, ct: 48, speed: 6,  bp: 120 },
  battleship:    { name: "Battleship",     size: "gargantuan",maneuverability: "average",hp: 280,hpIncrement: 40, dt: 10, ct: 56, speed: 6,  bp: 150 },
  dreadnought:   { name: "Dreadnought",   size: "colossal",maneuverability: "clumsy", hp: 400, hpIncrement: 50, dt: 15, ct: 80, speed: 4,  bp: 200 }
};

// ── Random subsystem hit chance on hull damage (no targeting) ────────────────
export const RANDOM_SUBSYSTEM_HIT_CHANCE = 0.10;
