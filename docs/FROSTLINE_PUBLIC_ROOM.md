# Public room discovery correction

The game previously mapped weapon/durability progression to four different P2P room IDs and HTTP storage prefixes, then rejected state messages from other tiers. Two devices using the same website could therefore never see each other's names after one upgraded further.

All tiers now use the existing band-zero public room. Both relay adapters normalize incoming state/leave requests to that storage prefix, and the client no longer discards other-tier states. Equipment progression itself is preserved. Client presence tolerance now matches the relay's 14-second live-state window rather than disappearing at 6.5 seconds. Failed HTTP synchronization retries begin at 1.5 seconds and cap at 8 seconds. The player list shows direction and distance for remote players outside the current view.

The existing multi-browser integration test now starts a later browser at weapon/durability tier eight and confirms it discovers the earlier tier-one player and their pet. Relay tests confirm different tier metadata reaches the same room and leave requests clean the canonical record.

Both devices must load the updated game and the host must deploy the updated relay. Older tier-split clients are not fully compatible until refreshed. Active play must overlap: a closed browser/offline player is not a live opponent. Separate hosting providers still have independent HTTP storage unless a common backend is configured; public P2P discovery remains the cross-host fallback. Production connectivity and router/mobile-network behavior are not established by local isolated-browser tests.
