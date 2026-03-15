/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Main: Module init, hooks, scene controls
   ========================================================================== */

import { registerStarshipSystem, showCreateStarshipDialog, isStarship, openStarshipSheet, createStarshipActor } from "./starship-actor.js";
import { StarshipCombatUI } from "./combat-ui.js";
import { CombatManager } from "./combat-manager.js";

const MODULE_ID = "starship-combat-ftl";

let _combatUI = null;
function getCombatUI() {
  if (!_combatUI) _combatUI = new StarshipCombatUI();
  return _combatUI;
}

// ── Init ────────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Starship Combat — FTL Edition v2`);

  // Settings
  game.settings.register(MODULE_ID, "enableChatCards", {
    name: "Enable Chat Cards",
    hint: "Post combat actions to the chat log.",
    scope: "world", config: true, type: Boolean, default: true
  });
});

// ── Ready ───────────────────────────────────────────────────────────────────
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Module ready`);

  // Register the flag-based starship system (hooks, buttons, sheet redirect)
  registerStarshipSystem();

  // Global API
  game.modules.get(MODULE_ID).api = {
    openCombatUI: () => getCombatUI().render({ force: true }),
    getCombatUI,
    getCombatManager: () => CombatManager.get(),
    createStarship: createStarshipActor,
    showCreateDialog: showCreateStarshipDialog,
    isStarship,
    openSheet: openStarshipSheet
  };

  globalThis.StarshipCombat = {
    open: () => getCombatUI().render({ force: true }),
    close: () => { if (_combatUI) _combatUI.close(); },
    manager: () => CombatManager.get(),
    createShip: (name, frame) => createStarshipActor(name, frame),
    createDialog: () => showCreateStarshipDialog()
  };

  if (game.user.isGM) {
    console.log(`${MODULE_ID} | ✓ Ready. Use the 🚀 button in token controls or run StarshipCombat.open()`);
    console.log(`${MODULE_ID} | ✓ Create ships via "Create Starship" button in Actor Directory`);
    console.log(`${MODULE_ID} | ✓ Or run StarshipCombat.createDialog() / StarshipCombat.createShip("My Ship")`);
  }
});

// ── Scene Controls ──────────────────────────────────────────────────────────
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (tokenControls) {
    tokenControls.tools.push({
      name: "starship-combat",
      title: "Starship Combat",
      icon: "fas fa-rocket",
      button: true,
      onClick: () => getCombatUI().render({ force: true }),
      visible: game.user.isGM
    });
  }
});
