/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3.1
   GM Sheet
   ========================================================================== */

import { MODULE_ID, SUBSYSTEM_TYPES, DAMAGE_CONDITIONS, ROLES, SIZE_CATEGORIES, MANEUVERABILITY, BASE_FRAMES, WEAPON_CATALOG, ARCS, AMMO_CATEGORIES, MOUNT_BULK } from "./constants.js";
import { getShipData, setShipData, getDerived, addSubsystem, removeSubsystem, addWeapon, removeWeapon, applyFrameToActor, saveCrewMemory, getCrewMemory, syncActorFromShipData } from "./ship-data.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class GMStarshipSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  actor = null;
  crewSlotCounts = {};

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    for (const roleId of Object.keys(ROLES)) this.crewSlotCounts[roleId] = 1;
  }

  static DEFAULT_OPTIONS = {
    window: { icon: "fas fa-rocket", resizable: true },
    position: { width: 740, height: 800 },
    classes: ["sc-gm-sheet", "sheet"],
    actions: {
      pickImage: GMStarshipSheet.#onPickImage,
      applyFrame: GMStarshipSheet.#onApplyFrame,
      addSubsystem: GMStarshipSheet.#onAddSubsystem,
      removeSubsystem: GMStarshipSheet.#onRemoveSubsystem,
      setCondition: GMStarshipSheet.#onSetCondition,
      addWeaponFromCatalog: GMStarshipSheet.#onAddWeaponFromCatalog,
      removeWeapon: GMStarshipSheet.#onRemoveWeapon,
      addCrewSlot: GMStarshipSheet.#onAddCrewSlot,
      removeCrewSlot: GMStarshipSheet.#onRemoveCrewSlot,
      saveCrew: GMStarshipSheet.#onSaveCrew,
      removeInventoryItem: GMStarshipSheet.#onRemoveInventoryItem,
      equipWeapon: GMStarshipSheet.#onEquipWeapon
    }
  };

  static PARTS = {
    sheet: { template: `modules/${MODULE_ID}/templates/gm-sheet.hbs`, scrollable: [".sc-body"] }
  };

  get title() { return `⚙ ${this.actor?.name ?? "Starship"} — GM Config`; }

  async _prepareContext(options) {
    const actor = this.actor;
    if (!actor) return {};
    const data = getShipData(actor);
    if (!data) return {};
    const derived = getDerived(data);

    const pcActors = game.actors?.contents.filter(a => a.hasPlayerOwner && a.type === "character") ?? [];
    const npcActors = game.actors?.contents.filter(a => !a.hasPlayerOwner && (a.type === "npc" || a.type === "character")) ?? [];
    const crewOptions = [
      { id: "", name: "— GM —" },
      ...pcActors.map(a => ({ id: a.id, name: a.name })),
      ...npcActors.map(a => ({ id: a.id, name: `${a.name} (NPC)` }))
    ];

    const roleAssignments = [];
    for (const [roleId, roleDef] of Object.entries(ROLES)) {
      const memory = getCrewMemory(data, roleId);
      if (memory.length > this.crewSlotCounts[roleId]) this.crewSlotCounts[roleId] = memory.length;
      const slotCount = Math.max(1, this.crewSlotCounts[roleId]);
      const slots = [];
      for (let i = 0; i < slotCount; i++) {
        slots.push({ index: i, options: crewOptions.map(o => ({ ...o, selected: o.id === (memory[i] ?? "") })) });
      }
      roleAssignments.push({ id: roleId, label: roleDef.label, icon: roleDef.icon, slots, canRemoveSlot: slotCount > 1, needsScroll: slotCount > 3 });
    }

    // Compute cargo usage from embedded items
    const inventoryItems = actor.items?.contents ?? [];
    let cargoUsed = 0;
    const inventory = inventoryItems.map(item => {
      const qty = item.system?.quantity ?? 1;
      const bulkVal = item.system?.bulk?.value ?? 0;
      const totalBulk = bulkVal * qty;
      cargoUsed += totalBulk;
      const isWeapon = item.type === "weapon";
      const isStarshipWeapon = item.getFlag(MODULE_ID, "isStarshipWeapon") === true;
      return { id: item.id, name: item.name, img: item.img, type: item.type, quantity: qty, bulk: bulkVal || "—", value: item.system?.price?.value?.gp ?? "—", isWeapon, isStarshipWeapon };
    });

    return {
      actor, data, derived, name: actor.name, img: actor.img,
      ac: derived.ac, tl: derived.tl,
      sizeOptions: Object.entries(SIZE_CATEGORIES).map(([k, v]) => ({ value: k, label: v.label, selected: data.size === k })),
      manOptions: Object.entries(MANEUVERABILITY).map(([k, v]) => ({ value: k, label: v.label, selected: data.maneuverability === k })),
      frameOptions: Object.entries(BASE_FRAMES).map(([k, v]) => ({ value: k, label: v.name, selected: data.frame === k })),
      dispOptions: ["friendly","enemy","neutral"].map(d => ({ value: d, label: d.charAt(0).toUpperCase()+d.slice(1), selected: data.disposition === d })),
      subsystems: (data.subsystems ?? []).map(s => ({
        ...s, typeLabel: SUBSYSTEM_TYPES[s.type]?.label ?? s.type, icon: SUBSYSTEM_TYPES[s.type]?.icon ?? "fa-gear",
        severity: DAMAGE_CONDITIONS[s.condition]?.severity ?? 0,
        conditionOptions: Object.entries(DAMAGE_CONDITIONS).map(([k, v]) => ({ value: k, label: v.label, selected: s.condition === k }))
      })),
      subsystemTypeOptions: Object.entries(SUBSYSTEM_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
      weapons: (data.weapons ?? []).map(w => ({ ...w, arcLabel: ARCS[w.arc]?.label ?? w.arc, ammoLabel: AMMO_CATEGORIES[w.ammo]?.label ?? "None" })),
      weaponCatalogOptions: Object.entries(WEAPON_CATALOG).map(([k, v]) => ({ value: k, label: `${v.name} (${v.mount}, ${v.damage})` })),
      roleAssignments, crewOptions,
      computerNpcId: data.computerNpcId ?? "",
      computerNpcOptions: [{ id: "", name: "— None —" }, ...npcActors.map(a => ({ id: a.id, name: a.name, selected: data.computerNpcId === a.id }))],
      inventory, hasInventory: inventory.length > 0,
      cargoCapacity: data.cargoCapacity ?? 20, cargoUsed: Math.round(cargoUsed * 10) / 10
    };
  }

  // ── Save all data-field inputs ──────────────────────────────────────────
  async #saveFields() {
    if (!this.actor) return;
    const data = getShipData(this.actor);
    if (!data) return;
    this.element.querySelectorAll("[data-field]").forEach(el => {
      const field = el.dataset.field;
      let value = el.type === "number" ? (parseFloat(el.value) || 0) : el.value;
      const parts = field.split(".");
      let obj = data;
      for (let i = 0; i < parts.length - 1; i++) { if (!obj[parts[i]]) obj[parts[i]] = {}; obj = obj[parts[i]]; }
      obj[parts[parts.length - 1]] = value;
    });
    await setShipData(this.actor, data);
    await syncActorFromShipData(this.actor, data);
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  static async #onPickImage() {
    new FilePicker({ type: "image", current: this.actor.img, callback: async (path) => { await this.actor.update({ img: path }); this.render({ force: true }); } }).render(true);
  }

  static async #onApplyFrame() {
    await this.#saveFields();
    const sel = this.element.querySelector("[data-field='frame']");
    if (sel?.value) { await applyFrameToActor(this.actor, sel.value); this.render({ force: true }); }
  }

  static async #onAddSubsystem() {
    const sel = this.element.querySelector("[data-subsystem-type-select]");
    const inp = this.element.querySelector("[data-subsystem-name-input]");
    const data = getShipData(this.actor); if (!data) return;
    addSubsystem(data, sel?.value ?? "misc", inp?.value || "");
    await setShipData(this.actor, data); this.render({ force: true });
  }

  static async #onRemoveSubsystem(event, target) {
    const data = getShipData(this.actor); if (!data) return;
    removeSubsystem(data, target.dataset.subsystemId);
    await setShipData(this.actor, data); this.render({ force: true });
  }

  static async #onSetCondition(event, target) {
    const data = getShipData(this.actor); if (!data) return;
    const sub = data.subsystems.find(s => s.id === target.dataset.subsystemId);
    if (sub) sub.condition = target.value;
    await setShipData(this.actor, data); this.render({ force: true });
  }

  static async #onAddWeaponFromCatalog() {
    const sel = this.element.querySelector("[data-weapon-catalog-select]");
    const key = sel?.value; if (!key || !WEAPON_CATALOG[key]) return;
    const data = getShipData(this.actor); if (!data) return;
    addWeapon(data, WEAPON_CATALOG[key]);
    await setShipData(this.actor, data); this.render({ force: true });
  }

  static async #onRemoveWeapon(event, target) {
    const data = getShipData(this.actor); if (!data) return;
    removeWeapon(data, target.dataset.weaponId);
    await setShipData(this.actor, data); this.render({ force: true });
  }

  static #onAddCrewSlot(event, target) {
    this.crewSlotCounts[target.dataset.role] = (this.crewSlotCounts[target.dataset.role] ?? 1) + 1;
    this.render({ force: true });
  }
  static #onRemoveCrewSlot(event, target) {
    this.crewSlotCounts[target.dataset.role] = Math.max(1, (this.crewSlotCounts[target.dataset.role] ?? 1) - 1);
    this.render({ force: true });
  }

  static async #onSaveCrew() {
    const data = getShipData(this.actor); if (!data) return;
    for (const roleId of Object.keys(ROLES)) {
      const sels = this.element.querySelectorAll(`[data-crew-role="${roleId}"]`);
      const ids = []; sels.forEach(s => { if (s.value) ids.push(s.value); });
      saveCrewMemory(data, roleId, ids);
    }
    const compSel = this.element.querySelector("[data-computer-npc]");
    if (compSel) data.computerNpcId = compSel.value || null;
    await setShipData(this.actor, data);
    ui.notifications.info("Crew assignments saved.");
  }

  static async #onRemoveInventoryItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) { await item.delete(); this.render({ force: true }); }
  }

  static async #onEquipWeapon(event, target) {
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    // Read weapon data from the item's flags or try to build from item data
    const flagData = item.getFlag(MODULE_ID, "weaponData");
    const data = getShipData(this.actor); if (!data) return;
    if (flagData) {
      addWeapon(data, flagData);
    } else {
      // Build a basic weapon entry from the item
      addWeapon(data, {
        name: item.name, type: "directFire", mount: "light",
        damage: item.system?.damage?.formula ?? "1d6",
        range: "medium", pcu: 5, bp: 5, ammo: "none"
      });
    }
    await setShipData(this.actor, data);
    this.render({ force: true });
    ui.notifications.info(`${item.name} equipped as starship weapon.`);
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

    // Drag-drop on weapons tab AND inventory/cargo tab
    for (const zone of this.element.querySelectorAll("[data-drop-zone]")) {
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("sc-drag-over"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("sc-drag-over"));
      zone.addEventListener("drop", async (e) => {
        e.preventDefault(); zone.classList.remove("sc-drag-over");
        let dropData;
        try { dropData = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
        if (dropData.type === "Item") {
          const item = await fromUuid(dropData.uuid);
          if (item) {
            // Add the item to the actor's embedded items
            const created = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            // If dropped on weapons zone AND it's a weapon, also equip it
            if (zone.dataset.dropZone === "weapons" && item.type === "weapon" && created?.[0]) {
              const flagData = item.getFlag(MODULE_ID, "weaponData");
              const data = getShipData(this.actor);
              if (data && flagData) {
                addWeapon(data, flagData);
                await setShipData(this.actor, data);
              }
            }
            this.render({ force: true });
          }
        }
      });
    }
  }
}

const _gmSheets = new Map();
export function openGMSheet(actor) {
  let sheet = _gmSheets.get(actor.id);
  if (sheet && !sheet._destroyed) { sheet.render({ force: true }); return sheet; }
  sheet = new GMStarshipSheet(actor, { id: `sc-gm-${actor.id}` });
  _gmSheets.set(actor.id, sheet);
  sheet.render({ force: true });
  return sheet;
}
