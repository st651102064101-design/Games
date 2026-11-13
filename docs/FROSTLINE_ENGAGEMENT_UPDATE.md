# Frostline: round goals, fair equipment and shared bots

## Implemented in this update

- New rounds start at stage 1 even when joining an older room. Shared weather time is separate from round progress; day/night changes three times more slowly.
- Fight and recovery phases last 30 seconds each. Phase 3 requires defeating the boss before advancing. The game forces a boss opportunity when needed and frees a non-boss slot when the encounter cap is full.
- Boss state resets only on a new stage. Monster kills increment stage progress once, and repeated kill calls cannot duplicate rewards.
- Ordinary non-leaping bosses commit to a 0.7-second ground warning, strike, and recovery instead of continually dealing contact damage while chasing. Existing themed bosses and leap patterns remain.
- A visible three-boss goal, collection/defeat/airdrop milestones and optional extraction give each run a finish condition. Every crossed milestone is paid once; extraction awards a stage-based bonus.
- Periodic supplies, quiet intervals and stronger wind vary the pacing. Wind affects cloth and airborne objects; quiet intervals postpone spawning.
- Levels use a growing XP curve and provide a nonblocking choice of three skills. Players can defer the choice; duplicate clicks cannot consume the same choice twice. Maxed skill builds can choose recovery.
- The orbit accepts 60 weapons. Further pickups offer replacement or XP; extra quantity/skill rewards convert excess to XP. Hidden legacy weapons cannot accelerate the visible orbit. Player and bot orbit speeds are capped at 32 rad/s.
- Bots favor weapons when poorly equipped, healing when hurt and XP for growth. Their levels are uncapped; equipment beyond the visible limit becomes experience rather than invisible combat power.
- One elected player simulates shared bots. Other browsers receive stable NPC IDs, generations, equipment, level, position, warp and death. Damage actions and kill awards are deduplicated; actions from a previous NPC life are rejected.
- The shop sells sequential permanent durability tiers, with 100–800 durability. Every tier adds an ordinary 100-point impact. Ground weapon base durability stays 100. In-round purchases apply on the next run and survive autosaving.
- Both networking transports separate adjacent durability tiers into four bands. The HUD distinguishes real players from bots. State messages always identify their band, including messages without equipment metadata.
- Relay state rejects an older run or lower sequence already stored for the same player. Clients reject older equipment metadata. Both deployment adapters validate shared NPC data, durability, wear and pose fields.
- End-of-run time uses time actually played in the round. Results show the last known threat or successful extraction. A local `frostline_last_run` record stores round outcome and basic counters for balancing; nothing is sent to an analytics service.

## Existing physical and animation work retained

Swept shape-based blade collisions; simultaneous losses with one debris object per lost blade; contact-position effects; mass-dependent impulses; damping; surface friction and slope response; height-aware shadows; substep gravity, bounce, rolling, spinning and sleep; pointed weapons sticking in snow; water response; grounded loot; articulated character collapse; skin-preserving feet; cloth lag; shared pets, dog sacrifice, revive glow, hurt, warp and firearm poses; close foot-anchored labels.

See [physics and durability details](FROSTLINE_PHYSICS_AND_DURABILITY.md).

## Verification and practical boundaries

`npm run test:frostline` exercises actual Chromium touch input and gameplay, three isolated browser contexts, both project HTTP relay adapters, and audio behavior. Additional regressions cover stage gating, milestone payment, skill double-clicks, full orbits, hidden reserves, shared NPC generation/replay rejection, stale relay sequences and upgrade-band isolation. `npm run build` verifies the publishing bundle.

The test relay uses local in-memory storage. Deployment and real-device latency still need live verification. Client-hosted NPCs are not cheat-proof; natural bears now share encounters (see FROSTLINE_BEAR_COMBAT.md); other survival species remain local. Read-before-write relay sequence checks do not provide a distributed storage transaction. Large debris bursts remain bounded (512 local objects; 128 snapshots per message). These limits apply even though ordinary multiplayer animation events are shared.

This Canvas game uses 2.5D approximations. Full 3D ragdolls, cloth self-collision, volumetric snow/water and production scale authoritative world simulation require a different engine/server architecture. Balance, replay value and whether bots feel as skilled as the user still require human playtesting; automated checks cannot establish those outcomes.
