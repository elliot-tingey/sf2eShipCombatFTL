/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3
   Main: Init, hooks, sheet routing, scene controls
   ========================================================================== */

import { MODULE_ID } from "./constants.js";
import { isStarship, showCreateStarshipDialog, createStarshipActor, getShipData } from "./ship-data.js";
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

  // Register sheet routing and directory button
  registerStarshipHooks();

  // Global API
  game.modules.get(MODULE_ID).api = {
    createStarship: createStarshipActor,
    showCreateDialog: showCreateStarshipDialog,
    isStarship,
    openGMSheet,
    openPlayerSheet
  };

  globalThis.StarshipCombat = {
    createShip: (name, frame) => createStarshipActor(name, frame),
    createDialog: () => showCreateStarshipDialog(),
    openGM: (actor) => openGMSheet(actor),
    openPlayer: (actor) => openPlayerSheet(actor)
  };

  if (game.user.isGM) {
    console.log(`${MODULE_ID} | ✓ Use "Create Starship" button in Actor Directory`);
    console.log(`${MODULE_ID} | ✓ Or: StarshipCombat.createDialog()`);
  }
});


// ── Hook Registration ───────────────────────────────────────────────────────

function registerStarshipHooks() {

  // Intercept actor sheet open → route to GM or player sheet
  Hooks.on("renderActorSheet", (sheet, html, data) => {
    const actor = sheet.document ?? sheet.actor;
    if (!actor || !isStarship(actor)) return;

    // Close the system's default sheet
    setTimeout(() => {
      sheet.close();
      // Route: GM gets config sheet, players get action sheet
      if (game.user.isGM) {
        openGMSheet(actor);
      } else {
        openPlayerSheet(actor);
      }
    }, 50);
  });

  // Add "Create Starship" button to Actor directory
  Hooks.on("renderActorDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    const headerActions = root.querySelector(".header-actions");
    if (!headerActions || headerActions.querySelector(".sc-create-btn")) return;

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

    // Mark starship actors with rocket icon
    root.querySelectorAll(".directory-item.document, .directory-item[data-document-id], .directory-item[data-entry-id]").forEach(el => {
      const id = el.dataset?.documentId ?? el.dataset?.entryId;
      if (!id) return;
      const actor = game.actors.get(id);
      if (actor && isStarship(actor)) {
        const nameEl = el.querySelector(".document-name, .entry-name");
        if (nameEl && !nameEl.querySelector(".fa-rocket")) {
          const icon = document.createElement("i");
          icon.className = "fas fa-rocket";
          icon.style.cssText = "margin-right: 4px; opacity: 0.7; color: var(--color-text-hyperlink, #4f8eff);";
          nameEl.prepend(icon);
        }
      }
    });
  });
}
