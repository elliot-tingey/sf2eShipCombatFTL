/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION
   Combat UI: Foundry v13 ApplicationV2 with HandlebarsApplicationMixin
   ========================================================================== */

import {
  SYSTEMS, SYSTEM_IDS, ROLES, PHASES, WEAPON_TYPES, RANGES, RANGE_LABELS,
  SHIP_TEMPLATES, createShip, createCombatState, advancePhase, getCurrentPhase,
  getEffectivePower, getEffectiveMaxPower, getSystemPenalty, getSystemStatusLabel,
  getUsedPower, getFreePower, setPower, getShipAC, getSensorBonus, applyDamage
} from "./combat-engine.js";

import { ACTIONS, performRoll, postCombatMessage } from "./actions.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class StarshipCombatUI extends HandlebarsApplicationMixin(ApplicationV2) {

  // ── Static Configuration ────────────────────────────────────────────────
  static DEFAULT_OPTIONS = {
    id: "starship-combat-ftl",
    tag: "section",
    window: {
      title: "Starship Combat — FTL Edition",
      icon: "fas fa-rocket",
      resizable: true,
      minimizable: true
    },
    position: {
      width: 1120,
      height: 800
    },
    classes: ["starship-combat-app"],
    actions: {
      selectPlayerShip: StarshipCombatUI.#onSelectPlayerShip,
      selectEnemyShip: StarshipCombatUI.#onSelectEnemyShip,
      assignCrew: StarshipCombatUI.#onAssignCrew,
      startCombat: StarshipCombatUI.#onStartCombat,
      advancePhase: StarshipCombatUI.#onAdvancePhase,
      endCombat: StarshipCombatUI.#onEndCombat,
      selectRole: StarshipCombatUI.#onSelectRole,
      selectAction: StarshipCombatUI.#onSelectAction,
      executeAction: StarshipCombatUI.#onExecuteAction,
      adjustPower: StarshipCombatUI.#onAdjustPower,
      setTarget: StarshipCombatUI.#onSetTarget,
      setWeapon: StarshipCombatUI.#onSetWeapon,
      setRange: StarshipCombatUI.#onSetRange,
      setSkillMod: StarshipCombatUI.#onSetSkillMod,
      clearLog: StarshipCombatUI.#onClearLog,
      gmDamage: StarshipCombatUI.#onGmDamage,
      gmEnemyAttack: StarshipCombatUI.#onGmEnemyAttack,
      noOp: () => {}
    }
  };

  static PARTS = {
    combat: {
      template: "modules/starship-combat-ftl/templates/combat-ui.hbs",
      scrollable: [".sc-log-entries"]
    }
  };

  // ── Instance State ──────────────────────────────────────────────────────

  /** @type {object|null} Combat state from combat-engine */
  combatState = null;

  /** Setup mode selections */
  setupState = {
    playerTemplate: null,
    enemyTemplate: null,
    crewAssignments: {}
  };

  /** UI selection state */
  uiState = {
    selectedRole: "pilot",
    selectedAction: null,
    selectedTargetSystem: "weapons",
    selectedWeaponIndex: 0,
    selectedRange: "medium",
    skillMod: 0
  };

  get setupMode() {
    return !this.combatState || !this.combatState.active;
  }


  // ── Data Preparation ──────────────────────────────────────────────────
  async _prepareContext(options) {
    const ctx = {};

    ctx.setupMode = this.setupMode;

    if (ctx.setupMode) {
      return this.#prepareSetupContext(ctx);
    }
    return this.#prepareCombatContext(ctx);
  }

  #prepareSetupContext(ctx) {
    // Player ship templates
    const playerKeys = ["corvette", "frigate", "cruiser"];
    ctx.playerTemplates = playerKeys.map(id => {
      const t = SHIP_TEMPLATES[id];
      return {
        id, name: t.name,
        hull: t.hull.max, shield: t.shields.max, reactor: t.reactor.total,
        selected: this.setupState.playerTemplate === id
      };
    });

    // Enemy ship templates
    const enemyKeys = ["pirateRaider", "militaryPatrol", "pirateDreadnought", "alienVessel"];
    ctx.enemyTemplates = enemyKeys.map(id => {
      const t = SHIP_TEMPLATES[id];
      return {
        id, name: t.name,
        hull: t.hull.max, shield: t.shields.max, reactor: t.reactor.total,
        selected: this.setupState.enemyTemplate === id
      };
    });

    // Crew roles
    ctx.crewRoles = Object.entries(ROLES).map(([id, r]) => ({
      id, label: r.label, icon: r.icon
    }));

    // Available actors
    ctx.actors = game.actors?.contents
      .filter(a => a.type === "character" || a.type === "npc")
      .map(a => ({
        id: a.id, name: a.name,
        selected: false
      })) ?? [];

    ctx.canStart = this.setupState.playerTemplate && this.setupState.enemyTemplate;

    // Placeholder combat info for top bar
    ctx.round = 0;
    ctx.phaseName = "Setup";
    ctx.rangeLabel = "—";

    return ctx;
  }

  #prepareCombatContext(ctx) {
    const state = this.combatState;
    const phase = getCurrentPhase(state);

    ctx.round = state.round;
    ctx.phaseName = phase.label;
    ctx.rangeLabel = RANGE_LABELS[state.range] ?? state.range;
    ctx.rangeClose = state.range === "close";
    ctx.rangeMedium = state.range === "medium";
    ctx.rangeLong = state.range === "long";
    ctx.enemyScanned = state.enemyScanned;
    ctx.isGM = game.user.isGM;

    // Player ship
    ctx.playerShip = this.#prepareShipData(state.playerShip, true);
    // Enemy ship
    ctx.enemyShip = this.#prepareShipData(state.enemyShip, false);

    // Roles tabs
    ctx.roles = Object.entries(ROLES).map(([id, r]) => ({
      id, label: r.label, icon: r.icon,
      active: this.uiState.selectedRole === id,
      acted: state.playerShip.crew[id]?.hasActed ?? false,
      phaseMatch: r.phase === phase.id || (phase.id === "operations" && (id === "security" || id === "arcnet"))
    }));

    // Current role's actions
    const role = this.uiState.selectedRole;
    const roleActions = ACTIONS[role] ?? [];
    ctx.currentActions = roleActions.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      shortDesc: a.description.split("—")[1]?.trim() ?? a.description,
      selected: this.uiState.selectedAction === a.id
    }));

    // Find selected action definition
    const selectedDef = roleActions.find(a => a.id === this.uiState.selectedAction);

    // Options visibility
    ctx.showOptions = !!selectedDef;
    ctx.showTargetSystem = selectedDef?.requiresTarget ?? false;
    ctx.showWeaponSelect = selectedDef?.requiresWeapon ?? false;
    ctx.showRangeSelect = selectedDef?.requiresRange ?? false;
    ctx.showSkillMod = !!selectedDef && !selectedDef.autoSuccess;
    ctx.skillMod = this.uiState.skillMod;

    // Target systems (enemy systems for attacks, player systems for friendly)
    if (ctx.showTargetSystem) {
      const targetShip = selectedDef.targetsFriendly ? state.playerShip : state.enemyShip;
      ctx.targetSystems = SYSTEM_IDS.map(id => ({
        id,
        label: SYSTEMS[id].label,
        hpText: state.enemyScanned || selectedDef.targetsFriendly
          ? `(${targetShip.systems[id].hp}/${targetShip.systems[id].maxHp})`
          : "",
        selected: this.uiState.selectedTargetSystem === id
      }));
    }

    // Weapon options
    if (ctx.showWeaponSelect) {
      ctx.weaponOptions = state.playerShip.weapons.map((w, i) => ({
        index: i,
        name: w.name,
        damage: w.damage,
        typeLabel: WEAPON_TYPES[w.type]?.label ?? w.type,
        ammoText: w.ammo >= 0 ? ` [${w.ammo} ammo]` : "",
        selected: this.uiState.selectedWeaponIndex === i
      }));
    }

    // Execute button
    ctx.showExecute = !!selectedDef;
    ctx.selectedActionName = selectedDef?.name ?? "";
    ctx.roleActed = state.playerShip.crew[role]?.hasActed ?? false;

    // Log
    ctx.log = [...state.log].reverse().slice(0, 50);

    return ctx;
  }

  #prepareShipData(ship, isPlayer) {
    const data = {
      name: ship.name,
      hull: { ...ship.hull },
      shields: { ...ship.shields },
      reactor: ship.reactor,
      hullPercent: Math.max(0, (ship.hull.current / ship.hull.max) * 100),
      shieldPercent: ship.shields.max > 0 ? Math.max(0, (ship.shields.current / ship.shields.max) * 100) : 0,
      usedPower: getUsedPower(ship),
      freePower: getFreePower(ship)
    };

    // Systems array for template iteration
    data.systemsArray = SYSTEM_IDS.map(id => {
      const sys = ship.systems[id];
      const def = SYSTEMS[id];
      const effectiveMax = getEffectiveMaxPower(sys);
      const statusLabel = getSystemStatusLabel(sys);
      const hpPct = (sys.hp / sys.maxHp) * 100;

      // Build power pips
      const pips = [];
      for (let i = 1; i <= sys.maxPower; i++) {
        pips.push({
          level: i,
          filled: i <= sys.power,
          overMax: i > effectiveMax
        });
      }

      // Status icons
      const statusIcons = [];
      if (sys.status.includes("fire")) statusIcons.push("🔥");
      if (sys.status.includes("breach")) statusIcons.push("💨");
      if (sys.status.includes("boarded")) statusIcons.push("⚔");
      if (sys.status.includes("ionized")) statusIcons.push("⚡");

      // Status CSS class
      let statusClass = "sc-sys-online";
      if (sys.hp <= 0) statusClass = "sc-sys-disabled";
      else if (hpPct <= 25) statusClass = "sc-sys-critical";
      else if (hpPct <= 50) statusClass = "sc-sys-damaged";
      else if (hpPct <= 75) statusClass = "sc-sys-stressed";

      return {
        id, ...def, hp: sys.hp, maxHp: sys.maxHp,
        power: sys.power, maxPower: sys.maxPower,
        effectiveMax, statusLabel, statusClass,
        hpPercent: hpPct, pips, statusIcons
      };
    });

    // Weapons
    data.weapons = (ship.weapons ?? []).map(w => {
      const typeColor = w.type === "laser" ? "#22d3ee" : w.type === "missile" ? "#f97316" : "#a3a3a3";
      return {
        ...w,
        typeLabel: WEAPON_TYPES[w.type]?.label ?? w.type,
        typeColor,
        hasAmmo: w.ammo >= 0,
        ammoText: w.ammo >= 0 ? ` [${w.ammo}]` : ""
      };
    });

    return data;
  }


  // ── Action Handlers ─────────────────────────────────────────────────────

  static #onSelectPlayerShip(event, target) {
    this.setupState.playerTemplate = target.dataset.template;
    this.render({force: true});
  }

  static #onSelectEnemyShip(event, target) {
    this.setupState.enemyTemplate = target.dataset.template;
    this.render({force: true});
  }

  static #onAssignCrew(event, target) {
    const role = target.dataset.role;
    const actorId = target.value || null;
    this.setupState.crewAssignments[role] = actorId;
  }

  static #onStartCombat(event, target) {
    const pTemplate = SHIP_TEMPLATES[this.setupState.playerTemplate];
    const eTemplate = SHIP_TEMPLATES[this.setupState.enemyTemplate];
    if (!pTemplate || !eTemplate) {
      ui.notifications.warn("Select both a player ship and an enemy ship.");
      return;
    }

    this.combatState = createCombatState(pTemplate, eTemplate);

    // Apply crew assignments
    for (const [role, actorId] of Object.entries(this.setupState.crewAssignments)) {
      if (actorId && this.combatState.playerShip.crew[role]) {
        this.combatState.playerShip.crew[role].actorId = actorId;
      }
    }

    this.combatState.log.push("═══ COMBAT INITIATED ═══");
    this.combatState.log.push(`${this.combatState.playerShip.name} vs ${this.combatState.enemyShip.name}`);
    this.combatState.log.push(`Range: ${RANGE_LABELS[this.combatState.range]} — Round 1 begins.`);

    this.uiState.selectedRole = "engineer";
    this.uiState.selectedAction = null;

    this.render({force: true});

    // Post to chat
    ChatMessage.create({
      content: `<div class="sc-chat-card sc-announce"><i class="fas fa-rocket"></i> <strong>Starship Combat Initiated!</strong><br>${this.combatState.playerShip.name} vs ${this.combatState.enemyShip.name}</div>`,
      speaker: { alias: "Starship Combat" }
    });
  }

  static #onAdvancePhase(event, target) {
    if (!this.combatState) return;

    const phase = advancePhase(this.combatState);
    this.combatState.log.push(`── ${phase.label} ──`);

    // Auto-select the relevant role tab
    if (phase.role) {
      this.uiState.selectedRole = phase.role;
    } else if (phase.id === "operations") {
      this.uiState.selectedRole = "security";
    }
    this.uiState.selectedAction = null;

    // Check for ship destruction
    if (this.combatState.playerShip.hull.current <= 0) {
      this.combatState.log.push("💀 YOUR SHIP HAS BEEN DESTROYED!");
      this.combatState.active = false;
    }
    if (this.combatState.enemyShip.hull.current <= 0) {
      this.combatState.log.push("🎉 ENEMY SHIP DESTROYED! VICTORY!");
      this.combatState.active = false;
    }

    this.render({force: true});
  }

  static async #onEndCombat(event, target) {
    // Use standard Dialog for maximum compatibility
    const confirmed = await new Promise(resolve => {
      new Dialog({
        title: "End Starship Combat",
        content: "<p>Are you sure you want to end this combat encounter?</p>",
        buttons: {
          yes: { icon: '<i class="fas fa-check"></i>', label: "End Combat", callback: () => resolve(true) },
          no: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(false) }
        },
        default: "no",
        close: () => resolve(false)
      }).render(true);
    });
    if (confirmed) {
      this.combatState = null;
      this.setupState = { playerTemplate: null, enemyTemplate: null, crewAssignments: {} };
      this.uiState = { selectedRole: "pilot", selectedAction: null, selectedTargetSystem: "weapons", selectedWeaponIndex: 0, selectedRange: "medium", skillMod: 0 };
      this.render({force: true});
    }
  }

  static #onSelectRole(event, target) {
    this.uiState.selectedRole = target.dataset.role;
    this.uiState.selectedAction = null;
    this.render({force: true});
  }

  static #onSelectAction(event, target) {
    const actionId = target.dataset.actionId;
    this.uiState.selectedAction = this.uiState.selectedAction === actionId ? null : actionId;
    this.render({force: true});
  }

  static #onSetTarget(event, target) {
    this.uiState.selectedTargetSystem = target.value;
  }

  static #onSetWeapon(event, target) {
    this.uiState.selectedWeaponIndex = parseInt(target.value) || 0;
  }

  static #onSetRange(event, target) {
    this.uiState.selectedRange = target.value;
  }

  static #onSetSkillMod(event, target) {
    this.uiState.skillMod = parseInt(target.value) || 0;
  }

  static #onClearLog(event, target) {
    if (this.combatState) this.combatState.log = [];
    this.render({force: true});
  }

  static #onAdjustPower(event, target) {
    if (!this.combatState) return;
    const shipKey = target.dataset.ship;
    const sysId = target.dataset.system;
    const level = parseInt(target.dataset.level);

    const ship = shipKey === "enemy" ? this.combatState.enemyShip : this.combatState.playerShip;
    if (shipKey === "enemy" && !game.user.isGM) return; // only GM can adjust enemy power

    const sys = ship.systems[sysId];
    if (!sys) return;

    // Toggle: if clicking the current power level, reduce by 1. Otherwise set to clicked level.
    const newPower = sys.power === level ? level - 1 : level;
    setPower(ship, sysId, newPower);
    this.render({force: true});
  }

  static async #onExecuteAction(event, target) {
    if (!this.combatState) return;
    const state = this.combatState;
    const role = this.uiState.selectedRole;
    const actionId = this.uiState.selectedAction;

    if (!actionId) {
      ui.notifications.warn("Select an action first.");
      return;
    }

    // Check if role already acted
    if (state.playerShip.crew[role]?.hasActed) {
      ui.notifications.warn(`${ROLES[role].label} has already acted this round.`);
      return;
    }

    // Find action definition
    const actionDef = ACTIONS[role]?.find(a => a.id === actionId);
    if (!actionDef) return;

    // Check close range requirement
    if (actionDef.requiresCloseRange && state.range !== "close") {
      ui.notifications.warn("This action requires Close range!");
      return;
    }

    // Check weapon system has power for gunner actions
    if (role === "gunner" && getEffectivePower(state.playerShip.systems.weapons) <= 0) {
      ui.notifications.warn("Weapons system has no power!");
      return;
    }

    // Perform roll (if needed)
    let rollResult = null;
    if (actionDef.skill && !actionDef.autoSuccess) {
      const allPenalty = state.playerShip.modifiers.allPenalty ?? 0;
      const sysPenalty = actionDef.skill === "gunnery"
        ? getSystemPenalty(state.playerShip.systems.weapons)
        : 0;

      rollResult = await performRoll(
        this.uiState.skillMod,
        actionDef.dc,
        allPenalty + sysPenalty
      );
    } else if (actionDef.autoSuccess) {
      rollResult = { success: true, critSuccess: false, critFailure: false, naturalRoll: 0, total: 0, modifier: 0, dc: null };
    } else {
      // Attack rolls (gunner without set DC)
      rollResult = await performRoll(this.uiState.skillMod, null, 0);
    }

    // Build options
    const options = {
      targetSystem: this.uiState.selectedTargetSystem,
      weaponIndex: this.uiState.selectedWeaponIndex,
      targetRange: this.uiState.selectedRange,
      skillMod: this.uiState.skillMod
    };

    // Execute the action
    const result = await actionDef.execute(state, state.playerShip, state.enemyShip, rollResult, options);

    // Mark as acted
    state.playerShip.crew[role].hasActed = true;

    // Log
    state.log.push(`[${ROLES[role].label}] ${actionDef.name}: ${result.message}`);

    // Post to chat
    await postCombatMessage(role, actionDef.name, result, rollResult);

    // Check destruction
    if (state.enemyShip.hull.current <= 0) {
      state.log.push("🎉 ENEMY SHIP DESTROYED! VICTORY!");
      state.active = false;
      ChatMessage.create({
        content: `<div class="sc-chat-card sc-victory"><i class="fas fa-trophy"></i> <strong>VICTORY!</strong> The ${state.enemyShip.name} has been destroyed!</div>`,
        speaker: { alias: "Starship Combat" }
      });
    }
    if (state.playerShip.hull.current <= 0) {
      state.log.push("💀 YOUR SHIP HAS BEEN DESTROYED!");
      state.active = false;
      ChatMessage.create({
        content: `<div class="sc-chat-card sc-defeat"><i class="fas fa-skull"></i> <strong>DEFEAT!</strong> Your ship has been destroyed!</div>`,
        speaker: { alias: "Starship Combat" }
      });
    }

    this.uiState.selectedAction = null;
    this.render({force: true});
  }


  // ── GM Tools ──────────────────────────────────────────────────────────────

  static async #onGmDamage(event, target) {
    if (!this.combatState || !game.user.isGM) return;

    const systemOptions = SYSTEM_IDS.map(id => `<option value="${id}">${SYSTEMS[id].label}</option>`).join("");

    const content = `
      <form class="sc-gm-form">
        <div class="form-group"><label>Target</label>
          <select name="target"><option value="player">Player Ship</option><option value="enemy">Enemy Ship</option></select>
        </div>
        <div class="form-group"><label>Target System</label>
          <select name="system">${systemOptions}</select>
        </div>
        <div class="form-group"><label>Damage</label>
          <input type="text" name="formula" value="2d6" placeholder="e.g. 3d6+4" />
        </div>
        <div class="form-group"><label>Type</label>
          <select name="weaponType">
            <option value="kinetic">Kinetic</option><option value="laser">Laser</option><option value="missile">Missile</option>
          </select>
        </div>
        <div class="form-group"><label>Critical?</label>
          <input type="checkbox" name="isCrit" />
        </div>
      </form>
    `;

    const app = this;
    new Dialog({
      title: "GM: Apply Damage",
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-burst"></i>',
          label: "Apply Damage",
          callback: async (html) => {
            const form = html.find("form")[0] ?? html[0]?.querySelector("form");
            if (!form) return;
            const targetShip = form.target.value === "enemy" ? app.combatState.enemyShip : app.combatState.playerShip;
            const targetLabel = form.target.value === "enemy" ? app.combatState.enemyShip.name : app.combatState.playerShip.name;
            const sysId = form.system.value;
            const formula = form.formula.value || "2d6";
            const weaponType = form.weaponType.value;
            const isCrit = form.isCrit.checked;

            try {
              const roll = await new Roll(formula).evaluate();
              const report = applyDamage(targetShip, roll.total, sysId, weaponType, isCrit);

              let msg = `[GM] ${roll.total} ${weaponType} damage to ${targetLabel}'s ${SYSTEMS[sysId]?.label}`;
              if (report.shieldAbsorbed > 0) msg += ` (${report.shieldAbsorbed} shields absorbed)`;
              if (report.systemDamage > 0) msg += ` — ${report.systemDamage} system dmg`;
              if (report.hullDamage > 0) msg += `, ${report.hullDamage} hull dmg`;
              if (report.systemDestroyed) msg += ` ⚠ SYSTEM DISABLED`;
              if (report.shipDestroyed) msg += ` 💀 SHIP DESTROYED`;

              app.combatState.log.push(msg);

              await ChatMessage.create({
                content: `<div class="sc-chat-card"><div class="sc-chat-header"><i class="fas fa-gavel"></i> <strong>GM Damage</strong></div><div class="sc-chat-result">${msg}</div></div>`,
                speaker: { alias: "Starship Combat" }
              });

              if (targetShip.hull.current <= 0) {
                app.combatState.active = false;
              }

              app.render({force: true});
            } catch (e) {
              ui.notifications.error(`Invalid roll formula: ${formula}`);
            }
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "apply"
    }).render(true);
  }

  static async #onGmEnemyAttack(event, target) {
    if (!this.combatState || !game.user.isGM) return;
    const state = this.combatState;
    const enemy = state.enemyShip;
    const player = state.playerShip;

    if (enemy.weapons.length === 0) {
      ui.notifications.warn("Enemy has no weapons.");
      return;
    }

    const weaponOptions = enemy.weapons.map((w, i) =>
      `<option value="${i}">${w.name} (${w.damage} ${WEAPON_TYPES[w.type]?.label ?? w.type})${w.ammo >= 0 ? ` [${w.ammo} ammo]` : ""}</option>`
    ).join("");
    const systemOptions = SYSTEM_IDS.map(id => `<option value="${id}">${SYSTEMS[id].label}</option>`).join("");

    const content = `
      <form class="sc-gm-form">
        <div class="form-group"><label>Weapon</label><select name="weapon">${weaponOptions}</select></div>
        <div class="form-group"><label>Target System</label><select name="system">${systemOptions}</select></div>
        <div class="form-group"><label>Attack Modifier</label><input type="number" name="atkMod" value="0" /></div>
      </form>
    `;

    const app = this;
    new Dialog({
      title: "GM: Enemy Attack",
      content,
      buttons: {
        fire: {
          icon: '<i class="fas fa-crosshairs"></i>',
          label: "Fire!",
          callback: async (html) => {
            const form = html.find("form")[0] ?? html[0]?.querySelector("form");
            if (!form) return;
            const weaponIdx = parseInt(form.weapon.value);
            const sysId = form.system.value;
            const atkMod = parseInt(form.atkMod.value) || 0;
            const weapon = enemy.weapons[weaponIdx];
            if (!weapon) return;

            if (weapon.ammo === 0) {
              ui.notifications.warn(`${weapon.name} is out of ammo!`);
              return;
            }
            if (weapon.ammo > 0) weapon.ammo--;

            const targetAC = getShipAC(player);
            const attackRoll = await new Roll("1d20").evaluate();
            const rangeBonus = WEAPON_TYPES[weapon.type]?.rangeBonus?.[state.range] ?? 0;
            const total = attackRoll.total + atkMod + rangeBonus;
            const hit = total >= targetAC;
            const crit = total >= targetAC + 10;

            if (hit) {
              const dmgRoll = await new Roll(weapon.damage).evaluate();
              let totalDmg = dmgRoll.total;
              if (crit) totalDmg = Math.round(totalDmg * 1.5);

              const report = applyDamage(player, totalDmg, sysId, weapon.type, crit);

              let msg = `${enemy.name} fires ${weapon.name} at your ${SYSTEMS[sysId]?.label} — HIT! `;
              msg += `${totalDmg} damage (rolled ${attackRoll.total}+${atkMod} = ${total} vs AC ${targetAC})`;
              if (report.shieldAbsorbed > 0) msg += `. Shields absorbed ${report.shieldAbsorbed}`;
              if (report.systemDamage > 0) msg += `. System takes ${report.systemDamage}`;
              if (report.hullDamage > 0) msg += `. Hull takes ${report.hullDamage}`;
              if (crit) msg += ` ★ CRITICAL HIT ★`;
              if (report.fire) msg += ` 🔥 Fire!`;
              if (report.systemDestroyed) msg += ` ⚠ ${SYSTEMS[sysId]?.label} DISABLED!`;
              if (report.shipDestroyed) msg += ` 💀 SHIP DESTROYED!`;

              state.log.push(`[ENEMY] ${msg}`);
              await ChatMessage.create({
                content: `<div class="sc-chat-card sc-failure"><div class="sc-chat-header"><i class="fas fa-skull-crossbones"></i> <strong>Enemy Attack</strong></div><div class="sc-roll-info">🎲 ${attackRoll.total} + ${atkMod} = ${total} vs AC ${targetAC}</div><div class="sc-chat-result">${msg}</div></div>`,
                speaker: { alias: state.enemyShip.name }
              });

              if (player.hull.current <= 0) {
                state.log.push("💀 YOUR SHIP HAS BEEN DESTROYED!");
                state.active = false;
              }
            } else {
              const msg = `${enemy.name} fires ${weapon.name} at your ${SYSTEMS[sysId]?.label} — MISS! (${total} vs AC ${targetAC})`;
              state.log.push(`[ENEMY] ${msg}`);
              await ChatMessage.create({
                content: `<div class="sc-chat-card"><div class="sc-chat-header"><i class="fas fa-skull-crossbones"></i> <strong>Enemy Attack</strong></div><div class="sc-roll-info">🎲 ${attackRoll.total} + ${atkMod} = ${total} vs AC ${targetAC}</div><div class="sc-chat-result">${msg}</div></div>`,
                speaker: { alias: state.enemyShip.name }
              });
            }

            app.render({force: true});
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "fire"
    }).render(true);
  }

  _onRender(context, options) {
    // Auto-scroll combat log to bottom
    const logEl = this.element.querySelector(".sc-log-entries");
    if (logEl) logEl.scrollTop = logEl.scrollHeight;

    // Wire up select elements that use 'change' events (data-action on selects)
    this.element.querySelectorAll("select[data-action]").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const actionName = sel.dataset.action;
        const handler = StarshipCombatUI.DEFAULT_OPTIONS.actions[actionName];
        if (handler) handler.call(this, e, sel);
      });
    });

    // Wire up number inputs
    this.element.querySelectorAll("input[data-action]").forEach(inp => {
      inp.addEventListener("change", (e) => {
        const actionName = inp.dataset.action;
        const handler = StarshipCombatUI.DEFAULT_OPTIONS.actions[actionName];
        if (handler) handler.call(this, e, inp);
      });
    });
  }
}
