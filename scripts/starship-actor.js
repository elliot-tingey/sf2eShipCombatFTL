/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Starship Actor: Data model, sheet, and registration
   ========================================================================== */

import { SIZE_CATEGORIES, MANEUVERABILITY, ARCS, SHIELD_QUADRANTS, CRITICAL_SYSTEMS, CRIT_CONDITIONS, BASE_FRAMES, WEAPON_CATALOG, SHIELD_CATALOG, ARMOR_CATALOG, COUNTERMEASURES_CATALOG, COMPUTER_CATALOG, SENSOR_CATALOG } from "./constants.js";
import { calcAC, calcTL, getTotalShields, getMaxShields, getCritPenalties } from "./combat-engine.js";

const MODULE_ID = "starship-combat-ftl";

// ── Data Model ──────────────────────────────────────────────────────────────

export class StarshipDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      tier:              new f.NumberField({ initial: 1, integer: true, min: 0.25, max: 20 }),
      size:              new f.StringField({ initial: "medium", choices: Object.keys(SIZE_CATEGORIES) }),
      frame:             new f.StringField({ initial: "explorer" }),
      maneuverability:   new f.StringField({ initial: "average", choices: Object.keys(MANEUVERABILITY) }),
      speed:             new f.NumberField({ initial: 8, integer: true, min: 0 }),
      turnDistance:       new f.NumberField({ initial: 2, integer: true, min: 0 }),
      hull: new f.SchemaField({
        current: new f.NumberField({ initial: 55, integer: true, min: 0 }),
        max:     new f.NumberField({ initial: 55, integer: true, min: 1 })
      }),
      hpIncrement:       new f.NumberField({ initial: 10, integer: true, min: 1 }),
      dt:                new f.NumberField({ initial: 0, integer: true, min: 0 }),
      ct:                new f.NumberField({ initial: 11, integer: true, min: 1 }),
      pilotRanks:        new f.NumberField({ initial: 5, integer: true, min: 0 }),
      armorBonus:        new f.NumberField({ initial: 2, integer: true, min: 0 }),
      armorTlPenalty:    new f.NumberField({ initial: 0, integer: true, max: 0 }),
      countermeasuresBonus: new f.NumberField({ initial: 1, integer: true, min: 0 }),
      computerBonus:     new f.NumberField({ initial: 1, integer: true, min: 0 }),
      computerNodes:     new f.NumberField({ initial: 1, integer: true, min: 0 }),
      sensorMod:         new f.NumberField({ initial: 0, integer: true }),
      sensorRange:       new f.StringField({ initial: "medium" }),
      shields: new f.SchemaField({
        total:     new f.NumberField({ initial: 40, integer: true, min: 0 }),
        forward:   new f.SchemaField({ current: new f.NumberField({ initial: 10, integer: true, min: 0 }), max: new f.NumberField({ initial: 10, integer: true, min: 0 }) }),
        port:      new f.SchemaField({ current: new f.NumberField({ initial: 10, integer: true, min: 0 }), max: new f.NumberField({ initial: 10, integer: true, min: 0 }) }),
        starboard: new f.SchemaField({ current: new f.NumberField({ initial: 10, integer: true, min: 0 }), max: new f.NumberField({ initial: 10, integer: true, min: 0 }) }),
        aft:       new f.SchemaField({ current: new f.NumberField({ initial: 10, integer: true, min: 0 }), max: new f.NumberField({ initial: 10, integer: true, min: 0 }) })
      }),
      weapons:    new f.ArrayField(new f.ObjectField()),
      criticals:  new f.ObjectField({ initial: {} }),
      modifiers:  new f.ObjectField({ initial: {} }),
      disposition: new f.StringField({ initial: "friendly", choices: ["friendly", "enemy", "neutral"] }),
      notes:      new f.HTMLField({ initial: "" })
    };
  }

  // Derived values
  get ac() { return calcAC(this); }
  get tl() { return calcTL(this); }
  get totalShields() { return getTotalShields(this); }
  get maxShields() { return getMaxShields(this); }
  get hullPercent() { return Math.max(0, (this.hull.current / this.hull.max) * 100); }
  get isDestroyed() { return this.hull.current <= 0; }
  get critPenalties() { return getCritPenalties(this); }
}


// ── Actor Sheet ─────────────────────────────────────────────────────────────

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class StarshipSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    window: {
      icon: "fas fa-rocket",
      resizable: true
    },
    position: {
      width: 680,
      height: 720
    },
    classes: ["starship-sheet-app"],
    form: {
      submitOnChange: true
    }
  };

  static PARTS = {
    sheet: {
      template: `modules/${MODULE_ID}/templates/starship-sheet.hbs`,
      scrollable: [".sc-sheet-body"]
    }
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const sys = this.document.system;
    const ctx = {
      actor: this.document,
      system: sys,
      name: this.document.name,
      img: this.document.img,
      ac: sys.ac,
      tl: sys.tl,
      hullPercent: sys.hullPercent,
      totalShields: sys.totalShields,
      maxShields: sys.maxShields,
      isDestroyed: sys.isDestroyed,
      critPenalties: sys.critPenalties,

      // Catalogs for selects
      sizeOptions: Object.entries(SIZE_CATEGORIES).map(([k, v]) => ({ value: k, label: v.label, selected: sys.size === k })),
      maneuverabilityOptions: Object.entries(MANEUVERABILITY).map(([k, v]) => ({ value: k, label: v.label, selected: sys.maneuverability === k })),
      frameOptions: Object.entries(BASE_FRAMES).map(([k, v]) => ({ value: k, label: v.name, selected: sys.frame === k })),
      dispositionOptions: [
        { value: "friendly", label: "Friendly", selected: sys.disposition === "friendly" },
        { value: "enemy", label: "Enemy", selected: sys.disposition === "enemy" },
        { value: "neutral", label: "Neutral", selected: sys.disposition === "neutral" }
      ],

      // Quadrant shields
      shieldQuadrants: SHIELD_QUADRANTS.map(q => ({
        id: q, label: ARCS[q]?.label ?? q,
        current: sys.shields[q]?.current ?? 0,
        max: sys.shields[q]?.max ?? 0,
        percent: sys.shields[q]?.max > 0 ? (sys.shields[q].current / sys.shields[q].max * 100) : 0
      })),

      // Weapons
      weapons: (sys.weapons ?? []).map((w, i) => ({ ...w, index: i })),

      // Critical systems
      criticalSystems: Object.entries(CRITICAL_SYSTEMS).map(([id, def]) => ({
        id,
        label: def.label,
        icon: def.icon,
        condition: sys.criticals?.[id] ?? "nominal",
        conditionLabel: CRIT_CONDITIONS[sys.criticals?.[id] ?? "nominal"]?.label ?? "Nominal",
        severity: CRIT_CONDITIONS[sys.criticals?.[id] ?? "nominal"]?.severity ?? 0
      })),

      // Weapon catalog for adding
      weaponCatalogOptions: Object.entries(WEAPON_CATALOG).map(([k, v]) => ({ value: k, label: `${v.name} (${v.mount}, ${v.damage})` }))
    };
    return ctx;
  }
}


// ── Registration ────────────────────────────────────────────────────────────

export function registerStarshipActor() {
  const typeKey = "starship";

  // 1. Register the type label — this makes it appear in the "Create Actor" dialog dropdown
  if (!CONFIG.Actor.typeLabels) CONFIG.Actor.typeLabels = {};
  CONFIG.Actor.typeLabels[typeKey] = "Starship";

  // 2. Register the type icon — shows in the actor directory
  if (!CONFIG.Actor.typeIcons) CONFIG.Actor.typeIcons = {};
  CONFIG.Actor.typeIcons[typeKey] = "fas fa-rocket";

  // 3. Register the TypeDataModel — defines the schema for this actor type
  if (!CONFIG.Actor.dataModels) CONFIG.Actor.dataModels = {};
  CONFIG.Actor.dataModels[typeKey] = StarshipDataModel;

  // 4. Register the sheet class
  Actors.registerSheet(MODULE_ID, StarshipSheet, {
    types: [typeKey],
    makeDefault: true,
    label: "Starship Sheet (FTL)"
  });

  // 5. Set a default icon for newly created starship actors
  Hooks.on("preCreateActor", (actor, data) => {
    if (data.type === typeKey && !data.img) {
      actor.updateSource({ img: "icons/svg/ship.svg" });
    }
  });

  console.log(`${MODULE_ID} | Registered Starship actor type: label, icon, data model, and sheet`);
}

/**
 * Helper: Apply a base frame template to a starship actor.
 */
export async function applyFrameToActor(actor, frameId) {
  const frame = BASE_FRAMES[frameId];
  if (!frame) return;

  const updateData = {
    "system.frame": frameId,
    "system.size": frame.size,
    "system.maneuverability": frame.maneuverability ?? "average",
    "system.hull.max": frame.hp,
    "system.hull.current": frame.hp,
    "system.hpIncrement": frame.hpIncrement,
    "system.dt": frame.dt,
    "system.ct": frame.ct ?? Math.floor(frame.hp / 5),
    "system.speed": MANEUVERABILITY[frame.maneuverability]?.turn <= 1 ? 10 : 8
  };

  await actor.update(updateData);
}
