# Collision, motion and permanent durability upgrades

This revision fixes the underlying causes of invisible weapon clashes and distant names. It replaces the first-pair/countdown clash rule with spatially indexed swept weapon geometry, and attaches names to the feet with a fixed screen offset.

## Combat and dropped weapons

- The visible orbit, network metadata and collision system all support 60 active weapons. Bot swords now use the same `ars11` artwork as their collision shape.
- Blade shafts, axe/hammer heads, twin blades, curved hooks and firearm barrels have separate collision segments derived from the rendered models. All pairs use common time samples between frames. A cell grid eliminates distant candidates.
- Each confirmed destroyed weapon creates one flying object. The old two-object visual shortcut is removed. Impact effects originate at the segment intersection/closest contact.
- Weapon shape/mass and tip speed affect stress. A stronger blade can survive a contact that destroys a lighter one. A per-pair contact latch avoids repeatedly charging for one continuous overlap.
- Contact packets carry exact destroyed IDs and partial wear, so a late packet cannot arbitrarily remove a different weapon. Replayed packets are ignored.
- Broken weapons are visual debris and cannot be collected again. Real loot remains collectible and has its own drop trajectory.

## Durability shop

Every newly generated ground weapon has **base durability 100**, independent of rarity, weapon shape, boss origin or stage. Rarity still affects its existing attack statistics.

The weapon shop now sells a **permanent durability tier** instead of new firearms or weapon quantities. Skins remain available. Previously purchased equipment and its equip/unequip controls are preserved.

| Current tier | Maximum durability after collecting | Cost of next tier |
| --- | ---: | ---: |
| 1 | 100 | 50 |
| 2 | 125 | 80 |
| 3 | 150 | 128 |
| 4 | 175 | 205 |
| 5 | 200 | 328 |
| 6 | 225 | 524 |
| 7 | 250 | 839 |
| 8 | 275 | Maximum |

An ordinary equal-strength contact or bullet costs 100 durability. Consequently, a base sword absorbs one bullet; an upgraded sword can absorb additional hits before breaking. HP remains protected while the defending sword absorbs the hit. Increasing maximum durability preserves damage already taken. Purchases are checked against the current saved balance and applied one tier at a time; tiers survive a new round. No gun or extra weapon is awarded by an upgrade.

Ground labels show the common base value. The shop shows the permanent effective maximum. A small condition mark appears on damaged orbiting weapons. Network weapon metadata includes maximum durability and wear, and both relay implementations validate them.

## Character and environmental motion

- Living humanoids use a bounded two-link leg solver with skin-preserving boot texture strips. Gait follows actual movement distance. Penguin and ghost skins keep their authored movement instead of receiving human legs.
- Death uses a snapshot of the selected skin divided into bounded head, torso, arm and leg sections. Sections settle separately during the existing fall/ground-impact sequence.
- Mass scales knockback; impulses and angular response are capped. Lean, balance recovery, cape/scarf lag, acceleration and braking use damped motion.
- The ground model includes shallow continuous height variation, slope resistance, snow, ice, stone and water properties. Foot contacts leave bounded, fading tracks and snow indentations; water contacts produce ripples.
- Debris uses fixed substeps, shape-dependent mass/drag, gravity, material restitution, friction, spin damping, obstacle reflection, settled-object impulses and a sleep threshold. Pointed weapons can stick into soft snow; metal sinks visually in water. Lightweight collectible loot can drift with the current.
- Shadows respond to debris height. Physical pickups settle instead of bobbing forever; coins roll according to their movement. Magical XP/ability items retain their floating appearance.

These are lightweight **Canvas 2.5D approximations**, not a full 3D rigid-body, skeletal, cloth or fluid solver. The original flat scene/art limits exact joint anatomy, fully walkable modeled stairs, deep snow meshes, cloth self-collision and volumetric water. The 127-item design list should not be read as 127 independently completed, production-tested simulations.

## Shared animation

Flying objects have stable source IDs and bounded motion snapshots. The owner, opponent and spectators receive the same IDs through P2P or HTTP. Duplicate objects are suppressed, and later snapshots correct drift. Warp pose, hurt pose and firearm recoil/reload state are also relayed. Projectiles keep moving visually during the local death sequence.

HTTP payloads are bounded to 64 KiB, up to 128 flight snapshots and 60 weapon descriptors per state. The local debris pool is bounded to 512 objects. These are practical performance limits, not unlimited particle or network capacity. Both players must load the updated HTML and their host must deploy the updated relay.

Bots still use the existing client-local NPC simulation; this revision does not turn the game into an authoritative shared-NPC server.

## Verification

`npm run test:frostline` runs Chromium gameplay tests, both lifecycle relay adapters, legacy relay tests and audio tests. Coverage includes:

- 60-blade swept contacts, actual intersection coordinates, one flight per destroyed blade, duplicate suppression and grounded labels;
- articulated deaths across all skins and fixed-substep settling at 30/120 Hz;
- three isolated browser contexts receiving the same 20 flying-object IDs through the project HTTP relay with in-memory storage;
- real CDP multi-touch walking/warp, death/revive/pet removal and stale lifecycle packets;
- purchasing through the actual shop button, exact coin deduction, no gun sale, new-round persistence, uniform ground durability, stronger bullet protection, insufficient funds and maximum-tier rejection;
- relay forwarding/validation of exact loss IDs, wear, durability, 60 weapons, flying objects and pose state.

The tests use local isolated storage. They do not establish successful deployment or live production multiplayer performance.
