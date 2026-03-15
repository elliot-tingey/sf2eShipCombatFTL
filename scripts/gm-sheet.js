/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   GM Sheet: Stats, subsystems, weapons, crew (+/- slots), inventory
   ========================================================================== */

import { MODULE_ID, SUBSYSTEM_TYPES, DAMAGE_CONDITIONS, ROLES, SIZE_CATEGORIES, MANEUVERABILITY, BASE_FRAMES, WEAPON_CATALOG, ARCS } from "./constants.js";
import { getShipData, setShipData, getDerived, addSubsystem, removeSubsystem, addWeapon, removeWeapon, applyFrameToActor, saveCrewMemory, getCrewMemory } from "./ship-data.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class GMStarshipSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  actor = null;
  /** Track how many crew slots per role in the UI */
  crewSlotCounts = {};

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    // Initialize slot counts from crew memory
    for (const roleId of Object.keys(ROLES)) {
      this.crewSlotCounts[roleId] = 1;
    }
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
      addCrewSlot: GMStarshipSheet.#onAddCrewSlot,
      removeCrewSlot: GMStarshipSheet.#onRemoveCrewSlot,
      saveCrew: GMStarshipSheet.#onSaveCrew,
      removeInventoryItem: GMStarshipSheet.#onRemoveInventoryItem
    }
  };

  static PARTS = {
    sheet: {
      template: `modules/${MODULE_ID}/templates/gm-sheet.hbs`,
      scrollable: [".sc-body"]
    }
  };

  get title() { return `⚙ ${this.actor?.name ?? "Starship"} — GM Config`; }

  async _prepareContext(options) {
    const actor = this.actor;
    if (!actor) return {};
    const data = getShipData(actor);
    if (!data) return {};
    const derived = getDerived(data);

    // Crew options: GM first, then PCs, then NPCs
    const pcActors = game.actors?.contents.filter(a => a.hasPlayerOwner && a.type === "character") ?? [];
    const npcActors = game.actors?.contents.filter(a => !a.hasPlayerOwner && (a.type === "npc" || a.type === "character")) ?? [];
    const crewOptions = [
      { id: "", name: "— GM —" },
      ...pcActors.map(a => ({ id: a.id, name: a.name })),
      ...npcActors.map(a => ({ id: a.id, name: `${a.name} (NPC)` }))
    ];

    // Build role assignments with dynamic slot counts
    const roleAssignments = [];
    for (const [roleId, roleDef] of Object.entries(ROLES)) {
      const memory = getCrewMemory(data, roleId);
      // Ensure slot count is at least as many as saved crew
      if (memory.length > this.crewSlotCounts[roleId]) {
        this.crewSlotCounts[roleId] = memory.length;
      }
      const slotCount = Math.max(1, this.crewSlotCounts[roleId]);
      const slots = [];
      for (let i = 0; i < slotCount; i++) {
        const assignedId = memory[i] ?? "";
        slots.push({
          index: i,
          options: crewOptions.map(o => ({ ...o, selected: o.id === assignedId }))
        });
      }
      roleAssignments.push({
        id: roleId, label: roleDef.label, icon: roleDef.icon,
        slots, slotCount,
        canRemoveSlot: slotCount > 1,
        needsScroll: slotCount > 3
      });
    }

    // Embedded items (inventory) — the actor's native items
    const inventory = actor.items?.contents.map(item => ({
      id: item.id,
      name: item.name,
      img: item.img,
      type: item.type,
      quantity: item.system?.quantity ?? 1,
      bulk: item.system?.bulk?.value ?? "—",
      value: item.system?.price?.value?.gp ?? item.system?.price?.value ?? "—"
    })) ?? [];

    return {
      actor, data, derived,
      name: actor.name, img: actor.img,
      ac: derived.ac, tl: derived.tl,

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
        arcLabel: ARCS[w.arc]?.label ?? w.arc
      })),

      weaponCatalogOptions: Object.entries(WEAPON_CATALOG).map(([k, v]) => ({
        value: k,
        label: `${v.name} (${v.mount} ${v.type === "tracking" ? "tracking" : "direct"}, ${v.damage})`
      })),

      roleAssignments,
      crewOptions,

      computerNpcId: data.computerNpcId ?? "",
      computerNpcOptions: [
        { id: "", name: "— None —" },
        ...npcActors.map(a => ({ id: a.id, name: a.name, selected: data.computerNpcId === a.id }))
      ],

      inventory,
      hasInventory: inventory.length > 0
    };
  }

  // ── Save fields ─────────────────────────────────────────────────────────
  async #saveFields() {
    if (!this.actor) return;
    const data = getShipData(this.actor);
    if (!data) return;

    this.element.querySelectorAll("[data-field]").forEach(el => {
      const field = el.dataset.field;
      let value = el.type === "number" ? (parseFloat(el.value) || 0) : el.value;
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

  static async #onPickImage() {
    new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: async (path) => {
        await this.actor.update({ img: path });
        this.render({ force: true });
      }
    }).render(true);
  }

  static async #onApplyFrame() {
    await this.#saveFields();
    const sel = this.element.querySelector("[data-field='frame']");
    if (sel?.value) { await applyFrameToActor(this.actor, sel.value); this.render({ force: true }); }
  }

  static async #onAddSubsystem() {
    const sel = this.element.querySelector("[data-subsystem-type-select]");
    const inp = this.element.querySelector("[data-subsystem-name-input]");
    const data = getShipData(this.actor);
    if (!data) return;
    addSubsystem(data, sel?.value ?? "misc", inp?.value || "");
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onRemoveSubsystem(event, target) {
    const data = getShipData(this.actor);
    if (!data) return;
    removeSubsystem(data, target.dataset.subsystemId);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onSetCondition(event, target) {
    const data = getShipData(this.actor);
    if (!data) return;
    const sub = data.subsystems.find(s => s.id === target.dataset.subsystemId);
    if (sub) sub.condition = target.value;
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onAddWeapon() {
    const sel = this.element.querySelector("[data-weapon-catalog-select]");
    const key = sel?.value;
    if (!key || !WEAPON_CATALOG[key]) return;
    const data = getShipData(this.actor);
    if (!data) return;
    addWeapon(data, WEAPON_CATALOG[key]);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static async #onRemoveWeapon(event, target) {
    const data = getShipData(this.actor);
    if (!data) return;
    removeWeapon(data, target.dataset.weaponId);
    await setShipData(this.actor, data);
    this.render({ force: true });
  }

  static #onAddCrewSlot(event, target) {
    const role = target.dataset.role;
    this.crewSlotCounts[role] = (this.crewSlotCounts[role] ?? 1) + 1;
    this.render({ force: true });
  }

  static #onRemoveCrewSlot(event, target) {
    const role = target.dataset.role;
    this.crewSlotCounts[role] = Math.max(1, (this.crewSlotCounts[role] ?? 1) - 1);
    this.render({ force: true });
  }

  static async #onSaveCrew() {
    const data = getShipData(this.actor);
    if (!data) return;
    for (const roleId of Object.keys(ROLES)) {
      const selects = this.element.querySelectorAll(`[data-crew-role="${roleId}"]`);
      const ids = [];
      selects.forEach(sel => { if (sel.value) ids.push(sel.value); });
      saveCrewMemory(data, roleId, ids);
    }
    const compSel = this.element.querySelector("[data-computer-npc]");
    if (compSel) data.computerNpcId = compSel.value || null;
    await setShipData(this.actor, data);
    ui.notifications.info("Crew assignments saved.");
  }

  static async #onRemoveInventoryItem(event, target) {
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
      this.render({ force: true });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  _onRender(context, options) {
    // Tab switching
    const tabBtns = this.element.querySelectorAll(".sc-tab[data-sc-tab]");
    const panes = this.element.querySelectorAll(".tab-pane[data-sc-pane]");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        panes.forEach(p => p.classList.toggle("active", p.dataset.scPane === btn.dataset.scTab));
      });
    });

    // Auto-save fields
    this.element.querySelectorAll("[data-field]").forEach(el => {
      el.addEventListener("change", () => this.#saveFields());
    });

    // Condition selects
    this.element.querySelectorAll("[data-action='setCondition']").forEach(sel => {
      sel.addEventListener("change", (e) => GMStarshipSheet.#onSetCondition.call(this, e, sel));
    });

    // Drag-drop items onto inventory tab
    const dropZone = this.element.querySelector("[data-drop-zone='inventory']");
    if (dropZone) {
      dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("sc-drag-over"); });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("sc-drag-over"));
      dropZone.addEventListener("drop", async (e) => {
        e.preventDefault();
        dropZone.classList.remove("sc-drag-over");
        let dropData;
        try { dropData = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
        if (dropData.type === "Item") {
          const item = await fromUuid(dropData.uuid);
          if (item) {
            await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            this.render({ force: true });
          }
        }
      });
    }
  }
}

// ── Sheet Map ───────────────────────────────────────────────────────────────
const _gmSheets = new Map();
export function openGMSheet(actor) {
  let sheet = _gmSheets.get(actor.id);
  if (sheet && !sheet._destroyed) { sheet.render({ force: true }); return sheet; }
  sheet = new GMStarshipSheet(actor, { id: `sc-gm-${actor.id}` });
  _gmSheets.set(actor.id, sheet);
  sheet.render({ force: true });
  return sheet;
}
