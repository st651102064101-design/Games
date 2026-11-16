# Ground loot readability and bot battles

Ground loot artwork is twice its previous visual size. Quantity badges use an independent transform so their text is 50 percent larger than before, rather than accidentally tripling with the artwork. Badges now remain visible in low graphics mode. Shadows stay on the ground during ballistic hops, and the loot collection tolerance is expanded to match the larger icons.

Bots consider nearby living bots as well as human players when selecting a hunting target. A bot can engage another bot starting with four weapons, subject to its health and relative strength. The existing larger detection radius, safe-zone priority and retreat behavior remain.

Only the elected world authority simulates bot-versus-bot combat. Blade clashes are checked for every nearby bot pair across the map, removing the former 1,000-unit player-centered restriction. The broad phase accounts for hunter growth. Surviving weapons shield a bot; once disarmed, actual swept blade/body contacts inflict damage with contact latches and spawn-invulnerability checks. A defeated bot enters the shared death state, drops loot and gives XP to the attacking bot. Player coins, kill count and bounty credit are not awarded for bot-on-bot kills. Existing NPC snapshots carry weapons, health and deaths to other clients.

Browser tests verify the artwork transform, independent quantity font sizing in low graphics, bot target selection, offscreen bot-on-bot killing and leveling, defensive weapons/invulnerability, and absence of player credit. Existing combat, multiplayer, purchase and animation integration checks remain in the suite.
