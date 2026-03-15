/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   Ship Data: Flag-based storage, defaults, derived stats, crew persistence
   ========================================================================== */

import { MODULE_ID, FLAG_KEY, IS_SHIP_FLAG, SIZE_CATEGORIES, MANEUVERABILITY, SUBSYSTEM_TYPES, DAMAGE_CONDITIONS, BASE_FRAMES, ROLES } from "./constants.js";

// ── Flag Access ─────────────────────────────────────────────────────────────

export function isStarship(actor) {
  return actor?.getFlag(MODULE_ID, IS_SHIP_FLAG) === true;
}

export function getShipData(actor) {
  if (!isStarship(actor)) return null;
  return actor.getFlag(MODULE_ID, FLAG_KEY) ?? buildDefaultShipData(actor.name);
}

export async function setShipData(actor, data) {
  // Foundry flag merge can cause issues with arrays/objects — unset first then set
  await actor.unsetFlag(MODULE_ID, FLAG_KEY);
  await actor.setFlag(MODULE_ID, FLAG_KEY, data);
}

// ── Default Ship Data ───────────────────────────────────────────────────────

export function buildDefaultShipData(name = "New Starship") {
  return {
    name,
    tier: 1,
    frame: "explorer",
    size: "medium",
    maneuverability: "average",
    speed: 8,
    turnDistance: 2,

    // Hull — single pool
    hull: { current: 55, max: 55 },
    hpIncrement: 10,
    dt: 0,
    ct: 11,

    // Shields — single global pool, no quadrants
    shields: { current: 40, max: 40 },

    // Defense stats
    armorBonus: 2,
    armorTlPenalty: 0,
    countermeasuresBonus: 1,
    pilotRanks: 5,

    // Computer
    computerBonus: 1,
    computerNodes: 1,
    computerNpcId: null, // Actor ID of the ship's computer NPC

    // Sensors
    sensorMod: 0,
    sensorRange: "medium",

    // Subsystems — array of objects, can have multiples of any type
    subsystems: [
      { id: foundry.utils.randomID(), type: "lifeSupport",  name: "Life Support",  condition: "nominal", notes: "" },
      { id: foundry.utils.randomID(), type: "sensors",      name: "Sensors",       condition: "nominal", notes: "" },
      { id: foundry.utils.randomID(), type: "weaponsArray",  name: "Weapons Array", condition: "nominal", notes: "" },
      { id: foundry.utils.randomID(), type: "engines",       name: "Engines",       condition: "nominal", notes: "" },
      { id: foundry.utils.randomID(), type: "powerCore",     name: "Power Core",    condition: "nominal", notes: "" }
    ],

    // Weapons — array of weapon objects
    weapons: [],

    // Round modifiers (reset each round)
    modifiers: {},

    // Disposition
    disposition: "friendly",

    // Crew memory — remembers last assigned crew per role
    crewMemory: {}, // { pilot: ["actorId1"], gunner: ["actorId1", "actorId2"], ... }

    // Notes
    notes: ""
  };
}


// ── Derived Stats ───────────────────────────────────────────────────────────

export function calcAC(data) {
  const sizeMod = SIZE_CATEGORIES[data.size]?.acTlMod ?? 0;
  return 10 + (data.pilotRanks ?? 0) + (data.armorBonus ?? 0) + sizeMod + (data.modifiers?.acBonus ?? 0);
}

export function calcTL(data) {
  const sizeMod = SIZE_CATEGORIES[data.size]?.acTlMod ?? 0;
  return 10 + (data.pilotRanks ?? 0) + (data.countermeasuresBonus ?? 0) + sizeMod + (data.armorTlPenalty ?? 0) + (data.modifiers?.tlBonus ?? 0);
}

export function getDerived(data) {
  if (!data) return {};
  return {
    ac: calcAC(data),
    tl: calcTL(data),
    hullPercent: data.hull.max > 0 ? (data.hull.current / data.hull.max * 100) : 0,
    shieldPercent: data.shields.max > 0 ? (data.shields.current / data.shields.max * 100) : 0,
    isDestroyed: data.hull.current <= 0
  };
}


// ── Subsystem Management ────────────────────────────────────────────────────

export function addSubsystem(data, type, name = "", notes = "") {
  const typeDef = SUBSYSTEM_TYPES[type];
  if (!typeDef) return;
  if (!name) name = typeDef.label;
  data.subsystems.push({
    id: foundry.utils.randomID(),
    type,
    name,
    condition: "nominal",
    notes
  });
}

export function removeSubsystem(data, subsystemId) {
  data.subsystems = data.subsystems.filter(s => s.id !== subsystemId);
}

export function setSubsystemCondition(data, subsystemId, condition) {
  const sub = data.subsystems.find(s => s.id === subsystemId);
  if (sub && DAMAGE_CONDITIONS[condition]) {
    sub.condition = condition;
  }
}

export function escalateSubsystem(data, subsystemId) {
  const sub = data.subsystems.find(s => s.id === subsystemId);
  if (!sub) return null;
  const order = ["nominal", "glitching", "malfunctioning", "wrecked"];
  const idx = order.indexOf(sub.condition);
  sub.condition = order[Math.min(idx + 1, order.length - 1)];
  return sub.condition;
}

export function repairSubsystem(data, subsystemId) {
  const sub = data.subsystems.find(s => s.id === subsystemId);
  if (!sub) return null;
  const order = ["nominal", "glitching", "malfunctioning", "wrecked"];
  const idx = order.indexOf(sub.condition);
  sub.condition = order[Math.max(idx - 1, 0)];
  return sub.condition;
}


// ── Weapon Management ───────────────────────────────────────────────────────

export function addWeapon(data, weaponTemplate) {
  data.weapons.push({
    id: foundry.utils.randomID(),
    ...foundry.utils.deepClone(weaponTemplate),
    arc: weaponTemplate.arc ?? "forward"
  });
}

export function removeWeapon(data, weaponId) {
  data.weapons = data.weapons.filter(w => w.id !== weaponId);
}


// ── Crew Memory ─────────────────────────────────────────────────────────────

export function saveCrewMemory(data, role, actorIds) {
  if (!data.crewMemory) data.crewMemory = {};
  data.crewMemory[role] = actorIds.filter(Boolean);
}

export function getCrewMemory(data, role) {
  const ids = data.crewMemory?.[role] ?? [];
  // Validate that actors still exist
  return ids.filter(id => game.actors.get(id));
}


// ── Damage Application (simplified — no quadrants) ──────────────────────────

/**
 * Apply damage to a ship. Shields absorb first (unless missile bypasses).
 * Returns a damage report.
 */
export function applyDamage(data, rawDamage, { bypassShields = false, targetSubsystemId = null } = {}) {
  const report = {
    rawDamage,
    shieldAbsorbed: 0,
    hullDamage: 0,
    belowDT: false,
    critTriggered: false,
    critSubsystem: null,
    subsystemHit: null,
    shipDestroyed: false
  };

  let damage = rawDamage;

  // Shields absorb (unless bypassed, e.g., targeted missiles)
  if (!bypassShields && data.shields.current > 0) {
    const absorbed = Math.min(data.shields.current, damage);
    data.shields.current -= absorbed;
    report.shieldAbsorbed = absorbed;
    damage -= absorbed;
  }

  // Damage threshold
  if (damage > 0 && data.dt > 0 && damage < data.dt) {
    report.belowDT = true;
    return report;
  }

  // Hull damage
  if (damage > 0) {
    const prevHull = data.hull.current;
    data.hull.current = Math.max(0, data.hull.current - damage);
    report.hullDamage = prevHull - data.hull.current;

    if (data.hull.current <= 0) {
      report.shipDestroyed = true;
      return report;
    }

    // Critical threshold check
    const totalDmgTaken = data.hull.max - data.hull.current;
    const prevDmgTaken = data.hull.max - prevHull;
    if (data.ct > 0) {
      const prevCrits = Math.floor(prevDmgTaken / data.ct);
      const newCrits = Math.floor(totalDmgTaken / data.ct);
      if (newCrits > prevCrits && data.subsystems.length > 0) {
        // Trigger critical — target specific or random subsystem
        let target;
        if (targetSubsystemId) {
          target = data.subsystems.find(s => s.id === targetSubsystemId);
        }
        if (!target) {
          target = data.subsystems[Math.floor(Math.random() * data.subsystems.length)];
        }
        if (target) {
          escalateSubsystem(data, target.id);
          report.critTriggered = true;
          report.critSubsystem = target;
        }
      }
    }

    // Random subsystem nick (10% chance if not already critting)
    if (!report.critTriggered && !targetSubsystemId && data.subsystems.length > 0) {
      if (Math.random() < 0.10) {
        const target = data.subsystems[Math.floor(Math.random() * data.subsystems.length)];
        escalateSubsystem(data, target.id);
        report.subsystemHit = target;
      }
    }
  }

  return report;
}


// ── Create Starship Actor ───────────────────────────────────────────────────

export async function createStarshipActor(name = "New Starship", frameId = "explorer") {
  const availableTypes = game.documentTypes?.Actor ?? [];
  let baseType = availableTypes.includes("vehicle") ? "vehicle" : "npc";

  const actor = await Actor.create({
    name,
    type: baseType,
    img: "icons/svg/ship.svg",
    flags: {
      [MODULE_ID]: {
        [IS_SHIP_FLAG]: true,
        [FLAG_KEY]: buildDefaultShipData(name)
      }
    }
  });

  if (frameId && actor) await applyFrameToActor(actor, frameId);
  return actor;
}

export async function applyFrameToActor(actor, frameId) {
  const frame = BASE_FRAMES[frameId];
  if (!frame || !actor) return;

  const data = getShipData(actor) ?? buildDefaultShipData(actor.name);
  data.frame = frameId;
  data.size = frame.size;
  data.maneuverability = frame.maneuverability;
  data.hull.max = frame.hp;
  data.hull.current = frame.hp;
  data.hpIncrement = frame.hpIncrement;
  data.dt = frame.dt;
  data.ct = frame.ct;
  data.speed = frame.speed;
  data.turnDistance = MANEUVERABILITY[frame.maneuverability]?.turn ?? 2;
  data.name = actor.name;

  await setShipData(actor, data);
}

export async function showCreateStarshipDialog() {
  const frameOptions = Object.entries(BASE_FRAMES).map(([k, v]) =>
    `<option value="${k}">${v.name} (${SIZE_CATEGORIES[v.size]?.label}, HP ${v.hp})</option>`
  ).join("");

  return new Promise(resolve => {
    new Dialog({
      title: "Create Starship",
      content: `
        <form>
          <div class="form-group"><label>Ship Name</label><input type="text" name="shipName" value="New Starship" autofocus /></div>
          <div class="form-group"><label>Base Frame</label><select name="frame">${frameOptions}</select></div>
          <div class="form-group"><label>Disposition</label>
            <select name="disposition">
              <option value="friendly">Friendly</option>
              <option value="enemy">Enemy</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: '<i class="fas fa-rocket"></i>', label: "Create Starship",
          callback: async (html) => {
            const form = html.find?.("form")?.[0] ?? html[0]?.querySelector("form");
            const name = form?.shipName?.value || "New Starship";
            const frame = form?.frame?.value || "explorer";
            const disposition = form?.disposition?.value || "friendly";

            const actor = await createStarshipActor(name, frame);
            if (actor) {
              const data = getShipData(actor);
              if (data) { data.disposition = disposition; await setShipData(actor, data); }
              ui.notifications.info(`Starship "${name}" created.`);
            }
            resolve(actor);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
      },
      default: "create"
    }).render(true);
  });
}
