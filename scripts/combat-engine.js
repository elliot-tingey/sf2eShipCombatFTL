/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION
   Combat Engine: Ship data, damage model, power management, system mechanics
   ========================================================================== */

// ── System Definitions ──────────────────────────────────────────────────────
export const SYSTEMS = {
  shields:     { label: "Shields",      icon: "fa-shield-halved", color: "#22d3ee", maxPower: 3, maxHp: 4 },
  weapons:     { label: "Weapons",      icon: "fa-crosshairs",    color: "#f43f5e", maxPower: 3, maxHp: 4 },
  engines:     { label: "Engines",      icon: "fa-jet-fighter",   color: "#a78bfa", maxPower: 3, maxHp: 4 },
  sensors:     { label: "Sensors",      icon: "fa-satellite-dish",color: "#fbbf24", maxPower: 2, maxHp: 3 },
  lifeSupport: { label: "Life Support", icon: "fa-heart-pulse",   color: "#4ade80", maxPower: 2, maxHp: 3 },
  arcnet:      { label: "ArcNet Core",  icon: "fa-wand-sparkles", color: "#c084fc", maxPower: 2, maxHp: 3 }
};

export const SYSTEM_IDS = Object.keys(SYSTEMS);

// ── Weapon Types ────────────────────────────────────────────────────────────
export const WEAPON_TYPES = {
  laser:   { label: "Laser",   vsShields: 1.5, vsHull: 0.75, rangeBonus: { close: -2, medium: 0, long: 2 } },
  missile: { label: "Missile", vsShields: 0,   vsHull: 1.25, rangeBonus: { close: 2, medium: 0, long: -2 }, bypassShields: true },
  kinetic: { label: "Kinetic", vsShields: 1.0, vsHull: 1.5,  rangeBonus: { close: 0, medium: 0, long: -2 } }
};

// ── Engagement Ranges ───────────────────────────────────────────────────────
export const RANGES = ["close", "medium", "long"];
export const RANGE_LABELS = { close: "Close", medium: "Medium", long: "Long" };

// ── Phase Definitions ───────────────────────────────────────────────────────
export const PHASES = [
  { id: "engineering", label: "Engineering Phase", role: "engineer" },
  { id: "helm",        label: "Helm Phase",        role: "pilot" },
  { id: "operations",  label: "Operations Phase",  role: null }, // security + arcnet
  { id: "gunnery",     label: "Gunnery Phase",     role: "gunner" },
  { id: "cleanup",     label: "End of Round",      role: null }
];

// ── Role Definitions ────────────────────────────────────────────────────────
export const ROLES = {
  pilot:    { label: "Pilot",          icon: "fa-plane",          skill: "piloting",    phase: "helm" },
  gunner:   { label: "Gunner",         icon: "fa-crosshairs",     skill: "gunnery",     phase: "gunnery" },
  security: { label: "Security",       icon: "fa-shield",         skill: "computers",   phase: "operations" },
  arcnet:   { label: "ArcNet Officer", icon: "fa-wand-sparkles",  skill: "arcana",      phase: "operations" },
  engineer: { label: "Engineer",       icon: "fa-wrench",         skill: "engineering", phase: "engineering" }
};

// ── Ship Factory ────────────────────────────────────────────────────────────

/**
 * Create a new ship data object from a template.
 */
export function createShip(template) {
  const ship = foundry.utils.deepClone(template);
  // Ensure all systems have required fields
  for (const sysId of SYSTEM_IDS) {
    const def = SYSTEMS[sysId];
    if (!ship.systems[sysId]) {
      ship.systems[sysId] = { hp: def.maxHp, maxHp: def.maxHp, power: 0, maxPower: def.maxPower, status: [] };
    }
    const sys = ship.systems[sysId];
    sys.maxPower = sys.maxPower ?? def.maxPower;
    sys.maxHp = sys.maxHp ?? def.maxHp;
    sys.hp = Math.min(sys.hp ?? sys.maxHp, sys.maxHp);
    sys.power = Math.min(sys.power ?? 0, sys.maxPower);
    sys.status = sys.status ?? [];
  }
  ship.crew = ship.crew ?? {};
  for (const role of Object.keys(ROLES)) {
    ship.crew[role] = ship.crew[role] ?? { actorId: null, hasActed: false };
  }
  ship.modifiers = ship.modifiers ?? {};
  ship.weapons = ship.weapons ?? [];
  return ship;
}

// ── Ship Templates ──────────────────────────────────────────────────────────

export const SHIP_TEMPLATES = {
  // ─── Player Ships ───
  corvette: {
    name: "Light Corvette",
    hull: { current: 24, max: 24 },
    shields: { current: 8, max: 8 },
    armor: 1,
    baseEvasion: 14,
    reactor: { total: 8 },
    systems: {
      shields:     { hp: 3, maxHp: 3, power: 2, maxPower: 3, status: [] },
      weapons:     { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] },
      engines:     { hp: 4, maxHp: 4, power: 3, maxPower: 3, status: [] },
      sensors:     { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] },
      lifeSupport: { hp: 2, maxHp: 2, power: 1, maxPower: 1, status: [] },
      arcnet:      { hp: 2, maxHp: 2, power: 0, maxPower: 2, status: [] }
    },
    weapons: [
      { name: "Light Laser", damage: "1d6+2", type: "laser", powerCost: 1, ammo: -1 },
      { name: "Micro Missiles", damage: "2d6", type: "missile", powerCost: 1, ammo: 6 }
    ]
  },

  frigate: {
    name: "Standard Frigate",
    hull: { current: 32, max: 32 },
    shields: { current: 12, max: 12 },
    armor: 2,
    baseEvasion: 11,
    reactor: { total: 10 },
    systems: {
      shields:     { hp: 4, maxHp: 4, power: 2, maxPower: 3, status: [] },
      weapons:     { hp: 4, maxHp: 4, power: 2, maxPower: 3, status: [] },
      engines:     { hp: 4, maxHp: 4, power: 2, maxPower: 3, status: [] },
      sensors:     { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] },
      lifeSupport: { hp: 3, maxHp: 3, power: 2, maxPower: 2, status: [] },
      arcnet:      { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] }
    },
    weapons: [
      { name: "Laser Cannon", damage: "2d6", type: "laser", powerCost: 1, ammo: -1 },
      { name: "Railgun",      damage: "2d6+3", type: "kinetic", powerCost: 2, ammo: -1 },
      { name: "Missile Pod",  damage: "3d6", type: "missile", powerCost: 1, ammo: 4 }
    ]
  },

  cruiser: {
    name: "Heavy Cruiser",
    hull: { current: 45, max: 45 },
    shields: { current: 18, max: 18 },
    armor: 4,
    baseEvasion: 8,
    reactor: { total: 12 },
    systems: {
      shields:     { hp: 5, maxHp: 5, power: 3, maxPower: 3, status: [] },
      weapons:     { hp: 5, maxHp: 5, power: 3, maxPower: 3, status: [] },
      engines:     { hp: 4, maxHp: 4, power: 1, maxPower: 3, status: [] },
      sensors:     { hp: 3, maxHp: 3, power: 2, maxPower: 2, status: [] },
      lifeSupport: { hp: 3, maxHp: 3, power: 2, maxPower: 2, status: [] },
      arcnet:      { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] }
    },
    weapons: [
      { name: "Heavy Laser",     damage: "3d6",   type: "laser",   powerCost: 2, ammo: -1 },
      { name: "Autocannon",      damage: "2d6+2", type: "kinetic", powerCost: 1, ammo: -1 },
      { name: "Torpedo Bay",     damage: "4d6",   type: "missile", powerCost: 2, ammo: 3 }
    ]
  },

  // ─── Enemy Ships ───
  pirateRaider: {
    name: "Pirate Raider",
    hull: { current: 20, max: 20 },
    shields: { current: 6, max: 6 },
    armor: 1,
    baseEvasion: 13,
    reactor: { total: 7 },
    systems: {
      shields:     { hp: 2, maxHp: 2, power: 1, maxPower: 2, status: [] },
      weapons:     { hp: 3, maxHp: 3, power: 2, maxPower: 3, status: [] },
      engines:     { hp: 3, maxHp: 3, power: 2, maxPower: 3, status: [] },
      sensors:     { hp: 2, maxHp: 2, power: 1, maxPower: 2, status: [] },
      lifeSupport: { hp: 2, maxHp: 2, power: 1, maxPower: 1, status: [] },
      arcnet:      { hp: 1, maxHp: 1, power: 0, maxPower: 1, status: [] }
    },
    weapons: [
      { name: "Jury-rigged Laser", damage: "1d6+1", type: "laser",   powerCost: 1, ammo: -1 },
      { name: "Boarding Cannons",  damage: "1d6",   type: "kinetic", powerCost: 1, ammo: -1 }
    ]
  },

  militaryPatrol: {
    name: "Military Patrol Vessel",
    hull: { current: 30, max: 30 },
    shields: { current: 12, max: 12 },
    armor: 3,
    baseEvasion: 10,
    reactor: { total: 9 },
    systems: {
      shields:     { hp: 4, maxHp: 4, power: 2, maxPower: 3, status: [] },
      weapons:     { hp: 4, maxHp: 4, power: 2, maxPower: 3, status: [] },
      engines:     { hp: 3, maxHp: 3, power: 2, maxPower: 3, status: [] },
      sensors:     { hp: 3, maxHp: 3, power: 2, maxPower: 2, status: [] },
      lifeSupport: { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] },
      arcnet:      { hp: 2, maxHp: 2, power: 0, maxPower: 1, status: [] }
    },
    weapons: [
      { name: "Pulse Laser",     damage: "2d6",   type: "laser",   powerCost: 1, ammo: -1 },
      { name: "Kinetic Lance",   damage: "2d6+4", type: "kinetic", powerCost: 2, ammo: -1 },
      { name: "Hunter Missiles", damage: "3d6",   type: "missile", powerCost: 1, ammo: 5 }
    ]
  },

  pirateDreadnought: {
    name: "Pirate Dreadnought",
    hull: { current: 50, max: 50 },
    shields: { current: 16, max: 16 },
    armor: 3,
    baseEvasion: 7,
    reactor: { total: 12 },
    systems: {
      shields:     { hp: 5, maxHp: 5, power: 3, maxPower: 3, status: [] },
      weapons:     { hp: 5, maxHp: 5, power: 3, maxPower: 3, status: [] },
      engines:     { hp: 4, maxHp: 4, power: 1, maxPower: 2, status: [] },
      sensors:     { hp: 3, maxHp: 3, power: 2, maxPower: 2, status: [] },
      lifeSupport: { hp: 3, maxHp: 3, power: 2, maxPower: 2, status: [] },
      arcnet:      { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] }
    },
    weapons: [
      { name: "Siege Laser",    damage: "3d6+2", type: "laser",   powerCost: 2, ammo: -1 },
      { name: "Broadside Array", damage: "2d6+2", type: "kinetic", powerCost: 1, ammo: -1 },
      { name: "Devastator Torpedoes", damage: "5d6", type: "missile", powerCost: 2, ammo: 2 }
    ]
  },

  alienVessel: {
    name: "Unknown Alien Vessel",
    hull: { current: 35, max: 35 },
    shields: { current: 20, max: 20 },
    armor: 1,
    baseEvasion: 12,
    reactor: { total: 11 },
    systems: {
      shields:     { hp: 5, maxHp: 5, power: 3, maxPower: 3, status: [] },
      weapons:     { hp: 3, maxHp: 3, power: 2, maxPower: 3, status: [] },
      engines:     { hp: 3, maxHp: 3, power: 2, maxPower: 3, status: [] },
      sensors:     { hp: 3, maxHp: 3, power: 1, maxPower: 2, status: [] },
      lifeSupport: { hp: 2, maxHp: 2, power: 1, maxPower: 1, status: [] },
      arcnet:      { hp: 4, maxHp: 4, power: 2, maxPower: 3, status: [] }
    },
    weapons: [
      { name: "Xeno Beam",      damage: "2d6+3", type: "laser",  powerCost: 1, ammo: -1 },
      { name: "Spore Launcher",  damage: "2d6",   type: "missile", powerCost: 1, ammo: 6 }
    ]
  }
};


// ── System Mechanics ────────────────────────────────────────────────────────

/**
 * Get the effective power of a system, clamped by damage degradation.
 * Systems lose max power as they take damage.
 */
export function getEffectivePower(system) {
  if (system.hp <= 0) return 0;
  const hpRatio = system.hp / system.maxHp;
  let effectiveMax = system.maxPower;
  if (hpRatio <= 0.25) effectiveMax = Math.max(0, system.maxPower - 2);
  else if (hpRatio <= 0.5) effectiveMax = Math.max(0, system.maxPower - 1);
  return Math.min(system.power, effectiveMax);
}

/**
 * Get a skill check penalty based on system damage.
 */
export function getSystemPenalty(system) {
  if (system.hp <= 0) return -99; // disabled
  const hpRatio = system.hp / system.maxHp;
  if (hpRatio <= 0.25) return -4;
  if (hpRatio <= 0.5) return -2;
  if (hpRatio <= 0.75) return -1;
  return 0;
}

/**
 * Get the status label for a system.
 */
export function getSystemStatusLabel(system) {
  if (system.hp <= 0) return "DISABLED";
  const hpRatio = system.hp / system.maxHp;
  if (hpRatio <= 0.25) return "CRITICAL";
  if (hpRatio <= 0.5) return "DAMAGED";
  if (hpRatio <= 0.75) return "STRESSED";
  return "ONLINE";
}

/**
 * Calculate total power used by a ship.
 */
export function getUsedPower(ship) {
  let used = 0;
  for (const sysId of SYSTEM_IDS) {
    used += ship.systems[sysId].power;
  }
  return used;
}

/**
 * Get available (free) reactor power.
 */
export function getFreePower(ship) {
  return ship.reactor.total - getUsedPower(ship);
}

/**
 * Attempt to set a system's power level. Returns true if successful.
 */
export function setPower(ship, systemId, newPower) {
  const sys = ship.systems[systemId];
  if (!sys) return false;
  if (sys.hp <= 0) return false; // can't power a destroyed system

  const effectiveMax = getEffectiveMaxPower(sys);
  newPower = Math.max(0, Math.min(newPower, effectiveMax));

  const delta = newPower - sys.power;
  if (delta > 0 && delta > getFreePower(ship)) return false; // not enough reactor power

  sys.power = newPower;
  return true;
}

/**
 * Get max power achievable for a system given its damage state.
 */
export function getEffectiveMaxPower(system) {
  if (system.hp <= 0) return 0;
  const hpRatio = system.hp / system.maxHp;
  if (hpRatio <= 0.25) return Math.max(0, system.maxPower - 2);
  if (hpRatio <= 0.5) return Math.max(0, system.maxPower - 1);
  return system.maxPower;
}


// ── Evasion Calculation ─────────────────────────────────────────────────────

/**
 * Get total evasion for a ship (base + engine bonus + modifiers).
 */
export function getShipEvasion(ship) {
  let evasion = ship.baseEvasion;
  const enginePower = getEffectivePower(ship.systems.engines);
  evasion += enginePower; // +1 per engine power
  evasion += (ship.modifiers.evasionBonus ?? 0);
  return evasion;
}

/**
 * Get the target's effective AC for gunnery attacks.
 * AC = 10 + evasion bonus (evasion - 10, minimum 0)
 */
export function getShipAC(ship) {
  return getShipEvasion(ship);
}


// ── Shield Mechanics ────────────────────────────────────────────────────────

/**
 * Get shield effectiveness — how much damage shields absorb.
 * Each power level = 1 "layer" absorbing shieldLayerHp damage.
 */
export function getShieldAbsorption(ship) {
  const power = getEffectivePower(ship.systems.shields);
  if (power <= 0 || ship.shields.current <= 0) return 0;
  return ship.shields.current; // shields absorb up to their current value
}

/**
 * Regenerate shields at start of round.
 * Shields regen = shield power level × 2 per round, up to max.
 */
export function regenerateShields(ship) {
  const power = getEffectivePower(ship.systems.shields);
  if (power <= 0) return 0;
  const regen = power * 2;
  const prev = ship.shields.current;
  ship.shields.current = Math.min(ship.shields.max, ship.shields.current + regen);
  return ship.shields.current - prev;
}


// ── Damage Resolution ───────────────────────────────────────────────────────

/**
 * Apply damage to a ship targeting a specific system.
 *
 * Flow:
 * 1. Shields absorb damage (unless missile)
 * 2. Armor reduces remaining damage
 * 3. Remaining damage split: 60% to targeted system, 40% to hull
 * 4. Apply fire/breach chance on critical damage
 *
 * Returns a damage report object.
 */
export function applyDamage(ship, rawDamage, targetSystemId, weaponType = "kinetic", isCrit = false) {
  const report = {
    rawDamage,
    shieldAbsorbed: 0,
    armorReduced: 0,
    systemDamage: 0,
    hullDamage: 0,
    systemDestroyed: false,
    shipDestroyed: false,
    fire: false,
    breach: false,
    targetSystem: targetSystemId
  };

  let damage = rawDamage;
  const wType = WEAPON_TYPES[weaponType] ?? WEAPON_TYPES.kinetic;

  // Step 1: Shields
  if (!wType.bypassShields && ship.shields.current > 0) {
    const shieldDmg = Math.round(damage * (wType.vsShields ?? 1));
    const absorbed = Math.min(ship.shields.current, shieldDmg);
    ship.shields.current -= absorbed;
    report.shieldAbsorbed = absorbed;
    // Reduce incoming damage proportionally
    damage = Math.max(0, damage - absorbed);
  }

  // Step 2: Armor
  if (damage > 0) {
    const armorReduction = Math.min(damage, ship.armor);
    damage -= armorReduction;
    report.armorReduced = armorReduction;
  }

  // Step 3: Apply hull modifier
  damage = Math.round(damage * (wType.vsHull ?? 1));

  if (damage > 0) {
    // 60% to system, 40% to hull (or vice versa if system is already destroyed)
    const sys = ship.systems[targetSystemId];
    let sysDmg, hullDmg;

    if (sys && sys.hp > 0) {
      sysDmg = Math.ceil(damage * 0.6);
      hullDmg = Math.floor(damage * 0.4);
    } else {
      sysDmg = 0;
      hullDmg = damage;
    }

    // Apply system damage
    if (sys && sysDmg > 0) {
      const prevHp = sys.hp;
      sys.hp = Math.max(0, sys.hp - sysDmg);
      report.systemDamage = prevHp - sys.hp;
      if (sys.hp <= 0) {
        report.systemDestroyed = true;
        sys.power = 0;
      }
      // Clamp power if effective max dropped
      const effMax = getEffectiveMaxPower(sys);
      if (sys.power > effMax) sys.power = effMax;
    }

    // Apply hull damage
    if (hullDmg > 0) {
      ship.hull.current = Math.max(0, ship.hull.current - hullDmg);
      report.hullDamage = hullDmg;
      if (ship.hull.current <= 0) report.shipDestroyed = true;
    }

    // Fire/breach chance on heavy hits
    if (isCrit && sys && sys.hp > 0) {
      if (Math.random() < 0.3) {
        report.fire = true;
        if (!sys.status.includes("fire")) sys.status.push("fire");
      }
      if (Math.random() < 0.2) {
        report.breach = true;
        if (!sys.status.includes("breach")) sys.status.push("breach");
      }
    }
  }

  return report;
}


// ── Status Effect Processing ────────────────────────────────────────────────

/**
 * Process ongoing status effects (fire, breach) at end of round.
 * Fire: 1 damage to system per round.
 * Breach: -1 to max power of affected system.
 */
export function processStatusEffects(ship) {
  const reports = [];

  for (const sysId of SYSTEM_IDS) {
    const sys = ship.systems[sysId];

    if (sys.status.includes("fire") && sys.hp > 0) {
      sys.hp = Math.max(0, sys.hp - 1);
      reports.push({ system: sysId, effect: "fire", damage: 1 });
      if (sys.hp <= 0) {
        sys.power = 0;
        reports.push({ system: sysId, effect: "systemDisabled" });
      }
      // 25% chance fire goes out on its own
      if (Math.random() < 0.25) {
        sys.status = sys.status.filter(s => s !== "fire");
        reports.push({ system: sysId, effect: "fireOut" });
      }
    }
  }

  // Life support check
  const lsPower = getEffectivePower(ship.systems.lifeSupport);
  if (lsPower <= 0) {
    ship.hull.current = Math.max(0, ship.hull.current - 2);
    reports.push({ effect: "noLifeSupport", damage: 2 });
  }

  return reports;
}


// ── Sensor Mechanics ────────────────────────────────────────────────────────

/**
 * Get sensor accuracy bonus for gunnery.
 */
export function getSensorBonus(ship) {
  const power = getEffectivePower(ship.systems.sensors);
  const penalty = getSystemPenalty(ship.systems.sensors);
  return (power * 2) + penalty; // power 1 = +2, power 2 = +4, etc.
}


// ── Combat State Management ─────────────────────────────────────────────────

/**
 * Create a new combat state.
 */
export function createCombatState(playerShipTemplate, enemyShipTemplate) {
  return {
    active: true,
    round: 1,
    phaseIndex: 0,
    playerShip: createShip(playerShipTemplate),
    enemyShip: createShip(enemyShipTemplate),
    range: "medium",
    log: [],
    enemyScanned: false,
    roundModifiers: {
      player: {},
      enemy: {}
    }
  };
}

/**
 * Advance to the next phase. Returns the new phase.
 * If we were on the last phase, starts a new round.
 */
export function advancePhase(state) {
  state.phaseIndex++;

  if (state.phaseIndex >= PHASES.length) {
    // New round
    endOfRound(state);
    state.round++;
    state.phaseIndex = 0;

    // Reset crew acted flags
    for (const role of Object.keys(ROLES)) {
      state.playerShip.crew[role].hasActed = false;
      state.enemyShip.crew[role].hasActed = false;
    }

    // Clear round modifiers
    state.playerShip.modifiers = {};
    state.enemyShip.modifiers = {};
    state.roundModifiers = { player: {}, enemy: {} };

    // Shield regen
    const playerRegen = regenerateShields(state.playerShip);
    const enemyRegen = regenerateShields(state.enemyShip);
    if (playerRegen > 0) state.log.push(`Your shields regenerate ${playerRegen} SP.`);
    if (enemyRegen > 0) state.log.push(`Enemy shields regenerate ${enemyRegen} SP.`);
  }

  return PHASES[state.phaseIndex];
}

/**
 * Process end-of-round effects.
 */
function endOfRound(state) {
  const playerEffects = processStatusEffects(state.playerShip);
  const enemyEffects = processStatusEffects(state.enemyShip);

  for (const r of playerEffects) {
    if (r.effect === "fire") state.log.push(`🔥 Fire in ${SYSTEMS[r.system]?.label} deals ${r.damage} damage!`);
    if (r.effect === "fireOut") state.log.push(`${SYSTEMS[r.system]?.label} fire extinguished.`);
    if (r.effect === "systemDisabled") state.log.push(`⚠ ${SYSTEMS[r.system]?.label} DISABLED by fire!`);
    if (r.effect === "noLifeSupport") state.log.push(`⚠ Life support offline! Hull takes ${r.damage} damage!`);
  }
  for (const r of enemyEffects) {
    if (r.effect === "fire") state.log.push(`🔥 Enemy ${SYSTEMS[r.system]?.label} burns for ${r.damage} damage.`);
    if (r.effect === "fireOut") state.log.push(`Enemy ${SYSTEMS[r.system]?.label} fire goes out.`);
    if (r.effect === "systemDisabled") state.log.push(`Enemy ${SYSTEMS[r.system]?.label} DISABLED by fire!`);
  }
}

/**
 * Get the current phase object.
 */
export function getCurrentPhase(state) {
  return PHASES[state.phaseIndex];
}
