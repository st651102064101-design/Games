# Frostline v3.3 Arsenal

Adds the latest 30-weapon design to the 2D orbit arena. The existing six weapon identifiers remain readable for old saves. New drops use 20 melee weapons and 10 firearms, gated by stage with earlier elite rewards. An empty arsenal starts with Survival Knife. The start screen includes a catalog.

Firearms use swept projectile collision, magazines, automatic reload, burst fire, shotgun spread, minigun spin-up/heat and RPG splash damage. Visual projectile count and reusable projectile objects are capped at 160. Low graphics mode retains DPR 1 and reduced effects. Weapon artwork uses procedural Canvas geometry rather than external assets.

Nearby melee clashes remove a weapon by stable identifier, play a flying weapon animation, and suppress duplicate removal. Main blades can reach zero. The lower client ID initiates a clash; the event is repeated in short state history. Both clients keep a protective separation while armed. This is approximate casual PvP, not authoritative or cheat resistant; real network delay may still cause corrections or event loss. Firearms do not participate in melee clashes.

The HTTP relay now forwards bounded shot and clash histories and all new weapon IDs. It uses a new room namespace to isolate incompatible older clients. Publish the HTML and Netlify Function together, then refresh every client. GitHub commits alone do not confirm a Netlify deploy.

Run from the repository root:

```
node tests/frostline-arsenal.cjs
node tests/frostline-runtime.cjs
node tests/frostline-relay.cjs
```

Tests exercise logic with a mocked Canvas/DOM and in-memory relay storage. They do not measure real rendering, TC52 FPS, or internet multiplayer latency. Real browser/GPU QA was unavailable in the authoring environment. No 60 FPS or 20-player capacity claim has been established.

This change does not implement the separate pending character selection, shared stage clock, ten animal stages, or full death-loot/reset requests.
