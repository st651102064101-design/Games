# Map loot replaces permanent equipment upgrades

- Equipment/weapon/durability upgrades are removed from the shop and purchase entry points disabled. Owned character cosmetics remain. Previous equipment-tier saves are preserved but inactive in new rounds; legacy paid loadouts are not granted automatically.
- Weapon pickups retain the actual dropped type and add their quantity instead of converting every pickup to an account tier. Ten blades + RPG 1 + minigun 20 means 31 weapons, including the ten original blades.
- RPGs last 12 seconds, miniguns 18 seconds, other firearms 25 seconds from collection. Each item expires independently; ordinary melee weapons remain. The actual render/collision/network orbit capacity is now 160; overflow converts to XP.
- Drop acceptance rises from 50% to 85%, and regular weapon caches appear every eight seconds. Stage-weighted quantities favor +1 strongly, with progressively rarer higher values. The maximum is min(100, stage*2), so +40 becomes available at stage 20 and +100 at stage 50. Explicit quantities greater than one are retained. Labels include quantity.
- Bear damage no longer uses a target-wide cut throttle. Other melee contacts use per-blade crossing latches, with continuous overlap suppressed instead of a shared damage cooldown. Multiple genuine blade crossings may deal damage in the same frame. This makes dense weapon orbits considerably more dangerous; live balance testing is still needed.
- Weapon-count badges scale with the actor/view instead of inverse zoom, avoiding huge badges over tiny characters. Bot target count is rounded from 70% of the previous target before replacing bots with online players.
- Night overlay opacity is halved. A complete day/night cycle now takes 270 seconds instead of 180.

## EdgeOne API deployment finding

A read-only check of https://fashionable-violet-zczhmo12.edgeone.dev/api/frostline-pvp?presence=1 returned HTTP 404 even though the live game HTML was current. The source Edge function now also exports the default handler expected by EdgeOne. `npm run build:edgeone` creates a direct-upload root containing the game as index.html, assets, a bundled edge-functions/api/frostline-pvp.js (including its Blob SDK), and cache headers. Uploading a single HTML file cannot supply this API.

The live EdgeOne deployment has not been changed from this workspace: no EdgeOne deployment credential is available here. The owner must upload the complete built folder/ZIP to the existing EdgeOne project, then verify the API returns JSON before retesting iPhone/Windows. The local relay tests use isolated storage and do not prove live deployment.

Official packaging references: https://pages.edgeone.ai/document/direct-upload and https://pages.edgeone.ai/document/edge-functions .
