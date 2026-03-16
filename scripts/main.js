/* ==========================================================================
   STARSHIP COMBAT — FTL EDITION v3.1
   Main
   ========================================================================== */

import { MODULE_ID } from "./constants.js";
import { isStarship, showCreateStarshipDialog, createStarshipActor, ensureWeaponCompendium } from "./ship-data.js";
import { openGMSheet } from "./gm-sheet.js";
import { openPlayerSheet } from "./player-sheet.js";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing v3.1`);
  game.settings.register(MODULE_ID, "enableChatCards", {
    name: "Enable Chat Cards", hint: "Post combat actions to the chat log.",
    scope: "world", config: true, type: Boolean, default: true
  });
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
  registerHooks();
  ensureWeaponCompendium();

  game.modules.get(MODULE_ID).api = {
    createStarship: createStarshipActor,
    showCreateDialog: showCreateStarshipDialog,
    isStarship, openGMSheet, openPlayerSheet
  };
  globalThis.StarshipCombat = {
    createShip: (n, f) => createStarshipActor(n, f),
    createDialog: () => showCreateStarshipDialog(),
    openGM: (a) => openGMSheet(a),
    openPlayer: (a) => openPlayerSheet(a)
  };
});

function registerHooks() {
  // Route actor sheets
  Hooks.on("renderActorSheet", (sheet, html, data) => {
    const actor = sheet.document ?? sheet.actor;
    if (!actor || !isStarship(actor)) return;
    setTimeout(() => {
      sheet.close();
      game.user.isGM ? openGMSheet(actor) : openPlayerSheet(actor);
    }, 50);
  });

  // Actor directory: Create Starship button + rocket icons
  Hooks.on("renderActorDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    // Button
    const header = root.querySelector(".header-actions");
    if (header && !header.querySelector(".sc-create-btn")) {
      const btn = document.createElement("button");
      btn.className = "sc-create-btn";
      btn.type = "button";
      btn.innerHTML = `<i class="fas fa-rocket"></i> Starship`;
      btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); showCreateStarshipDialog(); });
      header.appendChild(btn);
    }

    // Rocket icons inline before name
    root.querySelectorAll(".directory-item.document, .directory-item[data-document-id], .directory-item[data-entry-id]").forEach(el => {
      const id = el.dataset?.documentId ?? el.dataset?.entryId;
      if (!id) return;
      const actor = game.actors.get(id);
      if (!actor || !isStarship(actor)) return;
      // Find the deepest text-containing element for the name
      const nameEl = el.querySelector(".document-name a, .entry-name a, .document-name span, .entry-name span") ?? el.querySelector(".document-name, .entry-name");
      if (!nameEl || nameEl.querySelector(".sc-ship-icon")) return;
      const icon = document.createElement("i");
      icon.className = "fas fa-rocket sc-ship-icon";
      icon.style.cssText = "margin-right: 3px; font-size: 0.8em; color: #4b6584; vertical-align: baseline;";
      nameEl.insertBefore(icon, nameEl.firstChild);
    });
  });
}

Hooks.on("getSceneControlButtons", (controls) => {
  const tc = controls.find(c => c.name === "token");
  if (tc) tc.tools.push({
    name: "starship-combat", title: "Starship Combat", icon: "fas fa-rocket",
    button: true, onClick: () => showCreateStarshipDialog(), visible: game.user.isGM
  });
});
