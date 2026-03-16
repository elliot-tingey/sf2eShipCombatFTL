/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3.1
   Constants
   ========================================================================== */

export const MODULE_ID = "starship-combat-ftl";
export const FLAG_KEY = "shipData";
export const IS_SHIP_FLAG = "isStarship";

export const SIZE_CATEGORIES = {
  tiny:       { label: "Tiny",       acTlMod: 2  },
  small:      { label: "Small",      acTlMod: 1  },
  medium:     { label: "Medium",     acTlMod: 0  },
  large:      { label: "Large",      acTlMod: -1 },
  huge:       { label: "Huge",       acTlMod: -2 },
  gargantuan: { label: "Gargantuan", acTlMod: -4 },
  colossal:   { label: "Colossal",   acTlMod: -8 }
};

export const MANEUVERABILITY = {
  perfect: { label: "Perfect", pilotMod: 2,  turn: 0 },
  good:    { label: "Good",    pilotMod: 1,  turn: 1 },
  average: { label: "Average", pilotMod: 0,  turn: 2 },
  poor:    { label: "Poor",    pilotMod: -1, turn: 3 },
  clumsy:  { label: "Clumsy",  pilotMod: -2, turn: 4 }
};

export const SUBSYSTEM_TYPES = {
  lifeSupport:  { label: "Life Support",  icon: "fa-heart-pulse" },
  sensors:      { label: "Sensors",       icon: "fa-satellite-dish" },
  weaponsArray: { label: "Weapons Array", icon: "fa-crosshairs" },
  engines:      { label: "Engines",       icon: "fa-jet-fighter" },
  powerCore:    { label: "Power Core",    icon: "fa-bolt" },
  misc:         { label: "Misc",          icon: "fa-gear" }
};

export const DAMAGE_CONDITIONS = {
  nominal:        { label: "Nominal",        severity: 0 },
  glitching:      { label: "Glitching",      severity: 1 },
  malfunctioning: { label: "Malfunctioning", severity: 2 },
  wrecked:        { label: "Wrecked",        severity: 3 }
};

export const ROLES = {
  pilot:    { label: "Pilot",          icon: "fa-plane",         primarySkill: "piloting" },
  gunner:   { label: "Gunner",         icon: "fa-crosshairs",    primarySkill: "gunnery" },
  security: { label: "Security",       icon: "fa-shield",        primarySkill: "computers" },
  arcnet:   { label: "ArcNet Officer", icon: "fa-wand-sparkles", primarySkill: "mysticism" },
  engineer: { label: "Engineer",       icon: "fa-wrench",        primarySkill: "engineering" }
};

export const ARCS = {
  forward:   { label: "Forward" },
  port:      { label: "Port" },
  starboard: { label: "Starboard" },
  aft:       { label: "Aft" },
  turret:    { label: "Turret" }
};

// ── Ammo Categories ─────────────────────────────────────────────────────────
export const AMMO_CATEGORIES = {
  none:        { label: "— No Ammo —",       description: "Powered weapon, unlimited shots." },
  laserCharge: { label: "Laser Charge Cell",  description: "Standard energy cell for laser weapons." },
  ballistic:   { label: "Ballistic Rounds",   description: "Kinetic projectiles for coilguns and cannons." },
  missile:     { label: "Missile Payload",    description: "Guided explosive warheads." },
  torpedo:     { label: "Torpedo Casing",     description: "Heavy guided munitions for torpedo launchers." },
  nuclear:     { label: "Nuclear Warhead",    description: "Tactical nuclear ordnance. Restricted." },
  plasma:      { label: "Plasma Canister",    description: "Superheated plasma containment cells." }
};

// ── Weapon Bulk by Mount ────────────────────────────────────────────────────
export const MOUNT_BULK = {
  light:   { bulk: 2  },
  heavy:   { bulk: 5  },
  capital: { bulk: 12 }
};

// ── Weapon Catalog ──────────────────────────────────────────────────────────
export const WEAPON_CATALOG = {
  // Light Direct-Fire
  lightLaserCannon:     { name: "Light Laser Cannon",     type: "directFire", mount: "light", damage: "2d4",  range: "short",  pcu: 5,  bp: 2,  ammo: "laserCharge" },
  coilgun:              { name: "Coilgun",                 type: "directFire", mount: "light", damage: "4d4",  range: "long",   pcu: 10, bp: 10, ammo: "ballistic" },
  gyrolaser:            { name: "Gyrolaser",               type: "directFire", mount: "light", damage: "1d8",  range: "short",  pcu: 10, bp: 3,  ammo: "laserCharge" },
  lightParticleCannon:  { name: "Light Particle Cannon",   type: "directFire", mount: "light", damage: "3d6",  range: "medium", pcu: 10, bp: 10, ammo: "none" },
  lightPlasmaCannon:    { name: "Light Plasma Cannon",     type: "directFire", mount: "light", damage: "2d12", range: "short",  pcu: 10, bp: 12, ammo: "plasma" },
  flakThrower:          { name: "Flak Thrower",            type: "directFire", mount: "light", damage: "3d4",  range: "short",  pcu: 10, bp: 5,  ammo: "ballistic" },
  chainCannon:          { name: "Chain Cannon",            type: "directFire", mount: "light", damage: "6d4",  range: "short",  pcu: 15, bp: 10, ammo: "ballistic" },
  laserNet:             { name: "Laser Net",               type: "directFire", mount: "light", damage: "2d6",  range: "short",  pcu: 10, bp: 9,  ammo: "laserCharge" },
  miningLaser:          { name: "Mining Laser",            type: "directFire", mount: "light", damage: "2d6",  range: "short",  pcu: 10, bp: 5,  ammo: "none" },

  // Light Tracking
  lightTorpedoLauncher: { name: "Light Torpedo Launcher",  type: "tracking", mount: "light", damage: "2d8",  range: "long", pcu: 5,  bp: 7,  speed: 16, trackingClass: "fast",   ammo: "torpedo" },
  micromissileBattery:  { name: "Micromissile Battery",    type: "tracking", mount: "light", damage: "2d6",  range: "long", pcu: 10, bp: 5,  speed: 10, trackingClass: "medium", ammo: "missile" },
  heMissileLauncher:    { name: "HE Missile Launcher",     type: "tracking", mount: "light", damage: "4d8",  range: "long", pcu: 10, bp: 14, speed: 12, trackingClass: "medium", ammo: "missile" },
  nuclearMissileLauncher:{ name: "Tactical Nuke Launcher", type: "tracking", mount: "light", damage: "5d8",  range: "long", pcu: 10, bp: 18, speed: 10, trackingClass: "slow",   ammo: "nuclear" },
  slowBurnMissile:      { name: "Slow Burn Missile",       type: "tracking", mount: "light", damage: "4d6",  range: "long", pcu: 10, bp: 4,  speed: 8,  trackingClass: "slow",   ammo: "missile" },

  // Heavy Direct-Fire
  heavyLaserCannon:     { name: "Heavy Laser Cannon",      type: "directFire", mount: "heavy", damage: "4d8",  range: "medium", pcu: 10, bp: 15, ammo: "laserCharge" },
  particleBeam:         { name: "Particle Beam",           type: "directFire", mount: "heavy", damage: "8d6",  range: "long",   pcu: 25, bp: 20, ammo: "none" },
  plasmaCannon:         { name: "Plasma Cannon",           type: "directFire", mount: "heavy", damage: "5d12", range: "medium", pcu: 20, bp: 20, ammo: "plasma" },
  maser:                { name: "Maser",                   type: "directFire", mount: "heavy", damage: "6d10", range: "long",   pcu: 35, bp: 22, ammo: "none" },
  gravityGun:           { name: "Gravity Gun",             type: "directFire", mount: "heavy", damage: "6d6",  range: "medium", pcu: 40, bp: 30, ammo: "none" },
  persistentParticleBeam:{ name: "Persistent Particle Beam",type: "directFire",mount: "heavy", damage: "10d6", range: "long",   pcu: 40, bp: 25, ammo: "none" },

  // Heavy Tracking
  heavyTorpedoLauncher: { name: "Heavy Torpedo Launcher",  type: "tracking", mount: "heavy", damage: "5d8",  range: "long", pcu: 10, bp: 15, speed: 14, trackingClass: "medium", ammo: "torpedo" },
  heavyNukeLauncher:    { name: "Heavy Nuke Launcher",     type: "tracking", mount: "heavy", damage: "10d8", range: "long", pcu: 15, bp: 30, speed: 10, trackingClass: "slow",   ammo: "nuclear" },

  // Capital
  superlaserCannon:     { name: "Super Laser Cannon",      type: "directFire", mount: "capital", damage: "2d6x10", range: "long", pcu: 50, bp: 30, ammo: "none" },

  // Ramming
  lightRammingProw:     { name: "Light Ramming Prow",      type: "directFire", mount: "light", damage: "3d4",  range: "special", pcu: 1, bp: 6, ammo: "none" },
  heavyRammingProw:     { name: "Heavy Ramming Prow",      type: "directFire", mount: "heavy", damage: "5d4",  range: "special", pcu: 1, bp: 8, ammo: "none" }
};

// ── Base Frames (with cargo capacity) ───────────────────────────────────────
export const BASE_FRAMES = {
  racer:         { name: "Racer",          size: "tiny",       maneuverability: "perfect", hp: 20,  hpIncrement: 5,  dt: 0,  ct: 4,  speed: 12, bp: 4,   cargo: 0   },
  interceptor:   { name: "Interceptor",    size: "tiny",       maneuverability: "perfect", hp: 30,  hpIncrement: 5,  dt: 0,  ct: 6,  speed: 12, bp: 6,   cargo: 2   },
  fighter:       { name: "Fighter",        size: "tiny",       maneuverability: "good",    hp: 35,  hpIncrement: 5,  dt: 0,  ct: 7,  speed: 10, bp: 8,   cargo: 3   },
  shuttle:       { name: "Shuttle",        size: "small",      maneuverability: "perfect", hp: 35,  hpIncrement: 5,  dt: 0,  ct: 7,  speed: 10, bp: 6,   cargo: 10  },
  lightFreighter:{ name: "Light Freighter",size: "small",      maneuverability: "good",    hp: 40,  hpIncrement: 10, dt: 0,  ct: 8,  speed: 8,  bp: 10,  cargo: 25  },
  explorer:      { name: "Explorer",       size: "medium",     maneuverability: "good",    hp: 55,  hpIncrement: 10, dt: 0,  ct: 11, speed: 8,  bp: 12,  cargo: 20  },
  transport:     { name: "Transport",      size: "medium",     maneuverability: "average", hp: 70,  hpIncrement: 15, dt: 0,  ct: 14, speed: 8,  bp: 15,  cargo: 40  },
  destroyer:     { name: "Destroyer",      size: "large",      maneuverability: "average", hp: 150, hpIncrement: 20, dt: 0,  ct: 30, speed: 8,  bp: 30,  cargo: 30  },
  heavyFreighter:{ name: "Heavy Freighter",size: "large",      maneuverability: "average", hp: 120, hpIncrement: 20, dt: 0,  ct: 24, speed: 6,  bp: 40,  cargo: 80  },
  cruiser:       { name: "Cruiser",        size: "huge",       maneuverability: "average", hp: 180, hpIncrement: 25, dt: 5,  ct: 36, speed: 6,  bp: 60,  cargo: 50  },
  carrier:       { name: "Carrier",        size: "gargantuan", maneuverability: "poor",    hp: 240, hpIncrement: 30, dt: 10, ct: 48, speed: 6,  bp: 120, cargo: 100 },
  battleship:    { name: "Battleship",     size: "gargantuan", maneuverability: "average", hp: 280, hpIncrement: 40, dt: 10, ct: 56, speed: 6,  bp: 150, cargo: 60  },
  dreadnought:   { name: "Dreadnought",   size: "colossal",   maneuverability: "clumsy",  hp: 400, hpIncrement: 50, dt: 15, ct: 80, speed: 4,  bp: 200, cargo: 120 }
};

export const RANDOM_SUBSYSTEM_HIT_CHANCE = 0.10;
