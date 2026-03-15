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

  // Verify starship actor type is available
  const typeExists = "starship" in (CONFIG.Actor.dataModels ?? {});
  const labelExists = CONFIG.Actor.typeLabels?.starship;
  if (typeExists && labelExists) {
    console.log(`${MODULE_ID} | ✓ Starship actor type is registered and available`);
  } else {
    console.warn(`${MODULE_ID} | ⚠ Starship type may not be available in the actor creation dialog.`);
    console.warn(`${MODULE_ID} |   typeLabels: ${labelExists ? "OK" : "MISSING"}, dataModels: ${typeExists ? "OK" : "MISSING"}`);
    console.warn(`${MODULE_ID} |   If the sf2e system overrides actor types, you may need to create a "vehicle" type actor and manually set its type to "starship" via the console.`);

    // Diagnostic: show what types are available
    console.log(`${MODULE_ID} |   Available actor types:`, Object.keys(CONFIG.Actor.typeLabels ?? {}));
    console.log(`${MODULE_ID} |   Available data models:`, Object.keys(CONFIG.Actor.dataModels ?? {}));

    // Show a user-friendly notification
    if (game.user.isGM) {
      ui.notifications.info(
        `Starship Combat: If "Starship" doesn't appear as an actor type, open the console (F12) for troubleshooting info.`,
        { permanent: false }
      );
    }
  }

  // Global API
  game.modules.get(MODULE_ID).api = {
    openCombatUI: () => getCombatUI().render({ force: true }),
    getCombatUI,
    getCombatManager: () => CombatManager.get(),
    // Manual starship creation helper
    createStarship: async (name = "New Starship") => {
      const actor = await Actor.create({ name, type: "starship" });
      if (actor) {
        ui.notifications.info(`Created starship: ${name}`);
        actor.sheet.render(true);
      }
      return actor;
    }
  };

  globalThis.StarshipCombat = {
    open: () => getCombatUI().render({ force: true }),
    close: () => { if (_combatUI) _combatUI.close(); },
    manager: () => CombatManager.get(),
    createShip: async (name) => game.modules.get(MODULE_ID).api.createStarship(name)
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
