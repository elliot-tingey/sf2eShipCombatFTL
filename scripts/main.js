/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   Main: Init, hooks, sheet routing, scene controls
   ========================================================================== */

import { MODULE_ID } from "./constants.js";
import { isStarship, showCreateStarshipDialog, createStarshipActor, ensureWeaponCompendium } from "./ship-data.js";
import { openGMSheet } from "./gm-sheet.js";
import { openPlayerSheet } from "./player-sheet.js";

// ── Init ────────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Starship Combat — FTL Edition v3`);
  game.settings.register(MODULE_ID, "enableChatCards", {
    name: "Enable Chat Cards", hint: "Post combat actions to the chat log.",
    scope: "world", config: true, type: Boolean, default: true
  });
});

// ── Ready ───────────────────────────────────────────────────────────────────
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Module ready`);
  registerStarshipHooks();

  // Create weapon compendium if it doesn't exist
  ensureWeaponCompendium();

  game.modules.get(MODULE_ID).api = {
    createStarship: createStarshipActor,
    showCreateDialog: showCreateStarshipDialog,
    isStarship, openGMSheet, openPlayerSheet
  };

  globalThis.StarshipCombat = {
    createShip: (name, frame) => createStarshipActor(name, frame),
    createDialog: () => showCreateStarshipDialog(),
    openGM: (actor) => openGMSheet(actor),
    openPlayer: (actor) => openPlayerSheet(actor)
  };

  if (game.user.isGM) {
    console.log(`${MODULE_ID} | ✓ Use "Create Starship" button in Actor Directory`);
  }
});


// ── Hooks ───────────────────────────────────────────────────────────────────

function registerStarshipHooks() {

  // Intercept actor sheet → route to GM or player sheet
  Hooks.on("renderActorSheet", (sheet, html, data) => {
    const actor = sheet.document ?? sheet.actor;
    if (!actor || !isStarship(actor)) return;
    setTimeout(() => {
      sheet.close();
      if (game.user.isGM) openGMSheet(actor);
      else openPlayerSheet(actor);
    }, 50);
  });

  // Add button + mark starships in Actor directory
  Hooks.on("renderActorDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    // "Create Starship" button
    const headerActions = root.querySelector(".header-actions");
    if (headerActions && !headerActions.querySelector(".sc-create-btn")) {
      const btn = document.createElement("button");
      btn.className = "sc-create-btn";
      btn.type = "button";
      btn.innerHTML = `<i class="fas fa-rocket"></i> Create Starship`;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCreateStarshipDialog();
      });
      headerActions.appendChild(btn);
    }

    // Add inline rocket icon BEFORE each starship actor's name text
    root.querySelectorAll(".directory-item.document, .directory-item[data-document-id], .directory-item[data-entry-id]").forEach(el => {
      const id = el.dataset?.documentId ?? el.dataset?.entryId;
      if (!id) return;
      const actor = game.actors.get(id);
      if (!actor || !isStarship(actor)) return;

      // Find the name element — sf2e uses various selectors
      const nameEl = el.querySelector(".document-name a, .document-name span, .entry-name a, .entry-name span, .document-name, .entry-name");
      if (!nameEl || nameEl.querySelector(".sc-ship-icon")) return;

      // Create a small inline icon that sits before the text
      const icon = document.createElement("i");
      icon.className = "fas fa-rocket sc-ship-icon";
      icon.style.cssText = "margin-right: 4px; font-size: 0.75em; color: #4b6584;";

      // Insert before the first text node
      if (nameEl.firstChild) {
        nameEl.insertBefore(icon, nameEl.firstChild);
      } else {
        nameEl.prepend(icon);
      }
    });
  });
}

// ── Scene Controls ──────────────────────────────────────────────────────────
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (tokenControls) {
    tokenControls.tools.push({
      name: "starship-combat",
      title: "Starship Combat",
      icon: "fas fa-rocket",
      button: true,
      onClick: () => {
        // For now, open create dialog. Combat panel coming in future update.
        showCreateStarshipDialog();
      },
      visible: game.user.isGM
    });
  }
});
