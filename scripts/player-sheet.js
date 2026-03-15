/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   Player Sheet: Role-specific action interface + cargo
   ========================================================================== */

import { MODULE_ID, ROLES, SUBSYSTEM_TYPES, DAMAGE_CONDITIONS, WEAPON_CATALOG, ARCS } from "./constants.js";
import { getShipData, getDerived, isStarship } from "./ship-data.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class PlayerStarshipSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  actor = null;

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    window: { icon: "fas fa-rocket", resizable: true },
    position: { width: 700, height: 700 },
    classes: ["sc-player-sheet", "sheet"],
    actions: {}
  };

  static PARTS = {
    sheet: {
      template: `modules/${MODULE_ID}/templates/player-sheet.hbs`,
      scrollable: [".sc-player-body"]
    }
  };

  get title() { return this.actor?.name ?? "Starship"; }

  async _prepareContext(options) {
    const actor = this.actor;
    if (!actor) return {};
    const data = getShipData(actor);
    if (!data) return {};
    const derived = getDerived(data);

    return {
      actor, data, derived,
      name: actor.name,
      img: actor.img,
      ac: derived.ac,
      tl: derived.tl,

      hullCurrent: data.hull.current,
      hullMax: data.hull.max,
      hullPercent: derived.hullPercent,
      shieldCurrent: data.shields.current,
      shieldMax: data.shields.max,
      shieldPercent: derived.shieldPercent,

      speed: data.speed,
      size: data.size,
      maneuverability: data.maneuverability,

      // Subsystems (read-only for players)
      subsystems: (data.subsystems ?? []).map(s => ({
        ...s,
        typeLabel: SUBSYSTEM_TYPES[s.type]?.label ?? s.type,
        icon: SUBSYSTEM_TYPES[s.type]?.icon ?? "fa-gear",
        conditionLabel: DAMAGE_CONDITIONS[s.condition]?.label ?? "Nominal",
        severity: DAMAGE_CONDITIONS[s.condition]?.severity ?? 0
      })),

      // Weapons (read-only)
      weapons: (data.weapons ?? []).map(w => ({
        ...w,
        arcLabel: ARCS[w.arc]?.label ?? w.arc
      })),

      // Role tabs
      roles: Object.entries(ROLES).map(([id, r]) => ({
        id, label: r.label, icon: r.icon
      })),

      // Ship notes
      notes: data.notes ?? ""
    };
  }

  _onRender(context, options) {
    const nav = this.element.querySelector("nav.sc-tabs");
    const tabs = this.element.querySelectorAll(".tab[data-tab]");
    if (nav) {
      nav.querySelectorAll(".item").forEach(item => {
        item.addEventListener("click", (e) => {
          const tabName = item.dataset.tab;
          nav.querySelectorAll(".item").forEach(i => i.classList.remove("active"));
          item.classList.add("active");
          tabs.forEach(t => {
            t.classList.toggle("active", t.dataset.tab === tabName);
          });
        });
      });
    }
  }
}

// ── Open Player Sheet ───────────────────────────────────────────────────────
const _playerSheets = new Map();

export function openPlayerSheet(actor) {
  let sheet = _playerSheets.get(actor.id);
  if (sheet && !sheet._destroyed) { sheet.render({ force: true }); return sheet; }
  sheet = new PlayerStarshipSheet(actor, { id: `sc-player-${actor.id}` });
  _playerSheets.set(actor.id, sheet);
  sheet.render({ force: true });
  return sheet;
}
