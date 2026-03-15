/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Combat Manager: Multi-ship combat state, initiative, turn tracking
   ========================================================================== */

import { ROLES, SHIELD_QUADRANTS, CRITICAL_SYSTEMS, MANEUVERABILITY } from "./constants.js";
import { calcAC, calcTL, processTrackingProjectiles, distributeShieldsEvenly, getTotalShields, getMaxShields, getCritPenalties } from "./combat-engine.js";

const MODULE_ID = "starship-combat-ftl";

/**
 * CombatManager is a singleton that holds the entire multi-ship combat state.
 * It is NOT a Foundry Combat — it's a parallel system that manages starship encounters.
 */
export class CombatManager {
  /** @type {CombatManager|null} */
  static instance = null;

  static get() {
    if (!CombatManager.instance) CombatManager.instance = new CombatManager();
    return CombatManager.instance;
  }

  constructor() {
    this.reset();
  }

  reset() {
    /** @type {Map<string, ShipEntry>} keyed by actor ID */
    this.ships = new Map();

    /** @type {string[]} Ship initiative order (actor IDs) */
    this.initiativeOrder = [];

    /** @type {number} Current round number */
    this.round = 0;

    /** @type {boolean} Is combat active? */
    this.active = false;

    /** @type {TrackingProjectile[]} */
    this.trackingProjectiles = [];

    /** @type {string[]} Combat log entries */
    this.log = [];

    /** @type {Map<string, Set<string>>} actorId -> Set of crewActorIds that have acted this round */
    this.actedCrew = new Map();

    /** @type {Map<string, Map<string, string[]>>} shipId -> role -> [crewActorIds] assignments */
    this.crewAssignments = new Map();

    /** @type {Map<string, object>} shipId -> { acBonus, tlBonus, attackBonus, ... } round modifiers */
    this.roundModifiers = new Map();

    /** @type {string} Current ship being acted for (actor ID) */
    this.activeShipId = null;

    /** @type {Set<string>} Ship actor IDs where subsystems have been scanned */
    this.scannedShips = new Set();
  }


  // ── Ship Management ─────────────────────────────────────────────────────

  /**
   * Add a ship to the combat encounter.
   * @param {string} actorId - The Foundry Actor ID
   * @param {"friendly"|"enemy"|"neutral"} disposition
   */
  addShip(actorId, disposition = "enemy") {
    const actor = game.actors.get(actorId);
    if (!actor) return null;

    const entry = {
      id: actorId,
      name: actor.name,
      disposition,
      initiative: 0,
      shipData: this.#extractShipData(actor),
      actorId
    };

    this.ships.set(actorId, entry);
    this.actedCrew.set(actorId, new Set());
    this.crewAssignments.set(actorId, new Map());
    this.roundModifiers.set(actorId, {});
    return entry;
  }

  /**
   * Remove a ship from combat.
   */
  removeShip(actorId) {
    this.ships.delete(actorId);
    this.actedCrew.delete(actorId);
    this.crewAssignments.delete(actorId);
    this.roundModifiers.delete(actorId);
    this.initiativeOrder = this.initiativeOrder.filter(id => id !== actorId);
  }

  /**
   * Extract ship data from an Actor.
   * Reads from the actor's flags or system data.
   */
  #extractShipData(actor) {
    // Check for our custom starship data in flags
    const flagData = actor.getFlag(MODULE_ID, "shipData");
    if (flagData) return foundry.utils.deepClone(flagData);

    // Fallback: build default data from actor
    return this.#buildDefaultShipData(actor);
  }

  /**
   * Build default ship data when no flag data exists.
   */
  #buildDefaultShipData(actor) {
    return {
      name: actor.name,
      tier: 1,
      size: "medium",
      maneuverability: "average",
      speed: 8,
      turnDistance: 2,
      hull: { current: 55, max: 55 },
      hpIncrement: 10,
      dt: 0,
      ct: 11,
      armorBonus: 2,
      armorTlPenalty: 0,
      countermeasuresBonus: 1,
      computerBonus: 1,
      pilotRanks: 5,
      shields: {
        total: 40,
        forward:   { current: 10, max: 10 },
        port:      { current: 10, max: 10 },
        starboard: { current: 10, max: 10 },
        aft:       { current: 10, max: 10 }
      },
      weapons: [],
      criticals: {},
      modifiers: {}
    };
  }

  /**
   * Get a ship entry by actor ID.
   */
  getShip(actorId) {
    return this.ships.get(actorId);
  }

  /**
   * Get all ships as an array.
   */
  getAllShips() {
    return Array.from(this.ships.values());
  }

  /**
   * Get ships by disposition.
   */
  getShipsByDisposition(disposition) {
    return this.getAllShips().filter(s => s.disposition === disposition);
  }

  /**
   * Save ship data back to the actor's flags.
   */
  async saveShipData(actorId) {
    const entry = this.ships.get(actorId);
    if (!entry) return;
    const actor = game.actors.get(actorId);
    if (!actor) return;
    await actor.setFlag(MODULE_ID, "shipData", entry.shipData);
  }

  /**
   * Save all ship data.
   */
  async saveAllShipData() {
    for (const [id] of this.ships) {
      await this.saveShipData(id);
    }
  }


  // ── Crew Assignment ─────────────────────────────────────────────────────

  /**
   * Assign a crew member (PC/NPC actor) to a role on a ship.
   * Multiple crew can fill the same role.
   */
  assignCrew(shipId, role, crewActorId) {
    const assignments = this.crewAssignments.get(shipId);
    if (!assignments) return;
    if (!assignments.has(role)) assignments.set(role, []);
    const roleList = assignments.get(role);
    if (!roleList.includes(crewActorId)) roleList.push(crewActorId);
  }

  /**
   * Remove a crew member from a role.
   */
  unassignCrew(shipId, role, crewActorId) {
    const assignments = this.crewAssignments.get(shipId);
    if (!assignments) return;
    const roleList = assignments.get(role);
    if (roleList) {
      const idx = roleList.indexOf(crewActorId);
      if (idx >= 0) roleList.splice(idx, 1);
    }
  }

  /**
   * Move a crew member to a different role (between turns).
   */
  changeCrew(shipId, crewActorId, fromRole, toRole) {
    this.unassignCrew(shipId, fromRole, crewActorId);
    this.assignCrew(shipId, toRole, crewActorId);
  }

  /**
   * Get crew assigned to a role on a ship.
   */
  getCrewForRole(shipId, role) {
    return this.crewAssignments.get(shipId)?.get(role) ?? [];
  }

  /**
   * Check if a crew member has already acted this round on a specific ship.
   */
  hasCrewActed(shipId, crewActorId) {
    return this.actedCrew.get(shipId)?.has(crewActorId) ?? false;
  }

  /**
   * Mark a crew member as having acted this round.
   */
  markCrewActed(shipId, crewActorId) {
    if (!this.actedCrew.has(shipId)) this.actedCrew.set(shipId, new Set());
    this.actedCrew.get(shipId).add(crewActorId);
  }

  /**
   * Skip a crew member's turn (mark as acted without doing anything).
   */
  skipCrewTurn(shipId, crewActorId) {
    this.markCrewActed(shipId, crewActorId);
    this.log.push(`A crew member aboard ${this.getShip(shipId)?.name ?? "unknown"} skips their turn.`);
  }

  /**
   * Get all crew members on a ship who haven't acted yet.
   */
  getUnactedCrew(shipId) {
    const acted = this.actedCrew.get(shipId) ?? new Set();
    const assignments = this.crewAssignments.get(shipId);
    if (!assignments) return [];

    const unacted = [];
    for (const [role, crewIds] of assignments) {
      for (const crewId of crewIds) {
        if (!acted.has(crewId)) {
          unacted.push({ crewActorId: crewId, role, shipId });
        }
      }
    }
    return unacted;
  }


  // ── Initiative ──────────────────────────────────────────────────────────

  /**
   * Roll initiative for all ships (piloting checks).
   * Returns the order. Higher is better.
   */
  async rollInitiative() {
    const results = [];

    for (const [id, entry] of this.ships) {
      const pilotRanks = entry.shipData.pilotRanks ?? 0;
      const maneuv = MANEUVERABILITY[entry.shipData.maneuverability]?.pilotMod ?? 0;

      // Roll natively via Foundry
      const roll = await new Roll(`1d20 + ${pilotRanks} + ${maneuv}`).evaluate();
      entry.initiative = roll.total;

      // Post to chat
      await roll.toMessage({
        speaker: { alias: entry.name },
        flavor: `<div class="sc-chat-card sc-initiative"><strong>${entry.name}</strong> — Piloting Initiative</div>`
      });

      results.push({ id, name: entry.name, initiative: roll.total });
    }

    // Sort descending
    results.sort((a, b) => b.initiative - a.initiative);
    this.initiativeOrder = results.map(r => r.id);
    return results;
  }


  // ── Combat Flow ─────────────────────────────────────────────────────────

  /**
   * Start combat.
   */
  async startCombat() {
    if (this.ships.size < 2) {
      ui.notifications.warn("Need at least 2 ships to start combat.");
      return false;
    }

    this.active = true;
    this.round = 1;
    this.log.push("═══ STARSHIP COMBAT INITIATED ═══");

    // Roll initiative
    const initResults = await this.rollInitiative();
    this.log.push(`Initiative order: ${initResults.map(r => r.name).join(" → ")}`);
    this.log.push(`── Round ${this.round} ──`);

    return true;
  }

  /**
   * End the current round and start a new one.
   * Processes end-of-round effects: tracking projectiles, modifiers reset, etc.
   */
  async endRound() {
    // Process tracking projectiles
    const projReports = processTrackingProjectiles(
      this.trackingProjectiles,
      this.getAllShips(),
      this.round
    );

    for (const report of projReports) {
      this.log.push(`🚀 Tracking projectile (${report.projectile.weaponName}) approaching ${report.targetShip.name}...`);
      // Mark for resolution in the next gunnery phase or auto-resolve
    }

    // Clear round modifiers
    for (const [id, entry] of this.ships) {
      entry.shipData.modifiers = {};
      this.roundModifiers.set(id, {});
    }

    // Reset acted crew
    for (const [id] of this.actedCrew) {
      this.actedCrew.set(id, new Set());
    }

    // Clean up inactive projectiles
    this.trackingProjectiles = this.trackingProjectiles.filter(p => p.active);

    // Advance round
    this.round++;
    this.log.push(`── Round ${this.round} ──`);

    // Re-roll initiative
    await this.rollInitiative();
  }

  /**
   * End combat entirely.
   */
  async endCombat() {
    this.log.push("═══ STARSHIP COMBAT ENDED ═══");
    await this.saveAllShipData();
    this.active = false;
  }


  // ── Scanning ────────────────────────────────────────────────────────────

  /**
   * Mark a ship as scanned (subsystems visible).
   */
  markScanned(shipId) {
    this.scannedShips.add(shipId);
  }

  /**
   * Check if a ship's subsystems are visible (has been scanned).
   */
  isScanned(shipId) {
    return this.scannedShips.has(shipId);
  }


  // ── Round Modifiers ─────────────────────────────────────────────────────

  /**
   * Apply a modifier to a ship for this round.
   */
  applyModifier(shipId, key, value) {
    const entry = this.ships.get(shipId);
    if (!entry) return;
    if (!entry.shipData.modifiers) entry.shipData.modifiers = {};
    entry.shipData.modifiers[key] = (entry.shipData.modifiers[key] ?? 0) + value;
  }

  /**
   * Get a modifier value for a ship.
   */
  getModifier(shipId, key) {
    return this.ships.get(shipId)?.shipData?.modifiers?.[key] ?? 0;
  }


  // ── Combat Utilities ────────────────────────────────────────────────────

  /**
   * Check if all crew on all friendly ships have acted.
   */
  allFriendlyCrewActed() {
    for (const [id, entry] of this.ships) {
      if (entry.disposition === "friendly") {
        const unacted = this.getUnactedCrew(id);
        if (unacted.length > 0) return false;
      }
    }
    return true;
  }

  /**
   * Get a summary of the current state for the UI.
   */
  getStateSummary() {
    return {
      active: this.active,
      round: this.round,
      ships: this.getAllShips().map(s => ({
        id: s.id,
        name: s.name,
        disposition: s.disposition,
        initiative: s.initiative,
        hull: { ...s.shipData.hull },
        shieldsTotal: getTotalShields(s.shipData),
        shieldsMax: getMaxShields(s.shipData),
        ac: calcAC(s.shipData),
        tl: calcTL(s.shipData),
        destroyed: s.shipData.hull.current <= 0,
        scanned: this.isScanned(s.id)
      })),
      initiativeOrder: this.initiativeOrder,
      projectileCount: this.trackingProjectiles.filter(p => p.active).length,
      log: this.log
    };
  }
}
