/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Combat UI: Multi-ship ApplicationV2 with full action flow
   ========================================================================== */

import { ROLES, CRITICAL_SYSTEMS, CRIT_CONDITIONS, SHIELD_QUADRANTS, ARCS, WEAPON_TYPES } from "./constants.js";
import { calcAC, calcTL, getTotalShields, getMaxShields } from "./combat-engine.js";
import { CombatManager } from "./combat-manager.js";
import { ACTIONS, getActionsForRole } from "./actions.js";

const MODULE_ID = "starship-combat-ftl";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class StarshipCombatUI extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "starship-combat-ftl-ui",
    tag: "section",
    window: {
      title: "Starship Combat — FTL Edition",
      icon: "fas fa-rocket",
      resizable: true,
      minimizable: true
    },
    position: { width: 1150, height: 850 },
    classes: ["starship-combat-app"],
    actions: {
      addShip: StarshipCombatUI.#onAddShip,
      removeShip: StarshipCombatUI.#onRemoveShip,
      assignCrew: StarshipCombatUI.#onAssignCrew,
      startCombat: StarshipCombatUI.#onStartCombat,
      endRound: StarshipCombatUI.#onEndRound,
      endCombat: StarshipCombatUI.#onEndCombat,
      selectShip: StarshipCombatUI.#onSelectShip,
      selectRole: StarshipCombatUI.#onSelectRole,
      selectCrew: StarshipCombatUI.#onSelectCrew,
      selectAction: StarshipCombatUI.#onSelectAction,
      executeAction: StarshipCombatUI.#onExecuteAction,
      skipTurn: StarshipCombatUI.#onSkipTurn,
      setTargetShip: StarshipCombatUI.#onSetTargetShip,
      setWeapon: StarshipCombatUI.#onSetWeapon,
      setQuadrant: StarshipCombatUI.#onSetQuadrant,
      setSubsystem: StarshipCombatUI.#onSetSubsystem,
      setSkillMod: StarshipCombatUI.#onSetSkillMod,
      clearLog: StarshipCombatUI.#onClearLog
    }
  };

  static PARTS = {
    combat: {
      template: `modules/${MODULE_ID}/templates/combat-ui.hbs`,
      scrollable: [".sc-log-entries", ".sc-ships-scroll"]
    }
  };

  // ── UI State ────────────────────────────────────────────────────────────
  uiState = {
    selectedShipId: null,
    selectedRole: "pilot",
    selectedCrewId: null,
    selectedActionId: null,
    targetShipId: null,
    targetQuadrant: "forward",
    targetedSystem: null,
    weaponIndex: 0,
    skillMod: 0
  };

  get mgr() { return CombatManager.get(); }
  get setupMode() { return !this.mgr.active; }

  // ── Data Preparation ──────────────────────────────────────────────────
  async _prepareContext(options) {
    const mgr = this.mgr;
    const ctx = { setupMode: this.setupMode };

    if (ctx.setupMode) {
      return this.#prepareSetupContext(ctx);
    }
    return this.#prepareCombatContext(ctx);
  }

  #prepareSetupContext(ctx) {
    const mgr = this.mgr;
    ctx.round = 0;
    ctx.statusText = "Setup — Add ships and assign crew";
    ctx.canStart = mgr.ships.size >= 2;

    // All starship actors
    const allStarships = game.actors?.contents.filter(a => a.type === "starship") ?? [];
    const addedIds = new Set(mgr.ships.keys());
    ctx.availableShips = allStarships.map(a => ({
      id: a.id,
      name: a.name,
      img: a.img,
      disposition: a.system?.disposition ?? "enemy",
      added: addedIds.has(a.id)
    }));

    ctx.addedShips = mgr.getAllShips().map(s => ({
      id: s.id, name: s.name, disposition: s.disposition
    }));

    ctx.crewRoles = Object.entries(ROLES).map(([id, r]) => ({
      id, label: r.label, icon: r.icon
    }));

    ctx.pcActors = game.actors?.contents
      .filter(a => a.type === "character" || a.type === "npc")
      .map(a => ({ id: a.id, name: a.name })) ?? [];

    return ctx;
  }

  #prepareCombatContext(ctx) {
    const mgr = this.mgr;
    ctx.round = mgr.round;
    ctx.statusText = `Round ${mgr.round} — Players take actions in any order`;

    // Ships
    ctx.ships = mgr.getAllShips().map(s => {
      const sd = s.shipData;
      return {
        id: s.id,
        name: s.name,
        disposition: s.disposition,
        initiative: s.initiative,
        hull: { ...sd.hull },
        hullPercent: Math.max(0, (sd.hull.current / sd.hull.max) * 100),
        ac: calcAC(sd),
        tl: calcTL(sd),
        shieldsTotal: getTotalShields(sd),
        shieldsMax: getMaxShields(sd),
        shieldPercent: getMaxShields(sd) > 0 ? (getTotalShields(sd) / getMaxShields(sd) * 100) : 0,
        destroyed: sd.hull.current <= 0,
        selected: this.uiState.selectedShipId === s.id
      };
    });

    // Sort by initiative
    const initOrder = mgr.initiativeOrder;
    ctx.ships.sort((a, b) => initOrder.indexOf(a.id) - initOrder.indexOf(b.id));

    // Auto-select first friendly ship if nothing selected
    if (!this.uiState.selectedShipId) {
      const friendly = ctx.ships.find(s => s.disposition === "friendly");
      if (friendly) this.uiState.selectedShipId = friendly.id;
    }

    // Selected ship detail
    const selEntry = mgr.getShip(this.uiState.selectedShipId);
    if (selEntry) {
      const sd = selEntry.shipData;
      ctx.selectedShip = {
        id: selEntry.id,
        name: selEntry.name,
        shields: {
          forward: sd.shields?.forward ?? { current: 0, max: 0 },
          port: sd.shields?.port ?? { current: 0, max: 0 },
          starboard: sd.shields?.starboard ?? { current: 0, max: 0 },
          aft: sd.shields?.aft ?? { current: 0, max: 0 }
        },
        criticals: Object.entries(CRITICAL_SYSTEMS).map(([id, def]) => ({
          id,
          label: def.label,
          icon: def.icon,
          condition: sd.criticals?.[id] ?? "nominal",
          conditionLabel: CRIT_CONDITIONS[sd.criticals?.[id] ?? "nominal"]?.label ?? "Nominal",
          severity: CRIT_CONDITIONS[sd.criticals?.[id] ?? "nominal"]?.severity ?? 0
        })),
        weapons: (sd.weapons ?? []).map((w, i) => ({
          ...w, index: i,
          typeLabel: WEAPON_TYPES[w.type]?.label ?? w.type,
          arcLabel: ARCS[w.arc]?.label ?? w.arc
        }))
      };
    }

    // Tracking projectiles
    ctx.trackingProjectiles = mgr.trackingProjectiles.filter(p => p.active).map(p => ({
      ...p,
      sourceName: mgr.getShip(p.sourceShipId)?.name ?? "???",
      targetName: mgr.getShip(p.targetShipId)?.name ?? "???",
      speedIcon: p.trackingClass === "fast" ? "🚀" : p.trackingClass === "slow" ? "🐢" : "➡️"
    }));

    // Roles
    ctx.roles = Object.entries(ROLES).map(([id, r]) => ({
      id, label: r.label, icon: r.icon,
      active: this.uiState.selectedRole === id
    }));

    // Current role's crew members
    const activeShipId = this.#getActiveShipId();
    ctx.currentRoleCrew = this.#getCrewForCurrentRole(activeShipId);

    // Current role's actions
    const role = this.uiState.selectedRole;
    const roleActions = getActionsForRole(role);
    ctx.currentActions = roleActions.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      shortDesc: a.description.split("—")[1]?.trim() ?? a.description.substring(0, 60),
      selected: this.uiState.selectedActionId === a.id,
      isFreeAction: a.isFreeAction ?? false
    }));

    // Action options
    const selectedDef = roleActions.find(a => a.id === this.uiState.selectedActionId);
    ctx.showOptions = !!selectedDef;
    ctx.showTargetShip = selectedDef?.requiresTarget ?? false;
    ctx.showWeapon = selectedDef?.requiresWeapon ?? false;
    ctx.showQuadrant = (selectedDef?.requiresTarget || selectedDef?.requiresQuadrant) ?? false;
    ctx.showSubsystem = selectedDef?.requiresTarget && !selectedDef?.targetsFriendly;
    ctx.showSystemChoice = selectedDef?.requiresSystemChoice ?? false;
    ctx.skillMod = this.uiState.skillMod;

    // Target options
    if (ctx.showTargetShip) {
      const disposition = selectedDef?.targetType ?? "enemy";
      ctx.targetShips = mgr.getAllShips()
        .filter(s => s.disposition === disposition && s.shipData.hull.current > 0)
        .map(s => ({
          id: s.id, name: s.name,
          selected: this.uiState.targetShipId === s.id
        }));
    }

    // Weapon options
    if (ctx.showWeapon && selEntry) {
      const filterType = selectedDef?.isTracking ? "tracking" : null;
      ctx.weaponOptions = (selEntry.shipData.weapons ?? [])
        .filter(w => !filterType || w.type === filterType)
        .map((w, i) => ({
          index: i, name: w.name, damage: w.damage,
          typeLabel: WEAPON_TYPES[w.type]?.label ?? w.type,
          selected: this.uiState.weaponIndex === i
        }));
    }

    // Subsystem targeting
    const targetEntry = mgr.getShip(this.uiState.targetShipId);
    ctx.canTargetSubsystem = targetEntry ? mgr.isScanned(targetEntry.id) : false;
    if (ctx.showSubsystem && targetEntry) {
      ctx.subsystemOptions = Object.entries(CRITICAL_SYSTEMS).map(([id, def]) => ({
        id, label: def.label,
        condition: CRIT_CONDITIONS[targetEntry.shipData.criticals?.[id] ?? "nominal"]?.label ?? "Nominal"
      }));
    }
    if (ctx.showSystemChoice && selEntry) {
      ctx.ownSubsystems = Object.entries(CRITICAL_SYSTEMS).map(([id, def]) => ({
        id, label: def.label,
        condition: CRIT_CONDITIONS[selEntry.shipData.criticals?.[id] ?? "nominal"]?.label ?? "Nominal"
      }));
    }

    // Execute
    ctx.showExecute = !!selectedDef;
    ctx.selectedActionName = selectedDef?.name ?? "";
    ctx.crewActed = this.uiState.selectedCrewId
      ? mgr.hasCrewActed(activeShipId, this.uiState.selectedCrewId)
      : false;

    // Log
    ctx.log = [...mgr.log].reverse().slice(0, 80);

    return ctx;
  }


  // ── Helpers ─────────────────────────────────────────────────────────────

  #getActiveShipId() {
    // The first friendly ship is the "player ship"
    const friendly = this.mgr.getAllShips().find(s => s.disposition === "friendly");
    return friendly?.id ?? this.uiState.selectedShipId;
  }

  #getCrewForCurrentRole(shipId) {
    if (!shipId) return [];
    const crewIds = this.mgr.getCrewForRole(shipId, this.uiState.selectedRole);
    return crewIds.map(id => {
      const actor = game.actors.get(id);
      return {
        id,
        name: actor?.name ?? "Unknown",
        acted: this.mgr.hasCrewActed(shipId, id),
        selected: this.uiState.selectedCrewId === id
      };
    });
  }


  // ── Action Handlers ─────────────────────────────────────────────────────

  static #onAddShip(event, target) {
    const actorId = target.dataset.actorId;
    const actor = game.actors.get(actorId);
    const disposition = actor?.system?.disposition ?? "enemy";
    this.mgr.addShip(actorId, disposition);
    this.render({ force: true });
  }

  static #onRemoveShip(event, target) {
    this.mgr.removeShip(target.dataset.actorId);
    this.render({ force: true });
  }

  static #onAssignCrew(event, target) {
    const shipId = target.dataset.shipId;
    const role = target.dataset.role;
    const crewId = target.value;
    if (crewId) this.mgr.assignCrew(shipId, role, crewId);
  }

  static async #onStartCombat() {
    const success = await this.mgr.startCombat();
    if (success) this.render({ force: true });
  }

  static async #onEndRound() {
    await this.mgr.endRound();
    this.render({ force: true });
  }

  static async #onEndCombat() {
    const confirmed = await new Promise(resolve => {
      new Dialog({
        title: "End Starship Combat",
        content: "<p>End this combat encounter?</p>",
        buttons: {
          yes: { icon: '<i class="fas fa-check"></i>', label: "End", callback: () => resolve(true) },
          no: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(false) }
        },
        default: "no", close: () => resolve(false)
      }).render(true);
    });
    if (confirmed) {
      await this.mgr.endCombat();
      this.mgr.reset();
      this.uiState = { selectedShipId: null, selectedRole: "pilot", selectedCrewId: null, selectedActionId: null, targetShipId: null, targetQuadrant: "forward", targetedSystem: null, weaponIndex: 0, skillMod: 0 };
      this.render({ force: true });
    }
  }

  static #onSelectShip(event, target) {
    this.uiState.selectedShipId = target.dataset.shipId;
    this.render({ force: true });
  }

  static #onSelectRole(event, target) {
    this.uiState.selectedRole = target.dataset.role;
    this.uiState.selectedActionId = null;
    this.render({ force: true });
  }

  static #onSelectCrew(event, target) {
    this.uiState.selectedCrewId = target.value || null;
  }

  static #onSelectAction(event, target) {
    const id = target.dataset.actionId;
    this.uiState.selectedActionId = this.uiState.selectedActionId === id ? null : id;
    this.render({ force: true });
  }

  static #onSetTargetShip(event, target) { this.uiState.targetShipId = target.value; }
  static #onSetWeapon(event, target) { this.uiState.weaponIndex = parseInt(target.value) || 0; }
  static #onSetQuadrant(event, target) { this.uiState.targetQuadrant = target.value; }
  static #onSetSubsystem(event, target) { this.uiState.targetedSystem = target.value || null; }
  static #onSetSkillMod(event, target) { this.uiState.skillMod = parseInt(target.value) || 0; }
  static #onClearLog() { this.mgr.log = []; this.render({ force: true }); }

  static #onSkipTurn() {
    const shipId = this.#getActiveShipId();
    const crewId = this.uiState.selectedCrewId;
    if (shipId && crewId) {
      this.mgr.skipCrewTurn(shipId, crewId);
      this.uiState.selectedCrewId = null;
      this.render({ force: true });
    } else {
      ui.notifications.warn("Select a crew member to skip.");
    }
  }

  static async #onExecuteAction() {
    const mgr = this.mgr;
    const role = this.uiState.selectedRole;
    const actionId = this.uiState.selectedActionId;
    const crewId = this.uiState.selectedCrewId;
    const shipId = this.#getActiveShipId();

    if (!actionId) return ui.notifications.warn("Select an action.");

    const actionDef = getActionsForRole(role).find(a => a.id === actionId);
    if (!actionDef) return;

    // For non-free actions, require a crew member
    if (!actionDef.isFreeAction && !actionDef.autoSuccess) {
      if (!crewId) return ui.notifications.warn("Select a crew member.");
      if (mgr.hasCrewActed(shipId, crewId)) return ui.notifications.warn("This crew member has already acted.");
    }

    const ship = mgr.getShip(shipId);
    const targetShip = mgr.getShip(this.uiState.targetShipId);
    const crewActor = crewId ? game.actors.get(crewId) : null;
    const weapon = ship?.shipData.weapons?.[this.uiState.weaponIndex];

    // Build context
    const ctx = {
      mgr,
      ship,
      targetShip,
      crewName: crewActor?.name ?? ship?.name ?? "Unknown",
      crewActor,
      skillMod: this.uiState.skillMod,
      weapon,
      targetQuadrant: this.uiState.targetQuadrant,
      targetedSystem: this.uiState.targetedSystem,
      isTargetingSubsystem: !!this.uiState.targetedSystem
    };

    // Execute
    const result = await actionDef.execute(ctx);

    // Mark acted (unless free action)
    if (!actionDef.isFreeAction && crewId) {
      mgr.markCrewActed(shipId, crewId);
    }

    this.uiState.selectedActionId = null;
    this.render({ force: true });
  }


  // ── Render Hook ─────────────────────────────────────────────────────────
  _onRender(context, options) {
    const logEl = this.element.querySelector(".sc-log-entries");
    if (logEl) logEl.scrollTop = logEl.scrollHeight;

    // Wire change events for selects/inputs
    this.element.querySelectorAll("select[data-action], input[data-action]").forEach(el => {
      el.addEventListener("change", (e) => {
        const handler = StarshipCombatUI.DEFAULT_OPTIONS.actions[el.dataset.action];
        if (handler) handler.call(this, e, el);
      });
    });
  }
}
