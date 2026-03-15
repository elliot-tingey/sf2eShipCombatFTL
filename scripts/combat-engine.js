/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Combat Engine: Damage resolution, AC/TL, crits, tracking weapons
   ========================================================================== */

import {
  SIZE_CATEGORIES, MANEUVERABILITY, CRITICAL_SYSTEMS, CRIT_CONDITIONS,
  SHIELD_QUADRANTS, WEAPON_TYPES, RANDOM_SUBSYSTEM_HIT_CHANCE, RANGES
} from "./constants.js";

// ── AC / TL Calculation ─────────────────────────────────────────────────────

/**
 * Calculate a ship's Armor Class.
 * AC = 10 + pilot's Piloting ranks + armor bonus + size mod + stunt bonuses
 */
export function calcAC(shipData) {
  const sizeMod = SIZE_CATEGORIES[shipData.size]?.acTlMod ?? 0;
  const armorBonus = shipData.armorBonus ?? 0;
  const pilotRanks = shipData.pilotRanks ?? 0;
  const stuntBonus = shipData.modifiers?.acBonus ?? 0;
  return 10 + pilotRanks + armorBonus + sizeMod + stuntBonus;
}

/**
 * Calculate a ship's Target Lock.
 * TL = 10 + pilot's Piloting ranks + defensive countermeasures + size mod + armor penalty + stunt bonuses
 */
export function calcTL(shipData) {
  const sizeMod = SIZE_CATEGORIES[shipData.size]?.acTlMod ?? 0;
  const defCountermeasures = shipData.countermeasuresBonus ?? 0;
  const pilotRanks = shipData.pilotRanks ?? 0;
  const armorPenalty = shipData.armorTlPenalty ?? 0;
  const stuntBonus = shipData.modifiers?.tlBonus ?? 0;
  return 10 + pilotRanks + defCountermeasures + sizeMod + armorPenalty + stuntBonus;
}

/**
 * Calculate gunnery bonus.
 * Gunnery Check = 1d20 + gunner's BAB or Piloting ranks + DEX mod + computer bonus + bonuses
 */
export function calcGunneryMod(shipData, crewMod = 0) {
  const computerBonus = shipData.computerBonus ?? 0;
  const stuntBonus = shipData.modifiers?.attackBonus ?? 0;
  return crewMod + computerBonus + stuntBonus;
}


// ── Shield Quadrant Management ──────────────────────────────────────────────

/**
 * Damage a specific shield quadrant. Returns damage that bleeds through.
 */
export function damageShieldQuadrant(shipData, quadrant, damage) {
  const shields = shipData.shields;
  if (!shields || !shields[quadrant]) return damage;

  const absorbed = Math.min(shields[quadrant].current, damage);
  shields[quadrant].current -= absorbed;
  return damage - absorbed; // bleed-through
}

/**
 * Distribute shield points evenly across quadrants.
 */
export function distributeShieldsEvenly(shipData) {
  const total = shipData.shields?.total ?? 0;
  const perQuadrant = Math.floor(total / 4);
  const remainder = total % 4;
  for (let i = 0; i < SHIELD_QUADRANTS.length; i++) {
    const q = SHIELD_QUADRANTS[i];
    if (!shipData.shields[q]) shipData.shields[q] = { current: 0, max: 0 };
    const maxSP = perQuadrant + (i < remainder ? 1 : 0);
    shipData.shields[q].max = maxSP;
    shipData.shields[q].current = maxSP;
  }
}


// ── Damage Resolution ───────────────────────────────────────────────────────

/**
 * Apply damage from a hit to a ship.
 *
 * SF1e flow:
 * 1. Damage hits shields in the attacked quadrant first
 * 2. Excess damage (and all damage if shields are down) hits hull
 * 3. If damage >= DT (Damage Threshold), it counts
 * 4. Every time total hull damage crosses a CT multiple, random critical
 * 5. If not specifically targeting a subsystem, 10% random subsystem hit
 *
 * @param {object} shipData - The ship's data object
 * @param {number} rawDamage - Total damage dealt
 * @param {string} quadrant - Which shield quadrant is hit
 * @param {string|null} targetedSystem - Specific system targeted (null for hull only)
 * @param {boolean} isTargeted - Whether the attacker had subsystem intel
 */
export function applyDamage(shipData, rawDamage, quadrant, targetedSystem = null, isTargeted = false) {
  const report = {
    rawDamage,
    quadrant,
    shieldAbsorbed: 0,
    hullDamage: 0,
    belowDT: false,
    criticalTriggered: false,
    criticalSystem: null,
    criticalCondition: null,
    shipDestroyed: false,
    subsystemHit: null
  };

  let damage = rawDamage;

  // Step 1: Shields absorb
  if (shipData.shields?.[quadrant]?.current > 0) {
    const absorbed = Math.min(shipData.shields[quadrant].current, damage);
    shipData.shields[quadrant].current -= absorbed;
    report.shieldAbsorbed = absorbed;
    damage -= absorbed;
  }

  // Step 2: Check Damage Threshold
  if (damage > 0 && shipData.dt > 0 && damage < shipData.dt) {
    report.belowDT = true;
    return report; // damage doesn't count
  }

  // Step 3: Apply to hull
  if (damage > 0) {
    const prevHull = shipData.hull.current;
    shipData.hull.current = Math.max(0, shipData.hull.current - damage);
    report.hullDamage = prevHull - shipData.hull.current;

    // Check destruction
    if (shipData.hull.current <= 0) {
      report.shipDestroyed = true;
      return report;
    }

    // Step 4: Check for critical damage (CT threshold)
    const totalDamageTaken = shipData.hull.max - shipData.hull.current;
    const prevDamageTaken = shipData.hull.max - prevHull;
    const ct = shipData.ct;
    if (ct > 0) {
      const prevCritCount = Math.floor(prevDamageTaken / ct);
      const newCritCount = Math.floor(totalDamageTaken / ct);
      if (newCritCount > prevCritCount) {
        // Trigger critical damage
        const critResult = applyCriticalDamage(shipData, targetedSystem, isTargeted);
        report.criticalTriggered = true;
        report.criticalSystem = critResult.system;
        report.criticalCondition = critResult.condition;
      }
    }

    // Step 5: Random subsystem hit chance (if not already targeting)
    if (!isTargeted && !report.criticalTriggered) {
      if (Math.random() < RANDOM_SUBSYSTEM_HIT_CHANCE) {
        const systems = Object.keys(CRITICAL_SYSTEMS);
        const randomSys = systems[Math.floor(Math.random() * systems.length)];
        report.subsystemHit = randomSys;
        // Apply one step of damage
        escalateCritCondition(shipData, randomSys);
      }
    }
  }

  return report;
}


// ── Critical Damage ─────────────────────────────────────────────────────────

/**
 * Apply critical damage to a ship system.
 * If targeting a specific system, that system takes the hit.
 * Otherwise, random system.
 */
export function applyCriticalDamage(shipData, targetedSystem = null, isTargeted = false) {
  const systems = Object.keys(CRITICAL_SYSTEMS);
  let system;

  if (isTargeted && targetedSystem && systems.includes(targetedSystem)) {
    system = targetedSystem;
  } else {
    // Random system
    system = systems[Math.floor(Math.random() * systems.length)];
  }

  const condition = escalateCritCondition(shipData, system);
  return { system, condition };
}

/**
 * Escalate a system's critical condition by one step.
 */
export function escalateCritCondition(shipData, systemId) {
  if (!shipData.criticals) shipData.criticals = {};
  const current = shipData.criticals[systemId] ?? "nominal";
  const severityOrder = ["nominal", "glitching", "malfunctioning", "wrecked"];
  const idx = severityOrder.indexOf(current);
  const next = severityOrder[Math.min(idx + 1, severityOrder.length - 1)];
  shipData.criticals[systemId] = next;
  return next;
}

/**
 * Get the critical condition of a system.
 */
export function getCritCondition(shipData, systemId) {
  return shipData.criticals?.[systemId] ?? "nominal";
}

/**
 * Get penalties from critical conditions.
 */
export function getCritPenalties(shipData) {
  const penalties = { piloting: 0, gunnery: 0, engineering: 0, computers: 0, speed: 0 };
  if (!shipData.criticals) return penalties;

  for (const [sys, cond] of Object.entries(shipData.criticals)) {
    const sev = CRIT_CONDITIONS[cond]?.severity ?? 0;
    if (sev === 0) continue;

    switch (sys) {
      case "engines":
        if (sev >= 1) penalties.speed -= 2;
        if (sev >= 2) penalties.piloting -= 2;
        if (sev >= 3) { penalties.speed = -999; penalties.piloting -= 4; } // engines wrecked
        break;
      case "sensors":
        if (sev >= 1) penalties.computers -= 2;
        if (sev >= 2) penalties.gunnery -= 2;
        if (sev >= 3) { penalties.computers -= 4; penalties.gunnery -= 4; }
        break;
      case "weaponsArray":
        if (sev >= 1) penalties.gunnery -= 2;
        if (sev >= 2) penalties.gunnery -= 2; // cumulative
        if (sev >= 3) penalties.gunnery = -999; // weapons wrecked
        break;
      case "powerCore":
        if (sev >= 1) { penalties.engineering -= 2; }
        if (sev >= 2) { penalties.engineering -= 2; }
        if (sev >= 3) { /* ship is disabled */ }
        break;
      case "lifeSupport":
        // Life support crits affect crew performance
        if (sev >= 2) { penalties.piloting -= 1; penalties.gunnery -= 1; penalties.engineering -= 1; penalties.computers -= 1; }
        if (sev >= 3) { penalties.piloting -= 2; penalties.gunnery -= 2; penalties.engineering -= 2; penalties.computers -= 2; }
        break;
    }
  }

  return penalties;
}


// ── Tracking Weapon Management ──────────────────────────────────────────────

/**
 * Create a new tracking projectile.
 */
export function createTrackingProjectile(sourceShipId, targetShipId, weaponData, gunneryMod, turnsFired) {
  // Classify speed
  let trackingClass = "medium";
  const speed = weaponData.speed ?? 10;
  if (speed >= 14) trackingClass = "fast";
  else if (speed <= 8) trackingClass = "slow";

  const turnsToHit = trackingClass === "fast" ? 1 : trackingClass === "medium" ? 2 : 3;

  return {
    id: foundry.utils.randomID(),
    sourceShipId,
    targetShipId,
    weaponName: weaponData.name,
    damage: weaponData.damage,
    speed,
    trackingClass,
    turnsToHit,
    turnsRemaining: turnsToHit,
    turnFired: turnsFired,
    gunneryMod, // initial gunnery mod used for subsequent checks
    quadrant: "forward", // default impact quadrant
    active: true
  };
}

/**
 * Process all tracking projectiles for a round.
 * Returns array of hit reports and updates projectile states.
 */
export function processTrackingProjectiles(projectiles, ships, currentRound) {
  const reports = [];

  for (const proj of projectiles) {
    if (!proj.active) continue;

    proj.turnsRemaining--;

    if (proj.turnsRemaining <= 0) {
      // Projectile arrives — resolve hit
      const targetShip = ships.find(s => s.id === proj.targetShipId);
      if (!targetShip) {
        proj.active = false;
        continue;
      }

      // The projectile needs a new gunnery check vs TL
      // (no computer or crew bonuses from current round per SF1e rules)
      const targetTL = calcTL(targetShip.data);

      reports.push({
        projectile: proj,
        targetShip,
        targetTL,
        needsGunneryCheck: true // the GM/system will roll this
      });
    }
  }

  return reports;
}

/**
 * Resolve a tracking projectile hit.
 */
export function resolveTrackingHit(shipData, projectile, quadrant = "forward") {
  // Roll damage
  // Caller handles the actual Roll
  return {
    projectile,
    quadrant,
    weaponName: projectile.weaponName,
    damage: projectile.damage
  };
}


// ── Utility ─────────────────────────────────────────────────────────────────

/**
 * Get total remaining shield points across all quadrants.
 */
export function getTotalShields(shipData) {
  let total = 0;
  for (const q of SHIELD_QUADRANTS) {
    total += shipData.shields?.[q]?.current ?? 0;
  }
  return total;
}

/**
 * Get max total shield points.
 */
export function getMaxShields(shipData) {
  let total = 0;
  for (const q of SHIELD_QUADRANTS) {
    total += shipData.shields?.[q]?.max ?? 0;
  }
  return total;
}
