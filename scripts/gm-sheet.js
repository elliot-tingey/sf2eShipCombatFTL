/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   GM Sheet: Full editing interface for starship configuration
   ========================================================================== */

import { MODULE_ID, SUBSYSTEM_TYPES, DAMAGE_CONDITIONS, ROLES, SIZE_CATEGORIES, MANEUVERABILITY, BASE_FRAMES, WEAPON_CATALOG, ARCS } from "./constants.js";
import { getShipData, setShipData, getDerived, addSubsystem, removeSubsystem, addWeapon, removeWeapon, applyFrameToActor, saveCrewMemory, getCrewMemory } from "./ship-data.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class GMStarshipSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  actor = null;

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    window: { icon: "fas fa-rocket", resizable: true },
    position: { width: 720, height: 780 },
    classes: ["sc-gm-sheet", "sheet"],
    actions: {
      pickImage: GMStarshipSheet.#onPickImage,
      applyFrame: GMStarshipSheet.#onApplyFrame,
      addSubsystem: GMStarshipSheet.#onAddSubsystem,
      removeSubsystem: GMStarshipSheet.#onRemoveSubsystem,
      setCondition: GMStarshipSheet.#onSetCondition,
      addWeapon: GMStarshipSheet.#onAddWeapon,
      removeWeapon: GMStarshipSheet.#onRemoveWeapon,
      saveCrew: GMStarshipSheet.#onSaveCrew
    }
  };

  static PARTS = {
    sheet: {
      template: `modules/${MODULE_ID}/templates/gm-sheet.hbs`,
      scrollable: [".sc-gm-body"]
    }
  };

  get title() { return `⚙ ${this.actor?.name ?? "Starship"} — GM Config`; }

  async _prepareContext(options) {
    const actor = this.actor;
    if (!actor) return {};
    const data = getShipData(actor);
    if (!data) return {};
    const derived = getDerived(data);

    // Build crew options: "- GM -" at top, then PCs, then NPCs
    const pcActors = game.actors?.contents.filter(a => a.hasPlayerOwner && a.type === "character") ?? [];
    const npcActors = game.actors?.contents.filter(a => !a.hasPlayerOwner && (a.type === "npc" || a.type === "character")) ?? [];

    const crewOptions = [
      { id: "", name: "— GM —", group: "default" },
      ...pcActors.map(a => ({ id: a.id, name: a.name, group: "pc" })),
      ...npcActors.map(a => ({ id: a.id, name: `${a.name} (NPC)`, group: "npc" }))
    ];

    // Build role assignments from memory
    const roleAssignments = {};
    for (const [roleId, roleDef] of Object.entries(ROLES)) {
      const memory = getCrewMemory(data, roleId);
      roleAssignments[roleId] = {
        id: roleId,
        label: roleDef.label,
        icon: roleDef.icon,
        assigned: memory, // array of actor IDs
        crewOptions: crewOptions.map(o => ({
          ...o,
          selected: memory.includes(o.id)
        }))
      };
    }

    return {
      actor, data, derived,
      name: actor.name,
      img: actor.img,
      ac: derived.ac,
      tl: derived.tl,

      sizeOptions: Object.entries(SIZE_CATEGORIES).map(([k, v]) => ({ value: k, label: v.label, selected: data.size === k })),
      manOptions: Object.entries(MANEUVERABILITY).map(([k, v]) => ({ value: k, label: v.label, selected: data.maneuverability === k })),
      frameOptions: Object.entries(BASE_FRAMES).map(([k, v]) => ({ value: k, label: v.name, selected: data.frame === k })),
      dispOptions: [
        { value: "friendly", label: "Friendly", selected: data.disposition === "friendly" },
        { value: "enemy",    label: "Enemy",    selected: data.disposition === "enemy" },
        { value: "neutral",  label: "Neutral",  selected: data.disposition === "neutral" }
      ],

      subsystems: (data.subsystems ?? []).map(s => ({
        ...s,
        typeLabel: SUBSYSTEM_TYPES[s.type]?.label ?? s.type,
        icon: SUBSYSTEM_TYPES[s.type]?.icon ?? "fa-gear",
        conditionLabel: DAMAGE_CONDITIONS[s.condition]?.label ?? "Nominal",
        severity: DAMAGE_CONDITIONS[s.condition]?.severity ?? 0,
        conditionOptions: Object.entries(DAMAGE_CONDITIONS).map(([k, v]) => ({ value: k, label: v.label, selected: s.condition === k }))
      })),

      subsystemTypeOptions: Object.entries(SUBSYSTEM_TYPES).map(([k, v]) => ({ value: k, label: v.label })),

      weapons: (data.weapons ?? []).map(w => ({
        ...w,
        arcLabel: ARCS[w.arc]?.label ?? w.arc,
        arcOptions: Object.entries(ARCS).map(([k, v]) => ({ value: k, label: v.label, selected: w.arc === k }))
      })),

      weaponCatalogOptions: Object.entries(WEAPON_CATALOG).map(([k, v]) => ({
        value: k,
        label: `${v.name} (${v.mount} ${v.type === "tracking" ? "tracking" : "direct"}, ${v.damage})`
      })),

      roleAssignments: Object.values(roleAssignments),
      crewOptions,

      computerNpcId: data.computerNpcId ?? "",
      computerNpcOptions: [
        { id: "", name: "— None —" },
        ...npcActors.map(a => ({ id: a.id, name: a.name, selected: data.computerNpcId === a.id }))
      ]
    };
  }

  // ── Save all data-field inputs ──────────────────────────────────────────
  async #saveFields() {
    if (!this.actor) return;
    const data = getShipData(this.actor);
    if (!data) return;

    this.element.querySelectorAll("[data-field]").forEach(el => {
      const field = el.dataset.field;
      let value;
      if (el.type === "number") value = parseFloat(el.value) || 0;
      else if (el.type === "checkbox") value = el.checked;
      else value = el.value;

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

  // ── Actions ─────────────────────────────────────────────────────────────

  static async #onPickImage(event, target) {
    const fp = new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: async (path) => {
        await this.actor.update({ img: path });
        this.render({ force: true });
      }
    });
    fp.render(true);
  }

  static async #onApplyFrame(event, target) {
    await this.#saveFields();
    const select = this.element.querySelector("[data-field='frame']");
    if (select?.value) {
      await applyFrameToActor(this.actor, select.value);
      this.render({ force: true });
    }
  }

  static async #onAddSubsystem(event, target) {
    const select = this.element.querySelector("[data-subsystem-type-select]");
    const nameInput = this.element.querySelector("[data-subsystem-name-input]");
    const type = select?.value ?? "misc";
    const name = nameInput?.value || "";

    const data = getShipData(this.actor);
    if (!data) return;
    addSubsystem(data, type, name);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onRemoveSubsystem(event, target) {
    const id = target.dataset.subsystemId;
    const data = getShipData(this.actor);
    if (!data) return;
    removeSubsystem(data, id);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onSetCondition(event, target) {
    const id = target.dataset.subsystemId;
    const condition = target.value;
    const data = getShipData(this.actor);
    if (!data) return;
    const sub = data.subsystems.find(s => s.id === id);
    if (sub) sub.condition = condition;
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onAddWeapon(event, target) {
    const select = this.element.querySelector("[data-weapon-catalog-select]");
    const weaponKey = select?.value;
    if (!weaponKey || !WEAPON_CATALOG[weaponKey]) return;

    const data = getShipData(this.actor);
    if (!data) return;
    addWeapon(data, WEAPON_CATALOG[weaponKey]);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onRemoveWeapon(event, target) {
    const id = target.dataset.weaponId;
    const data = getShipData(this.actor);
    if (!data) return;
    removeWeapon(data, id);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onSaveCrew(event, target) {
    const data = getShipData(this.actor);
    if (!data) return;

    // Read crew selects for each role
    for (const roleId of Object.keys(ROLES)) {
      const selects = this.element.querySelectorAll(`[data-crew-role="${roleId}"]`);
      const ids = [];
      selects.forEach(sel => { if (sel.value) ids.push(sel.value); });
      saveCrewMemory(data, roleId, ids);
    }

    // Computer NPC
    const compSelect = this.element.querySelector("[data-computer-npc]");
    if (compSelect) data.computerNpcId = compSelect.value || null;

    await setShipData(this.actor, data);
    ui.notifications.info("Crew assignments saved.");
  }

  _onRender(context, options) {
    // Initialize tabs
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

    // Auto-save on field change
    this.element.querySelectorAll("[data-field]").forEach(el => {
      el.addEventListener("change", () => this.#saveFields());
    });
    // Wire condition selects
    this.element.querySelectorAll("[data-action='setCondition']").forEach(sel => {
      sel.addEventListener("change", (e) => GMStarshipSheet.#onSetCondition.call(this, e, sel));
    });
  }
}

// ── Open Sheets Map ─────────────────────────────────────────────────────────
const _gmSheets = new Map();

export function openGMSheet(actor) {
  let sheet = _gmSheets.get(actor.id);
  if (sheet && !sheet._destroyed) { sheet.render({ force: true }); return sheet; }
  sheet = new GMStarshipSheet(actor, { id: `sc-gm-${actor.id}` });
  _gmSheets.set(actor.id, sheet);
  sheet.render({ force: true });
  return sheet;
}
