/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION
   Actions: All 20 crew role actions with roll mechanics and effects
   ========================================================================== */

import {
  SYSTEMS, SYSTEM_IDS, ROLES, WEAPON_TYPES, RANGE_LABELS,
  getEffectivePower, getSystemPenalty, getSensorBonus,
  getShipAC, getShipEvasion, applyDamage, getFreePower
} from "./combat-engine.js";

// ── Action Definitions ──────────────────────────────────────────────────────

export const ACTIONS = {

  // ─── PILOT ──────────────────────────────────────────────────────────────
  pilot: [
    {
      id: "evasiveManeuvers",
      name: "Evasive Maneuvers",
      description: "Piloting DC 15 — Boost ship evasion this round. Crit: double bonus.",
      skill: "piloting",
      dc: 15,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.critSuccess) {
          ship.modifiers.evasionBonus = (ship.modifiers.evasionBonus ?? 0) + 4;
          return { success: true, message: `Brilliant flying! Ship evasion boosted by +4 this round.` };
        } else if (rollResult.success) {
          ship.modifiers.evasionBonus = (ship.modifiers.evasionBonus ?? 0) + 2;
          return { success: true, message: `Evasive pattern engaged. Ship evasion boosted by +2 this round.` };
        }
        return { success: false, message: `The maneuver fails to gain any evasive advantage.` };
      }
    },
    {
      id: "fullThrust",
      name: "Full Thrust",
      description: "Piloting DC 12 — Change engagement range (close/medium/long).",
      skill: "piloting",
      dc: 12,
      requiresTarget: false,
      requiresRange: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        if (rollResult.success) {
          const oldRange = state.range;
          state.range = options.targetRange ?? "medium";
          return { success: true, message: `Engines burn hard — range shifts from ${RANGE_LABELS[oldRange]} to ${RANGE_LABELS[state.range]}.` };
        }
        return { success: false, message: `Couldn't break from current vector. Range unchanged.` };
      }
    },
    {
      id: "flyby",
      name: "Flyby",
      description: "Piloting DC 18 — Next friendly attack gets +2 (crit: +4).",
      skill: "piloting",
      dc: 18,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.critSuccess) {
          ship.modifiers.attackBonus = (ship.modifiers.attackBonus ?? 0) + 4;
          return { success: true, message: `Perfect flyby — exposed the enemy's flank. Next attack gets +4!` };
        } else if (rollResult.success) {
          ship.modifiers.attackBonus = (ship.modifiers.attackBonus ?? 0) + 2;
          return { success: true, message: `Good positioning. Next attack gets +2.` };
        }
        return { success: false, message: `The flyby doesn't achieve the desired angle.` };
      }
    },
    {
      id: "rammingSpeed",
      name: "Ramming Speed",
      description: "Piloting DC 20 — Ram the enemy. Both ships take damage. Crit: double to enemy.",
      skill: "piloting",
      dc: 20,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.success) {
          const enginePow = getEffectivePower(ship.systems.engines);
          const baseDmg = enginePow + 2;

          let enemyDmgFormula = rollResult.critSuccess ? `${baseDmg * 2}d6` : `${baseDmg}d6`;
          let selfDmgFormula = `${Math.ceil(baseDmg / 2)}d6`;

          const enemyRoll = await new Roll(enemyDmgFormula).evaluate();
          const selfRoll = await new Roll(selfDmgFormula).evaluate();

          const enemyReport = applyDamage(enemyShip, enemyRoll.total, "engines", "kinetic", rollResult.critSuccess);
          const selfReport = applyDamage(ship, selfRoll.total, "engines", "kinetic", false);

          // Force close range on successful ram
          state.range = "close";

          let msg = `RAMMING SPEED! Enemy takes ${enemyRoll.total} kinetic damage`;
          if (enemyReport.systemDamage > 0) msg += ` (${enemyReport.systemDamage} to engines)`;
          msg += `. Your ship takes ${selfRoll.total} damage from the impact.`;
          if (rollResult.critSuccess) msg += ` (Critical: double damage to enemy!)`;
          if (enemyReport.shipDestroyed) msg += ` THE ENEMY SHIP IS DESTROYED!`;

          return {
            success: true, message: msg,
            rolls: [enemyRoll, selfRoll],
            damageReport: enemyReport, selfDamageReport: selfReport
          };
        }
        return { success: false, message: `The ramming attempt misses — the enemy evades your approach vector.` };
      }
    }
  ],

  // ─── GUNNER ─────────────────────────────────────────────────────────────
  gunner: [
    {
      id: "fireWeapon",
      name: "Fire Weapon",
      description: "Attack roll vs enemy AC — Fire one weapon at a target system.",
      skill: "gunnery",
      dc: null, // vs enemy AC
      requiresTarget: true,
      requiresWeapon: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const weapon = ship.weapons[options.weaponIndex ?? 0];
        if (!weapon) return { success: false, message: "No weapon selected." };
        if (weapon.ammo === 0) return { success: false, message: `${weapon.name} is out of ammunition!` };

        // Consume ammo
        if (weapon.ammo > 0) weapon.ammo--;

        const targetAC = getShipAC(enemyShip);
        const sensorBonus = getSensorBonus(ship);
        const attackBonus = (ship.modifiers.attackBonus ?? 0);
        const rangeBonus = WEAPON_TYPES[weapon.type]?.rangeBonus?.[state.range] ?? 0;
        const weaponPenalty = getSystemPenalty(ship.systems.weapons);

        const totalBonus = rollResult.naturalRoll + sensorBonus + attackBonus + rangeBonus + weaponPenalty + (options.skillMod ?? 0);
        const hit = totalBonus >= targetAC;
        const crit = totalBonus >= targetAC + 10;

        if (hit) {
          const dmgRoll = await new Roll(weapon.damage).evaluate();
          let totalDmg = dmgRoll.total;
          if (crit) totalDmg = Math.round(totalDmg * 1.5);

          const report = applyDamage(enemyShip, totalDmg, options.targetSystem, weapon.type, crit);

          let msg = `${weapon.name} hits ${SYSTEMS[options.targetSystem]?.label}! `;
          msg += `${totalDmg} ${WEAPON_TYPES[weapon.type]?.label} damage`;
          if (report.shieldAbsorbed > 0) msg += ` (${report.shieldAbsorbed} absorbed by shields)`;
          if (report.armorReduced > 0) msg += ` (${report.armorReduced} reduced by armor)`;
          if (report.systemDamage > 0) msg += `. System takes ${report.systemDamage} damage`;
          if (report.hullDamage > 0) msg += `. Hull takes ${report.hullDamage} damage`;
          if (crit) msg += ` ★ CRITICAL HIT ★`;
          if (report.fire) msg += ` 🔥 Fire started!`;
          if (report.systemDestroyed) msg += ` ⚠ ${SYSTEMS[options.targetSystem]?.label} DISABLED!`;
          if (report.shipDestroyed) msg += ` 💀 ENEMY SHIP DESTROYED!`;
          msg += `.`;

          return { success: true, message: msg, rolls: [dmgRoll], damageReport: report, hit: true, crit };
        }

        return { success: false, message: `${weapon.name} fires at ${SYSTEMS[options.targetSystem]?.label} — MISS! (Rolled ${totalBonus} vs AC ${targetAC})`, hit: false };
      }
    },
    {
      id: "broadside",
      name: "Broadside",
      description: "Fire ALL weapons at -2 penalty each. Pick a target system for each.",
      skill: "gunnery",
      dc: null,
      requiresTarget: true,
      requiresWeapon: false,
      isBroadside: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const results = [];
        const targetAC = getShipAC(enemyShip);
        const sensorBonus = getSensorBonus(ship);
        const attackBonus = (ship.modifiers.attackBonus ?? 0);
        const weaponPenalty = getSystemPenalty(ship.systems.weapons);

        for (let i = 0; i < ship.weapons.length; i++) {
          const weapon = ship.weapons[i];
          if (weapon.ammo === 0) { results.push(`${weapon.name}: OUT OF AMMO`); continue; }
          if (weapon.ammo > 0) weapon.ammo--;

          const rangeBonus = WEAPON_TYPES[weapon.type]?.rangeBonus?.[state.range] ?? 0;
          const attackRoll = await new Roll("1d20").evaluate();
          const total = attackRoll.total + sensorBonus + attackBonus + rangeBonus + weaponPenalty + (options.skillMod ?? 0) - 2;
          const hit = total >= targetAC;
          const crit = total >= targetAC + 10;
          const targetSys = options.targetSystem; // all target same system for broadside

          if (hit) {
            const dmgRoll = await new Roll(weapon.damage).evaluate();
            let totalDmg = dmgRoll.total;
            if (crit) totalDmg = Math.round(totalDmg * 1.5);
            const report = applyDamage(enemyShip, totalDmg, targetSys, weapon.type, crit);
            let msg = `${weapon.name}: HIT for ${totalDmg} dmg`;
            if (crit) msg += ` ★CRIT★`;
            if (report.systemDestroyed) msg += ` ⚠ SYSTEM DISABLED`;
            if (report.fire) msg += ` 🔥`;
            results.push(msg);
          } else {
            results.push(`${weapon.name}: MISS (${total} vs ${targetAC})`);
          }
        }
        return { success: true, message: `BROADSIDE!\n` + results.join("\n") };
      }
    },
    {
      id: "preciseShot",
      name: "Precise Shot",
      description: "Attack at -4 penalty. On hit: +50% damage, double damage to targeted system.",
      skill: "gunnery",
      dc: null,
      requiresTarget: true,
      requiresWeapon: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const weapon = ship.weapons[options.weaponIndex ?? 0];
        if (!weapon) return { success: false, message: "No weapon selected." };
        if (weapon.ammo === 0) return { success: false, message: `${weapon.name} is out of ammunition!` };
        if (weapon.ammo > 0) weapon.ammo--;

        const targetAC = getShipAC(enemyShip);
        const sensorBonus = getSensorBonus(ship);
        const attackBonus = (ship.modifiers.attackBonus ?? 0);
        const rangeBonus = WEAPON_TYPES[weapon.type]?.rangeBonus?.[state.range] ?? 0;
        const weaponPenalty = getSystemPenalty(ship.systems.weapons);
        const total = rollResult.naturalRoll + sensorBonus + attackBonus + rangeBonus + weaponPenalty + (options.skillMod ?? 0) - 4;
        const hit = total >= targetAC;
        const crit = total >= targetAC + 10;

        if (hit) {
          const dmgRoll = await new Roll(weapon.damage).evaluate();
          let totalDmg = Math.round(dmgRoll.total * 1.5);
          if (crit) totalDmg = Math.round(totalDmg * 1.5);

          // For precise shot, system takes 80% and hull takes 20%
          const sys = enemyShip.systems[options.targetSystem];
          let sysDmg = 0, hullDmg = 0;
          if (sys && sys.hp > 0) {
            sysDmg = Math.ceil(totalDmg * 0.8);
            hullDmg = Math.floor(totalDmg * 0.2);
            sys.hp = Math.max(0, sys.hp - sysDmg);
            if (sys.hp <= 0) sys.power = 0;
          } else {
            hullDmg = totalDmg;
          }
          enemyShip.hull.current = Math.max(0, enemyShip.hull.current - hullDmg);

          let msg = `Precise shot hits ${SYSTEMS[options.targetSystem]?.label}! ${sysDmg} system damage, ${hullDmg} hull damage.`;
          if (crit) msg += ` ★ CRITICAL! ★`;
          if (sys && sys.hp <= 0) msg += ` ⚠ SYSTEM DISABLED!`;
          if (enemyShip.hull.current <= 0) msg += ` 💀 ENEMY DESTROYED!`;
          return { success: true, message: msg, rolls: [dmgRoll] };
        }
        return { success: false, message: `Precise shot misses ${SYSTEMS[options.targetSystem]?.label}. (${total} vs AC ${targetAC})` };
      }
    },
    {
      id: "suppressiveFire",
      name: "Suppressive Fire",
      description: "Gunnery DC 15 — Enemy gets -2 to all checks this round (crit: -4).",
      skill: "gunnery",
      dc: 15,
      requiresTarget: false,
      requiresWeapon: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.critSuccess) {
          enemyShip.modifiers.allPenalty = (enemyShip.modifiers.allPenalty ?? 0) - 4;
          return { success: true, message: `Withering suppressive fire! Enemy takes -4 to all checks this round.` };
        } else if (rollResult.success) {
          enemyShip.modifiers.allPenalty = (enemyShip.modifiers.allPenalty ?? 0) - 2;
          return { success: true, message: `Suppressive fire pins the enemy down. -2 to all their checks this round.` };
        }
        return { success: false, message: `Suppressive fire fails to find its mark.` };
      }
    }
  ],

  // ─── SECURITY ──────────────────────────────────────────────────────────
  security: [
    {
      id: "deepScan",
      name: "Deep Scan",
      description: "Computers DC 14 — Reveal enemy system HP and power levels.",
      skill: "computers",
      dc: 14,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.success) {
          state.enemyScanned = true;
          let msg = `Deep scan complete — enemy systems revealed:\n`;
          for (const sysId of SYSTEM_IDS) {
            const sys = enemyShip.systems[sysId];
            msg += `  ${SYSTEMS[sysId].label}: ${sys.hp}/${sys.maxHp} HP, Power ${sys.power}/${sys.maxPower}`;
            if (sys.status.length > 0) msg += ` [${sys.status.join(", ")}]`;
            msg += `\n`;
          }
          if (rollResult.critSuccess) {
            msg += `  Weapons:`;
            for (const w of enemyShip.weapons) {
              msg += `\n    ${w.name} (${w.damage} ${w.type}${w.ammo >= 0 ? `, ${w.ammo} ammo` : ""})`;
            }
          }
          return { success: true, message: msg };
        }
        return { success: false, message: `Scan interference — unable to penetrate enemy countermeasures.` };
      }
    },
    {
      id: "launchBoarding",
      name: "Launch Boarding Party",
      description: "Athletics DC 16 — Disable one enemy system for 1 round. Must be at Close range.",
      skill: "athletics",
      dc: 16,
      requiresTarget: true,
      requiresCloseRange: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        if (state.range !== "close") return { success: false, message: `Must be at Close range to board!` };
        const sys = enemyShip.systems[options.targetSystem];
        if (rollResult.success) {
          if (sys) {
            sys.status.push("boarded");
            const prevPower = sys.power;
            sys.power = 0;
            // Will be restored next round during cleanup
            state.roundModifiers.enemy[`boardedRestore_${options.targetSystem}`] = prevPower;
          }
          let msg = `Boarding party breaches ${SYSTEMS[options.targetSystem]?.label}! System disabled for this round.`;
          if (rollResult.critSuccess) {
            const dmg = 1;
            if (sys) sys.hp = Math.max(0, sys.hp - dmg);
            msg += ` Critical: boarding party also deals 1 system damage!`;
          }
          return { success: true, message: msg };
        }
        return { success: false, message: `Boarding party repelled! The assault on ${SYSTEMS[options.targetSystem]?.label} fails.` };
      }
    },
    {
      id: "braceForImpact",
      name: "Brace for Impact",
      description: "Athletics DC 12 — Reduce next incoming damage by 1d6+2 (crit: 2d6+2).",
      skill: "athletics",
      dc: 12,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.success) {
          const formula = rollResult.critSuccess ? "2d6+2" : "1d6+2";
          const roll = await new Roll(formula).evaluate();
          ship.modifiers.damageReduction = (ship.modifiers.damageReduction ?? 0) + roll.total;
          return { success: true, message: `Bracing! Next incoming damage reduced by ${roll.total}.${rollResult.critSuccess ? " (Critical!)" : ""}`, rolls: [roll] };
        }
        return { success: false, message: `Crew scrambles but can't get into position in time.` };
      }
    },
    {
      id: "electronicWarfare",
      name: "Electronic Warfare",
      description: "Computers DC 16 — Jam enemy sensors: -2 to their attacks (crit: -4).",
      skill: "computers",
      dc: 16,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.critSuccess) {
          enemyShip.modifiers.attackPenalty = (enemyShip.modifiers.attackPenalty ?? 0) - 4;
          return { success: true, message: `Total sensor blackout on the enemy vessel! They take -4 to all attacks.` };
        } else if (rollResult.success) {
          enemyShip.modifiers.attackPenalty = (enemyShip.modifiers.attackPenalty ?? 0) - 2;
          return { success: true, message: `Electronic countermeasures deployed. Enemy takes -2 to attacks.` };
        }
        return { success: false, message: `ECM burst fails to disrupt enemy targeting.` };
      }
    }
  ],

  // ─── ARCNET OFFICER ────────────────────────────────────────────────────
  arcnet: [
    {
      id: "boostSystem",
      name: "Boost System",
      description: "Arcana DC 14 — Add +1 effective power to a friendly system (crit: +2). Free, no reactor cost.",
      skill: "arcana",
      dc: 14,
      requiresTarget: true,
      targetsFriendly: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const sys = ship.systems[options.targetSystem];
        if (!sys || sys.hp <= 0) return { success: false, message: `Cannot boost a disabled system.` };
        if (rollResult.critSuccess) {
          sys.power = Math.min(sys.maxPower + 2, sys.power + 2); // can exceed normal max!
          return { success: true, message: `ArcNet surge! ${SYSTEMS[options.targetSystem]?.label} boosted by +2 power this round!` };
        } else if (rollResult.success) {
          sys.power = Math.min(sys.maxPower + 1, sys.power + 1);
          return { success: true, message: `ArcNet channels energy into ${SYSTEMS[options.targetSystem]?.label}. +1 power this round.` };
        }
        return { success: false, message: `The ArcNet surge destabilizes before reaching ${SYSTEMS[options.targetSystem]?.label}.` };
      }
    },
    {
      id: "hackSystems",
      name: "Hack Systems",
      description: "Computers DC 18 — Reduce one enemy system's power by 1 (crit: by 2).",
      skill: "computers",
      dc: 18,
      requiresTarget: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const sys = enemyShip.systems[options.targetSystem];
        if (!sys || sys.hp <= 0) return { success: false, message: `Target system is already offline.` };
        if (rollResult.critSuccess) {
          sys.power = Math.max(0, sys.power - 2);
          return { success: true, message: `Full system intrusion! Enemy ${SYSTEMS[options.targetSystem]?.label} loses 2 power!` };
        } else if (rollResult.success) {
          sys.power = Math.max(0, sys.power - 1);
          return { success: true, message: `Hack successful — enemy ${SYSTEMS[options.targetSystem]?.label} loses 1 power.` };
        }
        return { success: false, message: `Enemy firewalls hold. The hack fails.` };
      }
    },
    {
      id: "arcaneBarrier",
      name: "Arcane Barrier",
      description: "Arcana DC 15 — Grant temporary shield points (roll - 10). Crit: double.",
      skill: "arcana",
      dc: 15,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.success) {
          let tempShields = rollResult.total - 10;
          if (rollResult.critSuccess) tempShields *= 2;
          tempShields = Math.max(1, tempShields);
          ship.shields.current = Math.min(ship.shields.max + tempShields, ship.shields.current + tempShields);
          return { success: true, message: `Arcane barrier materializes — ${tempShields} temporary shield points!${rollResult.critSuccess ? " (Critical!)" : ""}` };
        }
        return { success: false, message: `The barrier flickers and collapses before it can stabilize.` };
      }
    },
    {
      id: "countermeasures",
      name: "Countermeasures",
      description: "Computers DC 16 — Remove one active enemy buff or remove a debuff on your ship.",
      skill: "computers",
      dc: 16,
      requiresTarget: false,
      execute: async (state, ship, enemyShip, rollResult) => {
        if (rollResult.success) {
          // Remove a beneficial modifier from the enemy or detrimental from self
          let cleaned = false;
          // Try to clear enemy buffs
          if (enemyShip.modifiers.evasionBonus > 0) { delete enemyShip.modifiers.evasionBonus; cleaned = true; }
          else if (enemyShip.modifiers.attackBonus > 0) { delete enemyShip.modifiers.attackBonus; cleaned = true; }
          // Or clear self debuffs
          else if (ship.modifiers.allPenalty < 0) { delete ship.modifiers.allPenalty; cleaned = true; }
          else if (ship.modifiers.attackPenalty < 0) { delete ship.modifiers.attackPenalty; cleaned = true; }

          if (cleaned) {
            return { success: true, message: `Countermeasures deployed! Neutralized enemy enhancement.` };
          }
          return { success: true, message: `Countermeasures active — no active threats to neutralize, but systems are primed.` };
        }
        return { success: false, message: `Countermeasure protocols fail to engage.` };
      }
    }
  ],

  // ─── ENGINEER ──────────────────────────────────────────────────────────
  engineer: [
    {
      id: "repairSystem",
      name: "Repair System",
      description: "Engineering DC 14 — Restore 1 HP to a damaged system (crit: 2 HP). Also extinguishes fires.",
      skill: "engineering",
      dc: 14,
      requiresTarget: true,
      targetsFriendly: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const sys = ship.systems[options.targetSystem];
        if (!sys) return { success: false, message: "Invalid system target." };
        if (sys.hp >= sys.maxHp && !sys.status.includes("fire")) return { success: false, message: `${SYSTEMS[options.targetSystem]?.label} doesn't need repairs.` };
        if (rollResult.success) {
          const heal = rollResult.critSuccess ? 2 : 1;
          const prevHp = sys.hp;
          sys.hp = Math.min(sys.maxHp, sys.hp + heal);
          const healed = sys.hp - prevHp;

          // Extinguish fire
          let fireMsg = "";
          if (sys.status.includes("fire")) {
            sys.status = sys.status.filter(s => s !== "fire");
            fireMsg = " Fire extinguished!";
          }

          return { success: true, message: `${SYSTEMS[options.targetSystem]?.label} repaired for ${healed} HP.${fireMsg}${rollResult.critSuccess ? " (Critical repair!)" : ""}` };
        }
        return { success: false, message: `Repair attempt on ${SYSTEMS[options.targetSystem]?.label} fails — damage too extensive.` };
      }
    },
    {
      id: "reroutePower",
      name: "Reroute Power",
      description: "No check — freely redistribute all reactor power between systems.",
      skill: null, // no check needed
      dc: null,
      requiresTarget: false,
      autoSuccess: true,
      isPowerReroute: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        // Power rerouting is handled by the UI directly — this just confirms the action
        return { success: true, message: `Power distribution updated. Reactor energy rerouted.` };
      }
    },
    {
      id: "emergencyPatch",
      name: "Emergency Patch",
      description: "Engineering DC 12 — Restore a DISABLED (0 HP) system to 1 HP.",
      skill: "engineering",
      dc: 12,
      requiresTarget: true,
      targetsFriendly: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const sys = ship.systems[options.targetSystem];
        if (!sys) return { success: false, message: "Invalid system target." };
        if (sys.hp > 0) return { success: false, message: `${SYSTEMS[options.targetSystem]?.label} is still operational — use Repair instead.` };
        if (rollResult.success) {
          sys.hp = 1;
          return { success: true, message: `Emergency bypass! ${SYSTEMS[options.targetSystem]?.label} patched to 1 HP and back online!` };
        }
        return { success: false, message: `Can't stabilize ${SYSTEMS[options.targetSystem]?.label} — the damage is too severe for a field patch.` };
      }
    },
    {
      id: "overclock",
      name: "Overclock",
      description: "Engineering DC 18 — Double one system's effective power this round. Fail: 1 damage. Crit fail: 2 damage.",
      skill: "engineering",
      dc: 18,
      requiresTarget: true,
      targetsFriendly: true,
      execute: async (state, ship, enemyShip, rollResult, options) => {
        const sys = ship.systems[options.targetSystem];
        if (!sys || sys.hp <= 0) return { success: false, message: `Cannot overclock a disabled system.` };
        if (rollResult.critSuccess) {
          sys.power = sys.power * 2;
          return { success: true, message: `OVERCLOCK CRITICAL! ${SYSTEMS[options.targetSystem]?.label} running at ${sys.power} power! Incredible efficiency.` };
        } else if (rollResult.success) {
          sys.power = sys.power * 2;
          return { success: true, message: `${SYSTEMS[options.targetSystem]?.label} overclocked to ${sys.power} power! Systems straining but holding.` };
        } else if (rollResult.critFailure) {
          sys.hp = Math.max(0, sys.hp - 2);
          if (sys.hp <= 0) sys.power = 0;
          return { success: false, message: `⚠ OVERCLOCK BACKFIRE! ${SYSTEMS[options.targetSystem]?.label} takes 2 damage from power surge!${sys.hp <= 0 ? " SYSTEM DISABLED!" : ""}` };
        } else {
          sys.hp = Math.max(0, sys.hp - 1);
          if (sys.hp <= 0) sys.power = 0;
          return { success: false, message: `Overclock fails — power surge damages ${SYSTEMS[options.targetSystem]?.label} for 1 HP.${sys.hp <= 0 ? " System disabled!" : ""}` };
        }
      }
    }
  ]
};


// ── Roll Helper ─────────────────────────────────────────────────────────────

/**
 * Perform a skill check roll and return a structured result.
 * @param {number} modifier - The skill modifier to add
 * @param {number|null} dc - The DC to beat (null for attack rolls)
 * @param {number} bonusMod - Additional modifiers (system penalties, etc.)
 */
export async function performRoll(modifier, dc, bonusMod = 0) {
  const roll = await new Roll("1d20").evaluate();
  const natural = roll.total;
  const total = natural + modifier + bonusMod;

  let success = false;
  let critSuccess = false;
  let critFailure = false;

  if (dc !== null) {
    success = total >= dc;
    critSuccess = total >= dc + 10 || natural === 20;
    critFailure = total <= dc - 10 || natural === 1;
    // Nat 20 bumps success up one degree
    if (natural === 20 && !critSuccess) { success = true; critSuccess = success; }
    // Nat 1 bumps down
    if (natural === 1) { critFailure = true; success = false; critSuccess = false; }
  } else {
    // For attack rolls, success is determined by the caller
    success = true; // placeholder
  }

  return {
    roll,
    naturalRoll: natural,
    total,
    modifier,
    bonusMod,
    dc,
    success,
    critSuccess,
    critFailure
  };
}


// ── Chat Message Formatting ─────────────────────────────────────────────────

/**
 * Post a starship combat result to the Foundry chat.
 */
export async function postCombatMessage(roleName, actionName, result, rollResult) {
  const successClass = result.success ? "sc-success" : "sc-failure";
  const rollInfo = rollResult?.roll
    ? `<div class="sc-roll-info">🎲 ${rollResult.naturalRoll} + ${rollResult.modifier}${rollResult.bonusMod ? ` + ${rollResult.bonusMod}` : ""} = ${rollResult.total}${rollResult.dc ? ` vs DC ${rollResult.dc}` : ""}</div>`
    : "";

  const critBadge = rollResult?.critSuccess ? `<span class="sc-crit-badge">★ CRIT ★</span>` :
                    rollResult?.critFailure ? `<span class="sc-critfail-badge">✗ CRIT FAIL</span>` : "";

  const content = `
    <div class="sc-chat-card ${successClass}">
      <div class="sc-chat-header">
        <i class="fas ${ROLES[roleName]?.icon ?? "fa-rocket"}"></i>
        <strong>${ROLES[roleName]?.label ?? roleName}</strong> — ${actionName}
        ${critBadge}
      </div>
      ${rollInfo}
      <div class="sc-chat-result">${result.message.replace(/\n/g, "<br>")}</div>
    </div>
  `;

  await ChatMessage.create({
    content,
    speaker: { alias: "Starship Combat" },
    flags: { "starship-combat-ftl": { isStarshipCombat: true } }
  });
}
