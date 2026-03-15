/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Actions: All 5 roles with native Foundry rolls
   ========================================================================== */

import { ROLES, CRITICAL_SYSTEMS, SHIELD_QUADRANTS, MANEUVERABILITY } from "./constants.js";
import { calcAC, calcTL, calcGunneryMod, applyDamage, createTrackingProjectile, getCritPenalties } from "./combat-engine.js";
import { CombatManager } from "./combat-manager.js";

// ── Native Foundry Roll Helper ──────────────────────────────────────────────

/**
 * Perform a roll using Foundry's native Roll system, posting to chat.
 */
async function rollCheck(formula, flavorHtml, speaker) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({
    speaker: speaker ?? { alias: "Starship Combat" },
    flavor: flavorHtml
  });
  return roll;
}


// ── Action Definitions ──────────────────────────────────────────────────────

export const ACTIONS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // PILOT
  // ═══════════════════════════════════════════════════════════════════════════
  pilot: [
    {
      id: "move",
      name: "Move",
      description: "Move up to the ship's speed. This is a free action — does not consume your turn.",
      isFreeAction: true,
      skill: "piloting",
      requiresTarget: false,
      execute: async (ctx) => {
        const speed = ctx.ship.shipData.speed;
        const critPen = getCritPenalties(ctx.ship.shipData);
        const effectiveSpeed = Math.max(0, speed + critPen.speed);
        ctx.mgr.log.push(`[${ctx.ship.name}] Pilot moves up to ${effectiveSpeed} hexes.`);
        await ChatMessage.create({
          content: `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> moves up to <strong>${effectiveSpeed} hexes</strong>.</div>`,
          speaker: { alias: ctx.ship.name }
        });
        return { success: true, freeAction: true, message: `Moves up to ${effectiveSpeed} hexes.` };
      }
    },
    {
      id: "hitTheThrusters",
      name: "Hit the Thrusters",
      description: "Piloting check — Double the ship's movement speed for 1 turn.",
      skill: "piloting",
      requiresTarget: false,
      execute: async (ctx) => {
        const dc = 10 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Hit the Thrusters (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const speed = ctx.ship.shipData.speed;
          const doubled = speed * 2;
          ctx.mgr.log.push(`[${ctx.ship.name}] Thrusters engaged! Speed doubled to ${doubled} for this round.`);
          return { success: true, message: `Speed doubled to ${doubled} this round.` };
        }
        return { success: false, message: `Failed to push the engines harder.` };
      }
    },
    {
      id: "commandComputer",
      name: "Command Computer",
      description: "Task the ship's computer to perform 1 action from a different role. Uses the computer's stats.",
      skill: "computers",
      requiresTarget: false,
      isCommandComputer: true,
      execute: async (ctx) => {
        // This is resolved via a secondary action selection in the UI
        // The computer's bonus is used instead of a crew member's
        const computerBonus = ctx.ship.shipData.computerBonus ?? 0;
        ctx.mgr.log.push(`[${ctx.ship.name}] Ship computer tasked with ${ctx.subAction?.name ?? "an action"} (bonus: +${computerBonus}).`);
        return { success: true, message: `Computer executing: ${ctx.subAction?.name ?? "unknown action"}.`, computerAction: true, computerBonus };
      }
    },
    {
      id: "evade",
      name: "Evade",
      description: "Piloting check — Gain +2 AC and +2 TL until next round. Fail by 10+: -2 AC and -2 TL.",
      skill: "piloting",
      requiresTarget: false,
      execute: async (ctx) => {
        const dc = 10 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Evade (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          ctx.mgr.applyModifier(ctx.ship.id, "acBonus", 2);
          ctx.mgr.applyModifier(ctx.ship.id, "tlBonus", 2);
          ctx.mgr.log.push(`[${ctx.ship.name}] Evasive maneuvers! +2 AC and +2 TL this round.`);
          return { success: true, message: `+2 AC and +2 TL until next round.` };
        } else if (roll.total <= dc - 10) {
          ctx.mgr.applyModifier(ctx.ship.id, "acBonus", -2);
          ctx.mgr.applyModifier(ctx.ship.id, "tlBonus", -2);
          ctx.mgr.log.push(`[${ctx.ship.name}] Evasion failed badly! -2 AC and -2 TL.`);
          return { success: false, message: `Critical failure! -2 AC and -2 TL.` };
        }
        ctx.mgr.log.push(`[${ctx.ship.name}] Evasion failed. No effect.`);
        return { success: false, message: `Evasion attempt fails.` };
      }
    },
    {
      id: "ram",
      name: "Ram",
      description: "Piloting check — Ram another ship. Deals damage to both, but more to the target.",
      skill: "piloting",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const dc = 10 + Math.floor(1.5 * (ctx.targetShip.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — RAMMING SPEED at ${ctx.targetShip.name}! (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const tier = ctx.ship.shipData.tier ?? 1;
          const enemyDmgRoll = await rollCheck(
            `${tier + 2}d6`, `<div class="sc-chat-card">Ram damage to ${ctx.targetShip.name}</div>`, { alias: ctx.ship.name }
          );
          const selfDmgRoll = await rollCheck(
            `${Math.ceil(tier / 2) + 1}d6`, `<div class="sc-chat-card">Self-damage from ramming</div>`, { alias: ctx.ship.name }
          );

          const enemyReport = applyDamage(ctx.targetShip.shipData, enemyDmgRoll.total, "forward");
          const selfReport = applyDamage(ctx.ship.shipData, selfDmgRoll.total, "forward");

          let msg = `RAM! ${ctx.targetShip.name} takes ${enemyDmgRoll.total} damage. ${ctx.ship.name} takes ${selfDmgRoll.total} self-damage.`;
          if (enemyReport.shipDestroyed) msg += ` 💀 ${ctx.targetShip.name} DESTROYED!`;
          ctx.mgr.log.push(`[${ctx.ship.name}] ${msg}`);
          return { success: true, message: msg };
        }
        ctx.mgr.log.push(`[${ctx.ship.name}] Ram attempt misses.`);
        return { success: false, message: `Ram attempt fails.` };
      }
    },
    {
      id: "barrelRoll",
      name: "Barrel Roll",
      description: "Piloting check — Gain +TL bonus to avoid tracking weapons. Fail by 10+: -TL.",
      skill: "piloting",
      requiresTarget: false,
      execute: async (ctx) => {
        const dc = 10 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Barrel Roll (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const bonus = 2;
          ctx.mgr.applyModifier(ctx.ship.id, "tlBonus", bonus);
          ctx.mgr.log.push(`[${ctx.ship.name}] Barrel roll! +${bonus} TL vs tracking weapons.`);
          return { success: true, message: `+${bonus} TL against tracking weapons this round.` };
        } else if (roll.total <= dc - 10) {
          ctx.mgr.applyModifier(ctx.ship.id, "tlBonus", -2);
          ctx.mgr.log.push(`[${ctx.ship.name}] Barrel roll failed badly! -2 TL.`);
          return { success: false, message: `Failed! -2 TL this round.` };
        }
        return { success: false, message: `Barrel roll has no effect.` };
      }
    },
    {
      id: "lineUpTheShot",
      name: "Line Up the Shot",
      description: "Sacrifice defense for offense. -2 AC, -2 TL, but all attacks this turn roll twice and take the better result.",
      skill: null,
      requiresTarget: false,
      autoSuccess: true,
      execute: async (ctx) => {
        ctx.mgr.applyModifier(ctx.ship.id, "acBonus", -2);
        ctx.mgr.applyModifier(ctx.ship.id, "tlBonus", -2);
        ctx.mgr.applyModifier(ctx.ship.id, "attackAdvantage", 1);
        ctx.mgr.log.push(`[${ctx.ship.name}] Lining up the shot. -2 AC, -2 TL, but attacks have advantage.`);
        await ChatMessage.create({
          content: `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> lines up the shot — <em>-2 AC, -2 TL, attacks have advantage this round.</em></div>`,
          speaker: { alias: ctx.crewName }
        });
        return { success: true, message: `-2 AC, -2 TL. Attacks have advantage.` };
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // GUNNER
  // ═══════════════════════════════════════════════════════════════════════════
  gunner: [
    {
      id: "fireDirectWeapon",
      name: "Fire Direct Weapon",
      description: "Gunnery check vs target's AC — Fire a direct-fire weapon.",
      skill: "gunnery",
      requiresTarget: true,
      requiresWeapon: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const weapon = ctx.weapon;
        if (!weapon) return { success: false, message: "No weapon selected." };

        const targetAC = calcAC(ctx.targetShip.shipData);
        const hasAdvantage = ctx.mgr.getModifier(ctx.ship.id, "attackAdvantage") > 0;
        const computerBonus = ctx.ship.shipData.computerBonus ?? 0;
        const formula = `1d20 + ${ctx.skillMod} + ${computerBonus}`;

        let roll;
        if (hasAdvantage) {
          const r1 = await new Roll(formula).evaluate();
          const r2 = await new Roll(formula).evaluate();
          roll = r1.total >= r2.total ? r1 : r2;
          await roll.toMessage({
            speaker: { alias: ctx.crewName },
            flavor: `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> fires ${weapon.name} at ${ctx.targetShip.name} (AC ${targetAC}) — <em>Advantage: ${r1.total} / ${r2.total}</em></div>`
          });
        } else {
          roll = await rollCheck(formula,
            `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> fires ${weapon.name} at ${ctx.targetShip.name} (AC ${targetAC})</div>`,
            { alias: ctx.crewName }
          );
        }

        if (roll.total >= targetAC) {
          const dmgRoll = await rollCheck(weapon.damage,
            `<div class="sc-chat-card">${weapon.name} damage</div>`,
            { alias: ctx.ship.name }
          );
          const quadrant = ctx.targetQuadrant ?? "forward";
          const isTargeted = ctx.isTargetingSubsystem && ctx.mgr.isScanned(ctx.targetShip.id);
          const targetedSys = isTargeted ? ctx.targetedSystem : null;

          const report = applyDamage(ctx.targetShip.shipData, dmgRoll.total, quadrant, targetedSys, isTargeted);

          let msg = `${weapon.name} HITS ${ctx.targetShip.name} for ${dmgRoll.total} damage`;
          if (report.shieldAbsorbed > 0) msg += ` (${report.shieldAbsorbed} absorbed by ${quadrant} shields)`;
          if (report.hullDamage > 0) msg += `. ${report.hullDamage} hull damage`;
          if (report.belowDT) msg += `. Below damage threshold — no effect`;
          if (report.criticalTriggered) msg += `. ⚠ CRITICAL: ${CRITICAL_SYSTEMS[report.criticalSystem]?.label} now ${report.criticalCondition}!`;
          if (report.subsystemHit) msg += `. Stray hit damages ${CRITICAL_SYSTEMS[report.subsystemHit]?.label}!`;
          if (report.shipDestroyed) msg += `. 💀 ${ctx.targetShip.name} DESTROYED!`;
          ctx.mgr.log.push(`[${ctx.ship.name}] ${msg}`);
          return { success: true, message: msg, hit: true };
        }

        ctx.mgr.log.push(`[${ctx.ship.name}] ${weapon.name} MISSES ${ctx.targetShip.name}. (${roll.total} vs AC ${targetAC})`);
        return { success: false, message: `${weapon.name} misses. (${roll.total} vs AC ${targetAC})`, hit: false };
      }
    },
    {
      id: "fireTrackingWeapon",
      name: "Fire Tracking Weapon",
      description: "Gunnery check vs target's TL — Launch a tracking projectile (missile/torpedo).",
      skill: "gunnery",
      requiresTarget: true,
      requiresWeapon: true,
      targetType: "enemy",
      isTracking: true,
      execute: async (ctx) => {
        const weapon = ctx.weapon;
        if (!weapon || weapon.type !== "tracking") return { success: false, message: "Select a tracking weapon." };

        const targetTL = calcTL(ctx.targetShip.shipData);
        const computerBonus = ctx.ship.shipData.computerBonus ?? 0;
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod} + ${computerBonus}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> launches ${weapon.name} at ${ctx.targetShip.name} (TL ${targetTL})</div>`,
          { alias: ctx.crewName }
        );

        if (roll.total >= targetTL) {
          // Create tracking projectile
          const proj = createTrackingProjectile(
            ctx.ship.id, ctx.targetShip.id, weapon, ctx.skillMod, ctx.mgr.round
          );
          ctx.mgr.trackingProjectiles.push(proj);

          const msg = `${weapon.name} launched! Tracking (${proj.trackingClass}) — arrives in ${proj.turnsRemaining} turn(s).`;
          ctx.mgr.log.push(`[${ctx.ship.name}] ${msg}`);
          return { success: true, message: msg };
        }

        ctx.mgr.log.push(`[${ctx.ship.name}] ${weapon.name} fails to lock. (${roll.total} vs TL ${targetTL})`);
        return { success: false, message: `Failed to achieve target lock. (${roll.total} vs TL ${targetTL})` };
      }
    },
    {
      id: "broadside",
      name: "Broadside",
      description: "Fire ALL direct-fire weapons at -2 penalty each. All at the same target.",
      skill: "gunnery",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const weapons = ctx.ship.shipData.weapons.filter(w => w.type === "directFire");
        if (weapons.length === 0) return { success: false, message: "No direct-fire weapons." };

        const targetAC = calcAC(ctx.targetShip.shipData);
        const computerBonus = ctx.ship.shipData.computerBonus ?? 0;
        const results = [];

        for (const weapon of weapons) {
          const roll = await rollCheck(
            `1d20 + ${ctx.skillMod} + ${computerBonus} - 2`,
            `<div class="sc-chat-card">Broadside: ${weapon.name} at ${ctx.targetShip.name} (AC ${targetAC})</div>`,
            { alias: ctx.crewName }
          );
          if (roll.total >= targetAC) {
            const dmgRoll = await rollCheck(weapon.damage, `<div class="sc-chat-card">${weapon.name} damage</div>`, { alias: ctx.ship.name });
            const report = applyDamage(ctx.targetShip.shipData, dmgRoll.total, ctx.targetQuadrant ?? "forward");
            results.push(`${weapon.name}: HIT for ${dmgRoll.total}`);
          } else {
            results.push(`${weapon.name}: MISS (${roll.total})`);
          }
        }

        const msg = `BROADSIDE!\n` + results.join("\n");
        ctx.mgr.log.push(`[${ctx.ship.name}] ${msg}`);
        return { success: true, message: msg };
      }
    },
    {
      id: "suppressiveFire",
      name: "Suppressive Fire",
      description: "Gunnery check — Enemy ship takes -2 to all gunnery checks this round.",
      skill: "gunnery",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Suppressive Fire at ${ctx.targetShip.name} (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          ctx.mgr.applyModifier(ctx.targetShip.id, "attackBonus", -2);
          ctx.mgr.log.push(`[${ctx.ship.name}] Suppressive fire pins ${ctx.targetShip.name}! -2 to their gunnery.`);
          return { success: true, message: `${ctx.targetShip.name} takes -2 to gunnery checks this round.` };
        }
        return { success: false, message: `Suppressive fire fails.` };
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  security: [
    {
      id: "scan",
      name: "Scan",
      description: "Computers check — Reveal enemy ship info. Each 5 over DC reveals more.",
      skill: "computers",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const dc = 5 + Math.floor(1.5 * (ctx.targetShip.shipData.tier ?? 1)) + (ctx.targetShip.shipData.countermeasuresBonus ?? 0);
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Scan ${ctx.targetShip.name} (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        const margin = roll.total - dc;
        if (margin >= 0) {
          ctx.mgr.markScanned(ctx.targetShip.id);
          let info = [`Basic info revealed. Subsystems now targetable.`];
          if (margin >= 5) info.push(`Defenses: AC ${calcAC(ctx.targetShip.shipData)}, TL ${calcTL(ctx.targetShip.shipData)}, Hull ${ctx.targetShip.shipData.hull.current}/${ctx.targetShip.shipData.hull.max}`);
          if (margin >= 10) info.push(`Weapon systems revealed.`);
          if (margin >= 15) info.push(`Full ship manifest revealed.`);
          const msg = info.join(" ");
          ctx.mgr.log.push(`[${ctx.ship.name}] Scan: ${msg}`);
          return { success: true, message: msg };
        }
        return { success: false, message: `Scan fails to penetrate countermeasures.` };
      }
    },
    {
      id: "launchBoarding",
      name: "Launch Boarding Party",
      description: "Athletics check — Send a boarding team to disable a system. Must be adjacent.",
      skill: "athletics",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.targetShip.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Boarding Party at ${ctx.targetShip.name} (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          // Escalate a random (or targeted if scanned) system's crit condition
          const systems = Object.keys(CRITICAL_SYSTEMS);
          const target = ctx.targetedSystem && ctx.mgr.isScanned(ctx.targetShip.id)
            ? ctx.targetedSystem
            : systems[Math.floor(Math.random() * systems.length)];

          const { escalateCritCondition } = await import("./combat-engine.js");
          const newCond = escalateCritCondition(ctx.targetShip.shipData, target);
          const msg = `Boarding party hits ${CRITICAL_SYSTEMS[target]?.label}! Now: ${newCond}.`;
          ctx.mgr.log.push(`[${ctx.ship.name}] ${msg}`);
          return { success: true, message: msg };
        }
        return { success: false, message: `Boarding party repelled!` };
      }
    },
    {
      id: "braceForImpact",
      name: "Brace for Impact",
      description: "Boost shields in one quadrant by redistributing points from others.",
      skill: null,
      requiresTarget: false,
      autoSuccess: true,
      requiresQuadrant: true,
      execute: async (ctx) => {
        const q = ctx.targetQuadrant ?? "forward";
        const shields = ctx.ship.shipData.shields;
        // Move 25% from other quadrants to the target quadrant
        let bonus = 0;
        for (const oq of SHIELD_QUADRANTS) {
          if (oq === q) continue;
          const transfer = Math.floor(shields[oq].current * 0.25);
          shields[oq].current -= transfer;
          bonus += transfer;
        }
        shields[q].current = Math.min(shields[q].max + bonus, shields[q].current + bonus);
        ctx.mgr.log.push(`[${ctx.ship.name}] Bracing! +${bonus} SP to ${q} shields.`);
        await ChatMessage.create({
          content: `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> braces for impact — <strong>+${bonus} SP</strong> to ${q} shields.</div>`,
          speaker: { alias: ctx.crewName }
        });
        return { success: true, message: `+${bonus} SP to ${q} shields.` };
      }
    },
    {
      id: "electronicWarfare",
      name: "Electronic Warfare",
      description: "Computers check — Jam enemy sensors, reducing their gunnery checks.",
      skill: "computers",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.targetShip.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Electronic Warfare vs ${ctx.targetShip.name} (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          ctx.mgr.applyModifier(ctx.targetShip.id, "attackBonus", -2);
          ctx.mgr.log.push(`[${ctx.ship.name}] ECM deployed! ${ctx.targetShip.name} takes -2 gunnery.`);
          return { success: true, message: `${ctx.targetShip.name} takes -2 to gunnery.` };
        }
        return { success: false, message: `ECM fails.` };
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCNET OFFICER
  // ═══════════════════════════════════════════════════════════════════════════
  arcnet: [
    {
      id: "boostShields",
      name: "Boost Shields",
      description: "Mysticism check — Restore shield points to a quadrant.",
      skill: "mysticism",
      requiresTarget: false,
      requiresQuadrant: true,
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Arcane Shield Boost (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const q = ctx.targetQuadrant ?? "forward";
          const restored = Math.max(1, roll.total - dc + 2);
          const shields = ctx.ship.shipData.shields;
          shields[q].current = Math.min(shields[q].max, shields[q].current + restored);
          ctx.mgr.log.push(`[${ctx.ship.name}] ArcNet restores ${restored} SP to ${q} shields.`);
          return { success: true, message: `+${restored} SP to ${q} shields.` };
        }
        return { success: false, message: `Shield boost fails.` };
      }
    },
    {
      id: "hackSystems",
      name: "Hack Systems",
      description: "Computers check — Interfere with an enemy system, causing it to glitch.",
      skill: "computers",
      requiresTarget: true,
      targetType: "enemy",
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.targetShip.shipData.tier ?? 1)) + (ctx.targetShip.shipData.countermeasuresBonus ?? 0);
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Hack ${ctx.targetShip.name} systems (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const systems = Object.keys(CRITICAL_SYSTEMS);
          const target = ctx.targetedSystem && ctx.mgr.isScanned(ctx.targetShip.id)
            ? ctx.targetedSystem
            : systems[Math.floor(Math.random() * systems.length)];
          const { escalateCritCondition } = await import("./combat-engine.js");
          const newCond = escalateCritCondition(ctx.targetShip.shipData, target);
          ctx.mgr.log.push(`[${ctx.ship.name}] Hack success! ${ctx.targetShip.name}'s ${CRITICAL_SYSTEMS[target]?.label} → ${newCond}.`);
          return { success: true, message: `${CRITICAL_SYSTEMS[target]?.label} hacked to ${newCond}!` };
        }
        return { success: false, message: `Hack fails.` };
      }
    },
    {
      id: "improveCountermeasures",
      name: "Improve Countermeasures",
      description: "Mysticism check — Boost TL against incoming tracking weapons.",
      skill: "mysticism",
      requiresTarget: false,
      execute: async (ctx) => {
        const dc = 12 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Improve Countermeasures (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          ctx.mgr.applyModifier(ctx.ship.id, "tlBonus", 2);
          ctx.mgr.log.push(`[${ctx.ship.name}] Countermeasures improved! +2 TL.`);
          return { success: true, message: `+2 TL this round.` };
        }
        return { success: false, message: `Countermeasure enhancement fails.` };
      }
    },
    {
      id: "mysticHaze",
      name: "Mystic Haze",
      description: "Mysticism check — Project a haze that grants +1 AC to your ship.",
      skill: "mysticism",
      requiresTarget: false,
      execute: async (ctx) => {
        const dc = 12 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Mystic Haze (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          ctx.mgr.applyModifier(ctx.ship.id, "acBonus", 1);
          ctx.mgr.log.push(`[${ctx.ship.name}] Mystic haze deployed! +1 AC.`);
          return { success: true, message: `+1 AC this round.` };
        }
        return { success: false, message: `Haze fails to coalesce.` };
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINEER
  // ═══════════════════════════════════════════════════════════════════════════
  engineer: [
    {
      id: "divertPower",
      name: "Divert Power",
      description: "Engineering check — Boost one ship system (shields, engines, or weapons).",
      skill: "engineering",
      requiresTarget: false,
      requiresSystemChoice: true,
      execute: async (ctx) => {
        const dc = 10 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Divert Power (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const target = ctx.targetedSystem ?? "engines";
          let msg;
          switch (target) {
            case "engines":
              ctx.ship.shipData.speed += 2;
              msg = `Power diverted to engines. +2 speed this round.`;
              break;
            case "weaponsArray":
              ctx.mgr.applyModifier(ctx.ship.id, "attackBonus", 2);
              msg = `Power diverted to weapons. +2 gunnery this round.`;
              break;
            case "sensors":
              ctx.mgr.applyModifier(ctx.ship.id, "sensorBonus", 2);
              msg = `Power diverted to sensors. +2 to scan checks.`;
              break;
            default:
              // Shields - restore 5% of max per quadrant
              const shields = ctx.ship.shipData.shields;
              for (const q of SHIELD_QUADRANTS) {
                const restore = Math.ceil(shields[q].max * 0.1);
                shields[q].current = Math.min(shields[q].max, shields[q].current + restore);
              }
              msg = `Power diverted to shields. Shield points restored.`;
          }
          ctx.mgr.log.push(`[${ctx.ship.name}] ${msg}`);
          return { success: true, message: msg };
        }
        return { success: false, message: `Failed to divert power.` };
      }
    },
    {
      id: "patchSystem",
      name: "Patch System",
      description: "Engineering check — Reduce a critical damage condition by one step.",
      skill: "engineering",
      requiresTarget: false,
      requiresSystemChoice: true,
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Patch System (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          const target = ctx.targetedSystem ?? "engines";
          const crit = ctx.ship.shipData.criticals?.[target];
          if (!crit || crit === "nominal") return { success: true, message: `${CRITICAL_SYSTEMS[target]?.label} is already nominal.` };

          const order = ["nominal", "glitching", "malfunctioning", "wrecked"];
          const idx = order.indexOf(crit);
          const newCond = order[Math.max(0, idx - 1)];
          ctx.ship.shipData.criticals[target] = newCond;
          ctx.mgr.log.push(`[${ctx.ship.name}] Patched ${CRITICAL_SYSTEMS[target]?.label}: ${crit} → ${newCond}.`);
          return { success: true, message: `${CRITICAL_SYSTEMS[target]?.label}: ${crit} → ${newCond}.` };
        }
        return { success: false, message: `Patch attempt fails.` };
      }
    },
    {
      id: "holdItTogether",
      name: "Hold It Together",
      description: "Engineering check — Treat one system's crit as one step less severe this round.",
      skill: "engineering",
      requiresTarget: false,
      requiresSystemChoice: true,
      execute: async (ctx) => {
        const dc = 15 + Math.floor(1.5 * (ctx.ship.shipData.tier ?? 1));
        const roll = await rollCheck(
          `1d20 + ${ctx.skillMod}`,
          `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> — Hold It Together (DC ${dc})</div>`,
          { alias: ctx.crewName }
        );
        if (roll.total >= dc) {
          // Temporarily reduce crit severity (for this round, via modifier)
          const target = ctx.targetedSystem ?? "engines";
          ctx.mgr.applyModifier(ctx.ship.id, `critReduce_${target}`, 1);
          ctx.mgr.log.push(`[${ctx.ship.name}] Holding ${CRITICAL_SYSTEMS[target]?.label} together this round.`);
          return { success: true, message: `${CRITICAL_SYSTEMS[target]?.label} treated as one step less severe.` };
        }
        return { success: false, message: `Can't stabilize the system.` };
      }
    },
    {
      id: "balanceShields",
      name: "Balance Shields",
      description: "Redistribute shield points evenly across all quadrants. No check needed.",
      skill: null,
      requiresTarget: false,
      autoSuccess: true,
      execute: async (ctx) => {
        const shields = ctx.ship.shipData.shields;
        let total = 0;
        for (const q of SHIELD_QUADRANTS) total += shields[q].current;
        const per = Math.floor(total / 4);
        const rem = total % 4;
        const quads = [...SHIELD_QUADRANTS];
        for (let i = 0; i < quads.length; i++) {
          shields[quads[i]].current = per + (i < rem ? 1 : 0);
        }
        ctx.mgr.log.push(`[${ctx.ship.name}] Shields balanced: ${per} SP per quadrant.`);
        await ChatMessage.create({
          content: `<div class="sc-chat-card"><strong>${ctx.ship.name}</strong> balances shields — <strong>${per} SP</strong> per quadrant.</div>`,
          speaker: { alias: ctx.crewName }
        });
        return { success: true, message: `Shields balanced to ${per} SP each.` };
      }
    }
  ]
};

/**
 * Get all actions for a role.
 */
export function getActionsForRole(role) {
  return ACTIONS[role] ?? [];
}
