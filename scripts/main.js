/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v2
   Main: Module init, hooks, actor registration, scene controls
   ========================================================================== */

import { registerStarshipActor } from "./starship-actor.js";
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

  // Register the Starship actor type
  registerStarshipActor();

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

  // Global API
  game.modules.get(MODULE_ID).api = {
    openCombatUI: () => getCombatUI().render({ force: true }),
    getCombatUI,
    getCombatManager: () => CombatManager.get()
  };

  globalThis.StarshipCombat = {
    open: () => getCombatUI().render({ force: true }),
    close: () => { if (_combatUI) _combatUI.close(); },
    manager: () => CombatManager.get()
  };
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

// ── Actor Type Icon ─────────────────────────────────────────────────────────
Hooks.on("renderActorDirectory", (app, html) => {
  // Add starship icon to starship actors in the directory
  html.querySelectorAll?.(".document")?.forEach(el => {
    const id = el.dataset?.documentId;
    if (id) {
      const actor = game.actors.get(id);
      if (actor?.type === "starship") {
        const nameEl = el.querySelector(".document-name");
        if (nameEl && !nameEl.querySelector(".fa-rocket")) {
          const icon = document.createElement("i");
          icon.className = "fas fa-rocket";
          icon.style.marginRight = "4px";
          icon.style.opacity = "0.6";
          nameEl.prepend(icon);
        }
      }
    }
  });
});
