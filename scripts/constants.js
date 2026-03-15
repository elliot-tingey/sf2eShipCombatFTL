/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Constants: SF1e starship data — frames, weapons, shields, arcs, sizes
   ========================================================================== */

// ── Size Modifiers (AC & TL) ────────────────────────────────────────────────
export const SIZE_CATEGORIES = {
  tiny:         { label: "Tiny",         acTlMod: 2,  pilotMod: 2  },
  small:        { label: "Small",        acTlMod: 1,  pilotMod: 1  },
  medium:       { label: "Medium",       acTlMod: 0,  pilotMod: 0  },
  large:        { label: "Large",        acTlMod: -1, pilotMod: -1 },
  huge:         { label: "Huge",         acTlMod: -2, pilotMod: -2 },
  gargantuan:   { label: "Gargantuan",   acTlMod: -4, pilotMod: -4 },
  colossal:     { label: "Colossal",     acTlMod: -8, pilotMod: -8 },
  supercolossal:{ label: "Supercolossal",acTlMod: -8, pilotMod: -8 }
};

// ── Maneuverability ─────────────────────────────────────────────────────────
export const MANEUVERABILITY = {
  perfect:  { label: "Perfect",  pilotMod: 2,  turn: 0 },
  good:     { label: "Good",     pilotMod: 1,  turn: 1 },
  average:  { label: "Average",  pilotMod: 0,  turn: 2 },
  poor:     { label: "Poor",     pilotMod: -1, turn: 3 },
  clumsy:   { label: "Clumsy",   pilotMod: -2, turn: 4 }
};

// ── Weapon Arcs ─────────────────────────────────────────────────────────────
export const ARCS = {
  forward:   { label: "Forward",   icon: "fa-arrow-up" },
  port:      { label: "Port",      icon: "fa-arrow-left" },
  starboard: { label: "Starboard", icon: "fa-arrow-right" },
  aft:       { label: "Aft",       icon: "fa-arrow-down" },
  turret:    { label: "Turret",    icon: "fa-rotate" }
};

// ── Weapon Mount Sizes ──────────────────────────────────────────────────────
export const MOUNT_SIZES = {
  light:   { label: "Light" },
  heavy:   { label: "Heavy" },
  capital: { label: "Capital" },
  spinal:  { label: "Spinal Mount" }
};

// ── Weapon Types ────────────────────────────────────────────────────────────
export const WEAPON_TYPES = {
  directFire: { label: "Direct-Fire", checksAgainst: "ac", description: "Hits instantly. Checked against AC." },
  tracking:   { label: "Tracking",    checksAgainst: "tl", description: "Projectile travels toward target over turns. Checked against TL." },
  ecm:        { label: "ECM",         checksAgainst: "special", description: "Electronic countermeasure. Special effects." },
  melee:      { label: "Melee",       checksAgainst: "ac", description: "Close-range only. Checked against AC." }
};

// ── Tracking Weapon Speeds ──────────────────────────────────────────────────
export const TRACKING_SPEEDS = {
  slow:   { label: "Slow",   turnsToHit: 3, speed: 6 },
  medium: { label: "Medium", turnsToHit: 2, speed: 10 },
  fast:   { label: "Fast",   turnsToHit: 1, speed: 14 }
};

// ── Critical Damage Systems ─────────────────────────────────────────────────
export const CRITICAL_SYSTEMS = {
  lifeSupport:  { label: "Life Support",  icon: "fa-heart-pulse" },
  sensors:      { label: "Sensors",       icon: "fa-satellite-dish" },
  weaponsArray: { label: "Weapons Array", icon: "fa-crosshairs" },
  engines:      { label: "Engines",       icon: "fa-jet-fighter" },
  powerCore:    { label: "Power Core",    icon: "fa-bolt" }
};

// ── Critical Damage Conditions ──────────────────────────────────────────────
export const CRIT_CONDITIONS = {
  nominal:       { label: "Nominal",       severity: 0 },
  glitching:     { label: "Glitching",     severity: 1 },
  malfunctioning:{ label: "Malfunctioning",severity: 2 },
  wrecked:       { label: "Wrecked",       severity: 3 }
};

// ── Shield Quadrants ────────────────────────────────────────────────────────
export const SHIELD_QUADRANTS = ["forward", "port", "starboard", "aft"];

// ── Crew Roles ──────────────────────────────────────────────────────────────
export const ROLES = {
  pilot:    { label: "Pilot",          icon: "fa-plane",          primarySkill: "piloting" },
  gunner:   { label: "Gunner",         icon: "fa-crosshairs",     primarySkill: "gunnery" },
  security: { label: "Security",       icon: "fa-shield",         primarySkill: "computers" },
  arcnet:   { label: "ArcNet Officer", icon: "fa-wand-sparkles",  primarySkill: "mysticism" },
  engineer: { label: "Engineer",       icon: "fa-wrench",         primarySkill: "engineering" }
};

// ── Core Weapon Catalog (representative SF1e weapons) ───────────────────────
export const WEAPON_CATALOG = {
  // ── Light Direct-Fire ──
  lightLaserCannon:     { name: "Light Laser Cannon",     type: "directFire", mount: "light", arc: "forward", damage: "2d4",    range: "short",  pcu: 5,  bp: 2,  special: [] },
  coilgun:              { name: "Coilgun",                 type: "directFire", mount: "light", arc: "forward", damage: "4d4",    range: "long",   pcu: 10, bp: 10, special: [] },
  gyrolaser:            { name: "Gyrolaser",               type: "directFire", mount: "light", arc: "forward", damage: "1d8",    range: "short",  pcu: 10, bp: 3,  special: ["broadArc"] },
  lightParticleCannon:  { name: "Light Particle Cannon",   type: "directFire", mount: "light", arc: "forward", damage: "3d6",    range: "medium", pcu: 10, bp: 10, special: [] },
  lightPlasmaCannon:    { name: "Light Plasma Cannon",     type: "directFire", mount: "light", arc: "forward", damage: "2d12",   range: "short",  pcu: 10, bp: 12, special: [] },
  flakThrower:          { name: "Flak Thrower",            type: "directFire", mount: "light", arc: "forward", damage: "3d4",    range: "short",  pcu: 10, bp: 5,  special: ["point8"] },
  miningLaser:          { name: "Mining Laser",            type: "directFire", mount: "light", arc: "forward", damage: "2d6",    range: "short",  pcu: 10, bp: 5,  special: ["burrowing"] },
  chainCannon:          { name: "Chain Cannon",            type: "directFire", mount: "light", arc: "forward", damage: "6d4",    range: "short",  pcu: 15, bp: 10, special: ["ripper"] },

  // ── Light Tracking ──
  lightTorpedoLauncher: { name: "Light Torpedo Launcher",  type: "tracking",   mount: "light", arc: "forward", damage: "2d8",    range: "long",   pcu: 5,  bp: 7,  speed: 16, special: [] },
  micromissileBattery:  { name: "Micromissile Battery",    type: "tracking",   mount: "light", arc: "forward", damage: "2d6",    range: "long",   pcu: 10, bp: 5,  speed: 10, special: ["array", "limitedFire5"] },
  heMissileLauncher:    { name: "HE Missile Launcher",     type: "tracking",   mount: "light", arc: "forward", damage: "4d8",    range: "long",   pcu: 10, bp: 14, speed: 12, special: ["limitedFire5"] },
  nuclearMissileLauncher:{ name: "Tactical Nuke Launcher", type: "tracking",   mount: "light", arc: "forward", damage: "5d8",    range: "long",   pcu: 10, bp: 18, speed: 10, special: ["irradiate", "limitedFire5"] },

  // ── Heavy Direct-Fire ──
  heavyLaserCannon:     { name: "Heavy Laser Cannon",      type: "directFire", mount: "heavy", arc: "forward", damage: "4d8",    range: "medium", pcu: 10, bp: 15, special: [] },
  particleBeam:         { name: "Particle Beam",           type: "directFire", mount: "heavy", arc: "forward", damage: "8d6",    range: "long",   pcu: 25, bp: 20, special: [] },
  plasmaCannon:         { name: "Plasma Cannon",           type: "directFire", mount: "heavy", arc: "forward", damage: "5d12",   range: "medium", pcu: 20, bp: 20, special: [] },
  maser:                { name: "Maser",                   type: "directFire", mount: "heavy", arc: "forward", damage: "6d10",   range: "long",   pcu: 35, bp: 22, special: [] },
  gravityGun:           { name: "Gravity Gun",             type: "directFire", mount: "heavy", arc: "forward", damage: "6d6",    range: "medium", pcu: 40, bp: 30, special: ["tractorBeam"] },

  // ── Heavy Tracking ──
  heavyTorpedoLauncher: { name: "Heavy Torpedo Launcher",  type: "tracking",   mount: "heavy", arc: "forward", damage: "5d8",    range: "long",   pcu: 10, bp: 15, speed: 14, special: [] },
  heavyNukeLauncher:    { name: "Heavy Nuke Launcher",     type: "tracking",   mount: "heavy", arc: "forward", damage: "10d8",   range: "long",   pcu: 15, bp: 30, speed: 10, special: ["irradiate", "limitedFire5"] },

  // ── Capital ──
  superlaserCannon:     { name: "Super Laser Cannon",      type: "directFire", mount: "capital", arc: "forward", damage: "2d6x10", range: "long", pcu: 50, bp: 30, special: [] },
  massPropellerCannon:  { name: "Mass Propeller Cannon",   type: "directFire", mount: "capital", arc: "forward", damage: "2d10x10",range: "long", pcu: 60, bp: 40, special: [] },

  // ── Ramming ──
  lightRammingProw:     { name: "Light Ramming Prow",      type: "directFire", mount: "light", arc: "forward", damage: "3d4",    range: "special",pcu: 1,  bp: 6,  special: ["ramming"] },
  heavyRammingProw:     { name: "Heavy Ramming Prow",      type: "directFire", mount: "heavy", arc: "forward", damage: "5d4",    range: "special",pcu: 1,  bp: 8,  special: ["ramming"] }
};

// ── Shield Catalog ──────────────────────────────────────────────────────────
export const SHIELD_CATALOG = {
  basic10:   { name: "Basic Shields 10",   totalSP: 10,  regen: 1,  pcu: 5,  bp: 2  },
  basic20:   { name: "Basic Shields 20",   totalSP: 20,  regen: 1,  pcu: 10, bp: 3  },
  basic30:   { name: "Basic Shields 30",   totalSP: 30,  regen: 1,  pcu: 15, bp: 4  },
  basic40:   { name: "Basic Shields 40",   totalSP: 40,  regen: 1,  pcu: 15, bp: 5  },
  light50:   { name: "Light Shields 50",   totalSP: 50,  regen: 2,  pcu: 20, bp: 6  },
  light60:   { name: "Light Shields 60",   totalSP: 60,  regen: 2,  pcu: 20, bp: 8  },
  light70:   { name: "Light Shields 70",   totalSP: 70,  regen: 2,  pcu: 25, bp: 10 },
  light80:   { name: "Light Shields 80",   totalSP: 80,  regen: 2,  pcu: 30, bp: 12 },
  medium100: { name: "Medium Shields 100", totalSP: 100, regen: 4,  pcu: 30, bp: 15 },
  medium200: { name: "Medium Shields 200", totalSP: 200, regen: 8,  pcu: 50, bp: 22 },
  heavy280:  { name: "Heavy Shields 280",  totalSP: 280, regen: 16, pcu: 60, bp: 25 },
  heavy420:  { name: "Heavy Shields 420",  totalSP: 420, regen: 32, pcu: 90, bp: 30 }
};

// ── Armor Catalog ───────────────────────────────────────────────────────────
export const ARMOR_CATALOG = {
  mk1:  { name: "Mk 1 Armor",  acBonus: 1,  tlPenalty: 0, bp: 1  },
  mk2:  { name: "Mk 2 Armor",  acBonus: 2,  tlPenalty: 0, bp: 2  },
  mk3:  { name: "Mk 3 Armor",  acBonus: 3,  tlPenalty: 0, bp: 3  },
  mk4:  { name: "Mk 4 Armor",  acBonus: 4,  tlPenalty: -1,bp: 5  },
  mk5:  { name: "Mk 5 Armor",  acBonus: 5,  tlPenalty: -1,bp: 7  },
  mk6:  { name: "Mk 6 Armor",  acBonus: 6,  tlPenalty: -1,bp: 9  },
  mk8:  { name: "Mk 8 Armor",  acBonus: 8,  tlPenalty: -2,bp: 12 },
  mk10: { name: "Mk 10 Armor", acBonus: 10, tlPenalty: -2,bp: 15 },
  mk12: { name: "Mk 12 Armor", acBonus: 12, tlPenalty: -3,bp: 18 },
  mk14: { name: "Mk 14 Armor", acBonus: 14, tlPenalty: -4,bp: 21 }
};

// ── Defensive Countermeasures ───────────────────────────────────────────────
export const COUNTERMEASURES_CATALOG = {
  mk1:  { name: "Mk 1 Defenses",  tlBonus: 1,  pcu: 1,  bp: 2  },
  mk2:  { name: "Mk 2 Defenses",  tlBonus: 2,  pcu: 1,  bp: 3  },
  mk3:  { name: "Mk 3 Defenses",  tlBonus: 3,  pcu: 2,  bp: 4  },
  mk4:  { name: "Mk 4 Defenses",  tlBonus: 4,  pcu: 3,  bp: 6  },
  mk6:  { name: "Mk 6 Defenses",  tlBonus: 6,  pcu: 4,  bp: 9  },
  mk8:  { name: "Mk 8 Defenses",  tlBonus: 8,  pcu: 5,  bp: 12 },
  mk10: { name: "Mk 10 Defenses", tlBonus: 10, pcu: 7,  bp: 16 },
  mk12: { name: "Mk 12 Defenses", tlBonus: 12, pcu: 8,  bp: 20 },
  mk14: { name: "Mk 14 Defenses", tlBonus: 14, pcu: 10, bp: 25 }
};

// ── Computer Catalog ────────────────────────────────────────────────────────
export const COMPUTER_CATALOG = {
  basic:  { name: "Basic Computer",    bonus: 0,  nodes: 0, pcu: 0,  bp: 0 },
  mk1:    { name: "Mk 1 Mononode",    bonus: 1,  nodes: 1, pcu: 10, bp: 1 },
  mk2:    { name: "Mk 2 Mononode",    bonus: 2,  nodes: 1, pcu: 15, bp: 4 },
  mk3:    { name: "Mk 3 Duonode",     bonus: 3,  nodes: 2, pcu: 20, bp: 9 },
  mk4:    { name: "Mk 4 Trinode",     bonus: 4,  nodes: 3, pcu: 25, bp: 16 },
  mk5:    { name: "Mk 5 Tetranode",   bonus: 5,  nodes: 4, pcu: 30, bp: 25 },
  mk6:    { name: "Mk 6 Tetranode",   bonus: 6,  nodes: 4, pcu: 35, bp: 36 },
  mk8:    { name: "Mk 8 Hexnode",     bonus: 8,  nodes: 6, pcu: 40, bp: 50 },
  mk10:   { name: "Mk 10 Hexnode",    bonus: 10, nodes: 6, pcu: 50, bp: 70 }
};

// ── Sensor Catalog ──────────────────────────────────────────────────────────
export const SENSOR_CATALOG = {
  cut:     { name: "Cut-rate",     range: "short",  mod: -2, bp: 0 },
  budget:  { name: "Budget",       range: "medium", mod: 0,  bp: 2 },
  basic:   { name: "Basic",        range: "long",   mod: 0,  bp: 3 },
  advanced:{ name: "Advanced",     range: "long",   mod: 2,  bp: 8 },
  superior:{ name: "Superior",     range: "long",   mod: 4,  bp: 14 }
};

// ── Base Frames (core CRB ones) ─────────────────────────────────────────────
export const BASE_FRAMES = {
  racer:        { name: "Racer",         size: "tiny",   maneuverability: "perfect", hp: 20,  hpIncrement: 5,  dt: 0,  ct: 4,  mounts: { forward: ["light","light"], aft: ["light"] }, expansionBays: 0,  minCrew: 1,  maxCrew: 1,  bp: 4 },
  interceptor:  { name: "Interceptor",   size: "tiny",   maneuverability: "perfect", hp: 30,  hpIncrement: 5,  dt: 0,  ct: 6,  mounts: { forward: ["light","light"] }, expansionBays: 0,  minCrew: 1,  maxCrew: 1,  bp: 6 },
  fighter:      { name: "Fighter",       size: "tiny",   maneuverability: "good",    hp: 35,  hpIncrement: 5,  dt: 0,  ct: 7,  mounts: { forward: ["light","light"], aft: ["light"] }, expansionBays: 0,  minCrew: 1,  maxCrew: 2,  bp: 8 },
  shuttle:      { name: "Shuttle",       size: "small",  maneuverability: "perfect", hp: 35,  hpIncrement: 5,  dt: 0,  ct: 7,  mounts: { forward: ["light"] }, expansionBays: 3,  minCrew: 1,  maxCrew: 4,  bp: 6 },
  lightFreighter:{ name: "Light Freighter",size: "small", maneuverability: "good",   hp: 40,  hpIncrement: 10, dt: 0,  ct: 8,  mounts: { forward: ["light","light"], port: ["light"], starboard: ["light"] }, expansionBays: 3,  minCrew: 1,  maxCrew: 6,  bp: 10 },
  explorer:     { name: "Explorer",      size: "medium", maneuverability: "good",    hp: 55,  hpIncrement: 10, dt: 0,  ct: 11, mounts: { forward: ["light"], port: ["light"], starboard: ["light"], turret: ["light"] }, expansionBays: 4, minCrew: 1, maxCrew: 6, bp: 12 },
  transport:    { name: "Transport",     size: "medium", maneuverability: "average", hp: 70,  hpIncrement: 15, dt: 0,  ct: 14, mounts: { forward: ["heavy","light"], aft: ["light"], turret: ["light","light"] }, expansionBays: 5, minCrew: 1, maxCrew: 6, bp: 15 },
  destroyer:    { name: "Destroyer",     size: "large",  maneuverability: "average", hp: 150, hpIncrement: 20, dt: 0,  ct: 30, mounts: { forward: ["heavy","heavy"], port: ["light"], starboard: ["light"], aft: ["light"], turret: ["light"] }, expansionBays: 4, minCrew: 6, maxCrew: 20, bp: 30 },
  heavyFreighter:{ name: "Heavy Freighter",size: "large", maneuverability: "average",hp: 120, hpIncrement: 20, dt: 0,  ct: 24, mounts: { forward: ["heavy","light","light"], port: ["heavy"], starboard: ["heavy"] }, expansionBays: 8, minCrew: 6, maxCrew: 20, bp: 40 },
  cruiser:      { name: "Cruiser",       size: "huge",   maneuverability: "average", hp: 180, hpIncrement: 25, dt: 5,  ct: 36, mounts: { forward: ["capital"], port: ["light"], starboard: ["light"], turret: ["heavy"] }, expansionBays: 6, minCrew: 20, maxCrew: 100, bp: 60 },
  carrier:      { name: "Carrier",       size: "gargantuan",maneuverability: "poor", hp: 240, hpIncrement: 30, dt: 10, ct: 48, mounts: { forward: ["capital"], port: ["heavy","heavy","heavy"], starboard: ["heavy","heavy","heavy"], turret: ["light","light"] }, expansionBays: 10, minCrew: 75, maxCrew: 200, bp: 120 },
  battleship:   { name: "Battleship",    size: "gargantuan",maneuverability: "average",hp: 280, hpIncrement: 40, dt: 10, ct: 56, mounts: { forward: ["capital","heavy","heavy"], port: ["heavy","heavy","light"], starboard: ["heavy","heavy","light"], aft: ["light"], turret: ["heavy","heavy"] }, expansionBays: 8, minCrew: 100, maxCrew: 300, bp: 150 },
  dreadnought:  { name: "Dreadnought",  size: "colossal",maneuverability: "clumsy", hp: 400, hpIncrement: 50, dt: 15, ct: 80, mounts: { forward: ["capital","capital","heavy","heavy"], port: ["capital","heavy","heavy","heavy"], starboard: ["capital","heavy","heavy","heavy"], turret: ["light","light","light","light"] }, expansionBays: 20, minCrew: 125, maxCrew: 500, bp: 200 }
};

// ── Range Increments ────────────────────────────────────────────────────────
export const RANGES = {
  short:  { label: "Short",  hexes: 5 },
  medium: { label: "Medium", hexes: 10 },
  long:   { label: "Long",   hexes: 20 }
};

// ── Subsystem Hit Chance (when NOT targeting specifically) ───────────────────
// Per SF1e: critical damage triggers at CT multiples
// We add a random subsystem hit chance on normal attacks
export const RANDOM_SUBSYSTEM_HIT_CHANCE = 0.10; // 10% chance per hit to also damage a random subsystem
