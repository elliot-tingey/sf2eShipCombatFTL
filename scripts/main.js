/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION
   Main: Module initialization, hooks, settings, and scene controls
   ========================================================================== */

import { StarshipCombatUI } from "./combat-ui.js";

const MODULE_ID = "starship-combat-ftl";

// ── Singleton instance ──────────────────────────────────────────────────────
let _combatUI = null;

function getCombatUI() {
  if (!_combatUI) _combatUI = new StarshipCombatUI();
  return _combatUI;
}


// ── Initialization ──────────────────────────────────────────────────────────

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Starship Combat — FTL Edition`);

  // Register module settings
  game.settings.register(MODULE_ID, "enableChatCards", {
    name: "Enable Chat Cards",
    hint: "Post combat actions and results to the chat log.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "autoAdvancePhase", {
    name: "Auto-Advance Phase",
    hint: "Automatically advance to the next phase when all roles for the current phase have acted.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Register Handlebars helpers
  Handlebars.registerHelper("scIf", function(a, b, opts) {
    return a === b ? opts.fn(this) : opts.inverse(this);
  });

  console.log(`${MODULE_ID} | Initialization complete`);
});


// ── Ready Hook ──────────────────────────────────────────────────────────────

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Module ready`);

  // Make accessible globally for macros
  game.modules.get(MODULE_ID).api = {
    openCombatUI: () => getCombatUI().render({force: true}),
    getCombatUI
  };
});


// ── Scene Controls ──────────────────────────────────────────────────────────

Hooks.on("getSceneControlButtons", (controls) => {
  // Add a button to the token controls group
  const tokenControls = controls.find(c => c.name === "token");
  if (tokenControls) {
    tokenControls.tools.push({
      name: "starship-combat",
      title: "Starship Combat",
      icon: "fas fa-rocket",
      button: true,
      onClick: () => getCombatUI().render({force: true}),
      visible: game.user.isGM
    });
  }
});


// ── Macro Support ───────────────────────────────────────────────────────────

Hooks.once("ready", () => {
  // Register a global function for easy macro access
  globalThis.StarshipCombat = {
    open: () => getCombatUI().render({force: true}),
    close: () => { if (_combatUI) _combatUI.close(); },
    getState: () => getCombatUI().combatState
  };
});
