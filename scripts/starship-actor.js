/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Starship Actor: Flag-based data on any actor type (sf2e compatible)
   
   The sf2e system locks actor types, so we can't register a new one.
   Instead, we store all starship data in module flags on a "vehicle" 
   or "npc" actor, and identify starships via a flag.
   ========================================================================== */

import { SIZE_CATEGORIES, MANEUVERABILITY, ARCS, SHIELD_QUADRANTS, CRITICAL_SYSTEMS, CRIT_CONDITIONS, BASE_FRAMES, WEAPON_CATALOG } from "./constants.js";
import { calcAC, calcTL, getTotalShields, getMaxShields, getCritPenalties } from "./combat-engine.js";

const MODULE_ID = "starship-combat-ftl";
const FLAG_KEY = "shipData";
const IS_SHIP_FLAG = "isStarship";

// ── Starship Data Access ────────────────────────────────────────────────────

/**
 * Check if an actor is a starship (has our flag).
 */
export function isStarship(actor) {
  return actor?.getFlag(MODULE_ID, IS_SHIP_FLAG) === true;
}

/**
 * Get the starship data from an actor's flags.
 * Returns null if not a starship.
 */
export function getShipData(actor) {
  if (!isStarship(actor)) return null;
  return actor.getFlag(MODULE_ID, FLAG_KEY) ?? buildDefaultShipData(actor.name);
}

/**
 * Save starship data to an actor's flags.
 */
export async function setShipData(actor, data) {
  await actor.setFlag(MODULE_ID, FLAG_KEY, data);
}

/**
 * Build default starship data for a new ship.
 */
export function buildDefaultShipData(name = "New Starship") {
  return {
    name,
    tier: 1,
    frame: "explorer",
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
    computerNodes: 1,
    sensorMod: 0,
    sensorRange: "medium",
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
    modifiers: {},
    disposition: "friendly",
    notes: ""
  };
}

/**
 * Get derived stats from ship data (AC, TL, etc.)
 */
export function getShipDerived(data) {
  if (!data) return {};
  return {
    ac: calcAC(data),
    tl: calcTL(data),
    totalShields: getTotalShields(data),
    maxShields: getMaxShields(data),
    hullPercent: data.hull.max > 0 ? Math.max(0, (data.hull.current / data.hull.max) * 100) : 0,
    isDestroyed: data.hull.current <= 0,
    critPenalties: getCritPenalties(data)
  };
}


// ── Create Starship ─────────────────────────────────────────────────────────

/**
 * Create a new starship actor. Uses "npc" type as the base (always available).
 * Sets the isStarship flag and initializes default ship data.
 */
export async function createStarshipActor(name = "New Starship", frameId = "explorer") {
  // Determine which actor type to use — prefer "vehicle", fall back to "npc"
  const availableTypes = game.documentTypes?.Actor ?? [];
  let baseType = "npc";
  if (availableTypes.includes("vehicle")) baseType = "vehicle";

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

  // Apply frame if specified
  if (frameId && actor) {
    await applyFrameToActor(actor, frameId);
  }

  return actor;
}

/**
 * Show the "Create Starship" dialog with frame selection.
 */
export async function showCreateStarshipDialog() {
  const frameOptions = Object.entries(BASE_FRAMES).map(([k, v]) =>
    `<option value="${k}">${v.name} (${v.size}, HP ${v.hp})</option>`
  ).join("");

  return new Promise(resolve => {
    new Dialog({
      title: "Create Starship",
      content: `
        <form class="sc-create-form">
          <div class="form-group">
            <label>Ship Name</label>
            <input type="text" name="shipName" value="New Starship" autofocus />
          </div>
          <div class="form-group">
            <label>Base Frame</label>
            <select name="frame">${frameOptions}</select>
          </div>
          <div class="form-group">
            <label>Disposition</label>
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
          icon: '<i class="fas fa-rocket"></i>',
          label: "Create Starship",
          callback: async (html) => {
            const form = html.find("form")[0] ?? html[0]?.querySelector("form");
            const name = form?.shipName?.value || "New Starship";
            const frame = form?.frame?.value || "explorer";
            const disposition = form?.disposition?.value || "friendly";

            const actor = await createStarshipActor(name, frame);
            if (actor) {
              const data = getShipData(actor);
              if (data) {
                data.disposition = disposition;
                await setShipData(actor, data);
              }
              ui.notifications.info(`Starship "${name}" created.`);
              openStarshipSheet(actor);
            }
            resolve(actor);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "create"
    }).render(true);
  });
}

/**
 * Apply a base frame template to a starship actor's flag data.
 */
export async function applyFrameToActor(actor, frameId) {
  const frame = BASE_FRAMES[frameId];
  if (!frame || !actor) return;

  const data = getShipData(actor) ?? buildDefaultShipData(actor.name);
  data.frame = frameId;
  data.size = frame.size;
  data.maneuverability = frame.maneuverability ?? "average";
  data.hull.max = frame.hp;
  data.hull.current = frame.hp;
  data.hpIncrement = frame.hpIncrement;
  data.dt = frame.dt;
  data.ct = frame.ct ?? Math.floor(frame.hp / 5);
  data.speed = MANEUVERABILITY[frame.maneuverability]?.turn <= 1 ? 10 : 8;
  data.turnDistance = MANEUVERABILITY[frame.maneuverability]?.turn ?? 2;
  data.name = actor.name;

  await setShipData(actor, data);
}


// ── Starship Sheet (Standalone Application) ─────────────────────────────────

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class StarshipSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @type {Actor} The actor this sheet displays */
  actor = null;

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    window: {
      icon: "fas fa-rocket",
      resizable: true
    },
    position: {
      width: 700,
      height: 740
    },
    classes: ["starship-sheet-app"],
    actions: {
      addWeapon: StarshipSheet.#onAddWeapon,
      removeWeapon: StarshipSheet.#onRemoveWeapon,
      applyFrame: StarshipSheet.#onApplyFrame
    }
  };

  static PARTS = {
    sheet: {
      template: `modules/${MODULE_ID}/templates/starship-sheet.hbs`,
      scrollable: [".sc-sheet-body"]
    }
  };

  get title() {
    return `${this.actor?.name ?? "Starship"} — Starship`;
  }

  async _prepareContext(options) {
    const actor = this.actor;
    if (!actor) return {};
    const data = getShipData(actor) ?? buildDefaultShipData(actor.name);
    const derived = getShipDerived(data);

    return {
      actor, data, derived,
      name: actor.name,
      img: actor.img,
      ac: derived.ac,
      tl: derived.tl,
      hullPercent: derived.hullPercent,
      totalShields: derived.totalShields,
      maxShields: derived.maxShields,
      isDestroyed: derived.isDestroyed,

      sizeOptions: Object.entries(SIZE_CATEGORIES).map(([k, v]) => ({ value: k, label: v.label, selected: data.size === k })),
      maneuverabilityOptions: Object.entries(MANEUVERABILITY).map(([k, v]) => ({ value: k, label: v.label, selected: data.maneuverability === k })),
      frameOptions: Object.entries(BASE_FRAMES).map(([k, v]) => ({ value: k, label: v.name, selected: data.frame === k })),
      dispositionOptions: [
        { value: "friendly", label: "Friendly", selected: data.disposition === "friendly" },
        { value: "enemy", label: "Enemy", selected: data.disposition === "enemy" },
        { value: "neutral", label: "Neutral", selected: data.disposition === "neutral" }
      ],

      shieldQuadrants: SHIELD_QUADRANTS.map(q => ({
        id: q, label: ARCS[q]?.label ?? q,
        current: data.shields?.[q]?.current ?? 0,
        max: data.shields?.[q]?.max ?? 0,
        percent: (data.shields?.[q]?.max ?? 0) > 0 ? (data.shields[q].current / data.shields[q].max * 100) : 0
      })),

      weapons: (data.weapons ?? []).map((w, i) => ({ ...w, index: i })),

      criticalSystems: Object.entries(CRITICAL_SYSTEMS).map(([id, def]) => ({
        id, label: def.label, icon: def.icon,
        condition: data.criticals?.[id] ?? "nominal",
        conditionLabel: CRIT_CONDITIONS[data.criticals?.[id] ?? "nominal"]?.label ?? "Nominal",
        severity: CRIT_CONDITIONS[data.criticals?.[id] ?? "nominal"]?.severity ?? 0
      })),

      weaponCatalogOptions: Object.entries(WEAPON_CATALOG).map(([k, v]) => ({ value: k, label: `${v.name} (${v.mount}, ${v.damage})` }))
    };
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async #saveAllFields() {
    if (!this.actor) return;
    const data = getShipData(this.actor) ?? buildDefaultShipData(this.actor.name);

    this.element.querySelectorAll("[data-field]").forEach(el => {
      const field = el.dataset.field;
      const value = el.type === "number" ? (parseFloat(el.value) || 0) : el.value;
      const parts = field.split(".");
      let obj = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    });

    await setShipData(this.actor, data);
  }

  static async #onAddWeapon(event, target) {
    const select = this.element.querySelector("[data-weapon-catalog]");
    const weaponId = select?.value;
    if (!weaponId || !WEAPON_CATALOG[weaponId]) return;

    const data = getShipData(this.actor) ?? buildDefaultShipData(this.actor.name);
    data.weapons = data.weapons ?? [];
    data.weapons.push({ ...WEAPON_CATALOG[weaponId] });
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onRemoveWeapon(event, target) {
    const index = parseInt(target.dataset.weaponIndex);
    if (isNaN(index)) return;

    const data = getShipData(this.actor) ?? buildDefaultShipData(this.actor.name);
    if (data.weapons?.[index]) {
      data.weapons.splice(index, 1);
      await setShipData(this.actor, data);
      this.render({ force: true });
    }
  }

  static async #onApplyFrame(event, target) {
    await this.#saveAllFields();
    const select = this.element.querySelector("[data-field='frame']");
    if (select?.value) {
      await applyFrameToActor(this.actor, select.value);
      this.render({ force: true });
    }
  }

  _onRender(context, options) {
    // Auto-save on field change
    this.element.querySelectorAll("[data-field]").forEach(el => {
      el.addEventListener("change", () => this.#saveAllFields());
    });
  }
}


// ── Open sheet helper ───────────────────────────────────────────────────────
const _openSheets = new Map();

export function openStarshipSheet(actor) {
  if (!actor) return;
  let sheet = _openSheets.get(actor.id);
  if (sheet && !sheet._destroyed) {
    sheet.render({ force: true });
    return sheet;
  }
  sheet = new StarshipSheet(actor, { id: `starship-sheet-${actor.id}` });
  _openSheets.set(actor.id, sheet);
  sheet.render({ force: true });
  return sheet;
}


// ── Registration ────────────────────────────────────────────────────────────

export function registerStarshipSystem() {

  // Intercept opening system sheet for starship actors → redirect to our sheet
  Hooks.on("renderActorSheet", (sheet, html, data) => {
    const actor = sheet.document ?? sheet.actor;
    if (actor && isStarship(actor)) {
      setTimeout(() => {
        sheet.close();
        openStarshipSheet(actor);
      }, 50);
    }
  });

  // Add "Create Starship" button to Actor directory header
  Hooks.on("renderActorDirectory", (app, html) => {
    // v13 can pass either HTMLElement or jQuery
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    const headerActions = root.querySelector(".header-actions");
    if (!headerActions) return;
    if (headerActions.querySelector(".sc-create-starship-btn")) return;

    const btn = document.createElement("button");
    btn.className = "sc-create-starship-btn";
    btn.type = "button";
    btn.innerHTML = `<i class="fas fa-rocket"></i> Create Starship`;
    btn.style.cssText = "margin-left: 4px;";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCreateStarshipDialog();
    });
    headerActions.appendChild(btn);

    // Mark starship actors with a rocket icon
    root.querySelectorAll(".directory-item.document, .directory-item[data-document-id], .directory-item[data-entry-id]").forEach(el => {
      const id = el.dataset?.documentId ?? el.dataset?.entryId;
      if (id) {
        const actor = game.actors.get(id);
        if (actor && isStarship(actor)) {
          const nameEl = el.querySelector(".document-name, .entry-name");
          if (nameEl && !nameEl.querySelector(".fa-rocket")) {
            const icon = document.createElement("i");
            icon.className = "fas fa-rocket";
            icon.style.cssText = "margin-right: 4px; opacity: 0.7; color: #4f8eff;";
            nameEl.prepend(icon);
          }
        }
      }
    });
  });

  console.log(`${MODULE_ID} | Starship system registered (flag-based, sf2e compatible)`);
}
