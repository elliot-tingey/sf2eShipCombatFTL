# Starship Combat — FTL Edition

A complete FTL-inspired starship combat system for Foundry VTT v13. Five crew roles, targeted system damage, power management, and deep tactical decision-making — all in a single plug-and-play module.

---

## Installation

1. Copy the `starship-combat-ftl` folder into your Foundry VTT `Data/modules/` directory
2. Restart Foundry (or reload)
3. Enable **Starship Combat — FTL Edition** in your world's Module Management
4. A rocket icon (🚀) appears in the Token Controls sidebar — click it to open the combat panel
5. Alternatively, run the macro: `StarshipCombat.open()`

---

## How It Works

### Setup

1. Open the Starship Combat panel
2. **Select a Player Ship** template (Corvette, Frigate, or Cruiser)
3. **Select an Enemy Ship** template (Pirate Raider, Military Patrol, Pirate Dreadnought, or Alien Vessel)
4. **Optionally assign PCs** to crew roles (Pilot, Gunner, Security, ArcNet Officer, Engineer)
5. Click **Start Combat**

### Combat Round Structure

Each round flows through **5 phases** in order. Press "Next Phase" to advance:

| Phase | Who Acts | Purpose |
|---|---|---|
| **Engineering** | Engineer | Repair, reroute power, overclock |
| **Helm** | Pilot | Movement, evasion, positioning |
| **Operations** | Security + ArcNet Officer | Scanning, hacking, boarding, barriers |
| **Gunnery** | Gunner | Weapons fire |
| **End of Round** | Automatic | Shield regen, fire/breach damage, status cleanup |

Each crew member gets **exactly 1 action per round**.

### Skill Checks

Every action (except Reroute Power) requires a skill check:

- **Roll**: `1d20 + Skill Modifier` vs **DC**
- Enter the character's relevant skill modifier in the "Skill Modifier" field
- **Critical Success**: Roll beats DC by 10+ or natural 20
- **Critical Failure**: Roll misses DC by 10+ or natural 1
- Results are posted to Foundry chat for all players to see

---

## The Five Roles

### ⚙️ Engineer
*Phase: Engineering | Skill: Engineering/Crafting*

The Engineer keeps the ship alive. They manage the reactor's power distribution and repair damaged systems. The most versatile role — never without something critical to do.

| Action | DC | Effect |
|---|---|---|
| **Repair System** | 14 | Restore 1 HP to a damaged system. Crit: 2 HP. Also extinguishes fires. |
| **Reroute Power** | Auto | Freely redistribute reactor power between all systems. No check needed. |
| **Emergency Patch** | 12 | Bring a DISABLED (0 HP) system back online at 1 HP. |
| **Overclock** | 18 | Double a system's power this round. Fail: 1 damage to system. Crit fail: 2 damage. |

### 🛩️ Pilot
*Phase: Helm | Skill: Piloting*

The Pilot controls the ship's position, evasion, and engagement range. A good pilot makes the gunner's life easy and the enemy's life miserable.

| Action | DC | Effect |
|---|---|---|
| **Evasive Maneuvers** | 15 | +2 evasion this round. Crit: +4. |
| **Full Thrust** | 12 | Change engagement range (Close / Medium / Long). |
| **Flyby** | 18 | Next friendly attack gets +2. Crit: +4. |
| **Ramming Speed** | 20 | Ram the enemy. Deal engine-power × d6 damage to both ships. Forces Close range. |

### 🎯 Gunner
*Phase: Gunnery | Skill: Ranged Attack / Gunnery*

The Gunner is the ship's teeth. They choose which weapon to fire and which enemy system to target. The FTL core loop lives here — destroy their weapons or their shields? Their engines or their sensors?

| Action | DC | Effect |
|---|---|---|
| **Fire Weapon** | vs AC | Standard attack. Pick weapon + target system. |
| **Broadside** | vs AC | Fire ALL weapons at -2 penalty each. |
| **Precise Shot** | vs AC | -4 penalty. On hit: +50% damage, 80% goes to system. |
| **Suppressive Fire** | 15 | Enemy takes -2 to all checks this round. Crit: -4. |

### 🛡️ Security
*Phase: Operations | Skill: Computers / Athletics / Perception*

Security handles intelligence (scanning), electronic warfare, boarding actions, and defensive preparation. The information asymmetry they create drives tactical decisions.

| Action | DC | Skill | Effect |
|---|---|---|---|
| **Deep Scan** | 14 | Computers | Reveal ALL enemy system HP and power. Crit: also weapons. |
| **Launch Boarding** | 16 | Athletics | Disable one enemy system for 1 round. **Close range only.** |
| **Brace for Impact** | 12 | Athletics | Reduce next incoming damage by 1d6+2. Crit: 2d6+2. |
| **Electronic Warfare** | 16 | Computers | Enemy gets -2 to attacks. Crit: -4. |

### ✨ ArcNet Officer
*Phase: Operations | Skill: Arcana / Computers*

The ArcNet Officer channels the ship's magical-technological hybrid systems. They can boost friendly systems, hack enemy systems, project barriers, or deploy countermeasures. The wildcard role.

| Action | DC | Skill | Effect |
|---|---|---|---|
| **Boost System** | 14 | Arcana | +1 power to a friendly system (free, no reactor cost). Crit: +2. |
| **Hack Systems** | 18 | Computers | Reduce enemy system power by 1 this round. Crit: by 2. |
| **Arcane Barrier** | 15 | Arcana | Grant temporary shield points = (roll - 10). Crit: double. |
| **Countermeasures** | 16 | Computers | Remove one enemy buff or one friendly debuff. |

---

## Ship Systems

Every ship has 6 systems, each inspired by FTL's room-based design:

| System | Max HP | Max Power | Effect per Power Level |
|---|---|---|---|
| **Shields** | 4 | 3 | Regenerate 2 shield points per power level each round |
| **Weapons** | 4 | 3 | Required for attacks. Damage penalty when damaged |
| **Engines** | 4 | 3 | +1 evasion per power level |
| **Sensors** | 3 | 2 | +2 accuracy bonus per power level |
| **Life Support** | 3 | 2 | At 0 power: ship takes 2 hull damage per round |
| **ArcNet Core** | 3 | 2 | Powers ArcNet Officer actions |

### System Degradation

As systems take damage, they lose effectiveness:

| HP Remaining | Status | Check Penalty | Max Power Reduction |
|---|---|---|---|
| 75–100% | ONLINE | 0 | 0 |
| 50–74% | STRESSED | -1 | 0 |
| 25–49% | DAMAGED | -2 | -1 |
| 1–24% | CRITICAL | -4 | -2 |
| 0% | DISABLED | — | System offline |

### Power Management

- Ships have a **Reactor** with a fixed power budget (e.g., 8 for a Frigate)
- Power is distributed across the 6 systems
- Click the power pips on any friendly system to adjust
- The Engineer's **Reroute Power** action explicitly allows redistribution as their turn action
- Systems at low HP lose max power capacity
- Disabled systems (0 HP) cannot receive power

---

## Damage Model

### Attack Resolution
1. **Attack Roll**: `1d20 + Skill Mod + Sensor Bonus + Attack Modifiers + Range Bonus` vs **Enemy AC** (= base evasion + engine bonus + evasion modifiers)
2. **Critical**: Beat AC by 10+ → ×1.5 damage, chance to start fire
3. **Damage Roll**: Weapon damage dice
4. **Shield Absorption**: Shields soak damage (lasers deal ×1.5 to shields, missiles bypass entirely)
5. **Armor Reduction**: Flat reduction from armor rating
6. **Damage Split**: 60% to targeted system, 40% to hull

### Weapon Types

| Type | vs Shields | vs Hull | Close | Medium | Long | Special |
|---|---|---|---|---|---|---|
| **Laser** | ×1.5 | ×0.75 | -2 | +0 | +2 | Good at range, wears down shields |
| **Missile** | Bypass | ×1.25 | +2 | +0 | -2 | Ignores shields, limited ammo |
| **Kinetic** | ×1.0 | ×1.5 | +0 | +0 | -2 | High hull damage |

### Status Effects

- **🔥 Fire**: 1 damage to system per round. 25% chance to self-extinguish. Engineer can extinguish with Repair.
- **💨 Breach**: Reduces system effectiveness.
- **⚔ Boarded**: System disabled for 1 round (from Security boarding action).

---

## Ship Templates

### Player Ships

| Ship | Hull | Shields | Armor | Evasion | Reactor | Playstyle |
|---|---|---|---|---|---|---|
| **Light Corvette** | 24 | 8 | 1 | 14 | 8 | Fast and fragile. Evade and outposition. |
| **Standard Frigate** | 32 | 12 | 2 | 11 | 10 | Balanced. Adaptable to any situation. |
| **Heavy Cruiser** | 45 | 18 | 4 | 8 | 12 | Tank. Absorb punishment, overpower the enemy. |

### Enemy Ships

| Ship | Hull | Shields | Armor | Evasion | Reactor | Threat Level |
|---|---|---|---|---|---|---|
| **Pirate Raider** | 20 | 6 | 1 | 13 | 7 | Easy — Glass cannon |
| **Military Patrol** | 30 | 12 | 3 | 10 | 9 | Medium — Well-rounded |
| **Pirate Dreadnought** | 50 | 16 | 3 | 7 | 12 | Hard — Heavy hitter |
| **Alien Vessel** | 35 | 20 | 1 | 12 | 11 | Hard — Shield-heavy, arcane power |

---

## Tactical Depth

### The Core Decision Loop (per round)

Every round forces the party to answer these questions:

1. **Engineer**: What's on fire? What needs power? Do I risk an overclock?
2. **Pilot**: Do we close in (for boarding) or stay at range (for lasers)? Do I evade or set up the gunner?
3. **Security**: Do we need intel (scan)? Can we disable a key system (board)? Should we jam their attacks?
4. **ArcNet Officer**: Boost our weakest system or hack their strongest? Emergency shields?
5. **Gunner**: Target their weapons (reduce threat) or engines (prevent escape)? Broadside or precise shot?

These decisions compound. A scanned enemy reveals low shield HP → ArcNet hacks shields → Gunner fires missiles → Security boards the exposed weapons bay. This kind of emergent tactical play is the heart of the system.

### The Power Crunch

Just like FTL, you never have enough power. A Frigate with 10 reactor power and 6 systems can't run everything at max. The Engineer's power allocation is a zero-sum game that forces trade-offs every single round.

### Information Warfare

Without a Deep Scan, the enemy's system status is hidden (shown as "???"). Players must decide: spend Security's action on intel, or take a blind shot? Once scanned, all enemy data is revealed for the rest of combat.

---

## API / Macros

Open the combat panel from a macro:
```js
StarshipCombat.open()
```

Close it:
```js
StarshipCombat.close()
```

Access combat state:
```js
const state = StarshipCombat.getState()
console.log(state.playerShip.hull)
console.log(state.enemyShip.systems.weapons.hp)
```

---

## Design Philosophy

This system was built on three pillars:

1. **Every role matters every turn.** No role should ever feel like they're "passing." The Engineer always has something burning. The Pilot always has a positioning decision. The Gunner always has a targeting dilemma.

2. **Systems degrade, creating emergent crises.** Just like FTL, a damaged engine cascades into worse evasion, which means more hits, which means more system damage. The spiral creates tension and forces hard choices.

3. **Power is a language.** The reactor budget is a shared resource that every role cares about. The Engineer allocates it, the ArcNet Officer can bend it, and the Gunner and Pilot consume it. Every power point moved is a conversation.

---

## License

This module is provided as-is for personal use in tabletop gaming.
