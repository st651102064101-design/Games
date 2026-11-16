# Unlimited carried weapons, automatic airdrops and readable missions

Carried player weapons have no gameplay quantity ceiling. Every pickup adds actual inventory records; no replacement or XP-conversion dialog appears. Nearby weapon caches spawn every three seconds, with quantities increasing with stage and survival time, reaching +100. This supports thousands of permanent melee weapons during active collection; survival alone does not automatically award 5,000 items. Powerful firearms still expire.

Above 160 weapons, combat scheduling groups matching type/rarity and sums their damage against world enemies. Rendering samples up to 96 real weapon models and adds density rings; metadata sends bounded representative descriptors and the actual inventory count. Above 500 weapons the existing low-detail effects path activates. This is an aggregate simulation, rather than thousands of separate rigid bodies. Existing PvP per-contact damage limits remain. Hardware performance, particularly on physical phones, needs device testing.

Airdrops open automatically while the player stays within the visible 105-unit circle. Leaving resets incomplete progress. Completion stays at 100% and emits a guaranteed Rare-or-better weapon once, with a ballistic upward launch. Both relay adapters preserve the launch height and velocity.

Mission HUD now shows three icon cards and progress bars, with short labels and the uncapped inventory total. Explosion visuals combine a bright fire core, irregular fire lobes, dirt spikes, ballistic fragments, expanding smoke and a pressure ring, with bounded effect pools. They are procedural effects matching the game's illustrated style, not photorealistic sprites.

Validation: browser integration covers 5,001 collected weapons, full retained inventory and summed damage, bounded metadata/render work, automatic airdrop opening/reset, guaranteed rare release and networked launch velocity, mission bars and explosion drawing. The local Chromium render-plus-metadata benchmark is recorded in the test output; it is not a whole-game phone frame-rate guarantee.

Deployment: build with `npm run build:edgeone` and upload the complete `dist` directory, including its bundled `edge-functions` API. Uploading only the HTML omits cross-device multiplayer. Updating GitHub does not itself verify deployment to the existing EdgeOne website.
