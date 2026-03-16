/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3.1
   Player Sheet
   ========================================================================== */

import { MODULE_ID, ROLES, SUBSYSTEM_TYPES, DAMAGE_CONDITIONS, ARCS, AMMO_CATEGORIES } from "./constants.js";
import { getShipData, getDerived } from "./ship-data.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class PlayerStarshipSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  actor = null;
  constructor(actor, options = {}) { super(options); this.actor = actor; }

  static DEFAULT_OPTIONS = {
    window: { icon: "fas fa-rocket", resizable: true },
    position: { width: 700, height: 700 },
    classes: ["sc-player-sheet", "sheet"],
    actions: {}
  };

  static PARTS = {
    sheet: { template: `modules/${MODULE_ID}/templates/player-sheet.hbs`, scrollable: [".sc-body"] }
  };

  get title() { return this.actor?.name ?? "Starship"; }

  async _prepareContext(options) {
    const actor = this.actor; if (!actor) return {};
    const data = getShipData(actor); if (!data) return {};
    const derived = getDerived(data);

    const inventory = actor.items?.contents.map(item => ({
      id: item.id, name: item.name, img: item.img, type: item.type,
      quantity: item.system?.quantity ?? 1,
      bulk: item.system?.bulk?.value ?? "—",
      value: item.system?.price?.value?.gp ?? "—"
    })) ?? [];

    return {
      actor, data, derived, name: actor.name, img: actor.img,
      ac: derived.ac, tl: derived.tl,
      hullCurrent: data.hull.current, hullMax: data.hull.max, hullPercent: derived.hullPercent,
      shieldCurrent: data.shields.current, shieldMax: data.shields.max, shieldPercent: derived.shieldPercent,
      speed: data.speed,
      subsystems: (data.subsystems ?? []).map(s => ({
        ...s, typeLabel: SUBSYSTEM_TYPES[s.type]?.label ?? s.type, icon: SUBSYSTEM_TYPES[s.type]?.icon ?? "fa-gear",
        conditionLabel: DAMAGE_CONDITIONS[s.condition]?.label ?? "Nominal", severity: DAMAGE_CONDITIONS[s.condition]?.severity ?? 0
      })),
      weapons: (data.weapons ?? []).map(w => ({ ...w, arcLabel: ARCS[w.arc]?.label ?? w.arc, ammoLabel: AMMO_CATEGORIES[w.ammo]?.label ?? "None" })),
      roles: Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label, icon: r.icon })),
      notes: data.notes ?? "",
      inventory, hasInventory: inventory.length > 0,
      cargoCapacity: data.cargoCapacity ?? 20
    };
  }

  _onRender(context, options) {
    const tabBtns = this.element.querySelectorAll(".sc-tab[data-sc-tab]");
    const panes = this.element.querySelectorAll(".tab-pane[data-sc-pane]");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        panes.forEach(p => p.classList.toggle("active", p.dataset.scPane === btn.dataset.scTab));
      });
    });
  }
}

const _playerSheets = new Map();
export function openPlayerSheet(actor) {
  let sheet = _playerSheets.get(actor.id);
  if (sheet && !sheet._destroyed) { sheet.render({ force: true }); return sheet; }
  sheet = new PlayerStarshipSheet(actor, { id: `sc-player-${actor.id}` });
  _playerSheets.set(actor.id, sheet); sheet.render({ force: true }); return sheet;
}
