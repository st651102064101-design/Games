# Audit of the 100 requested improvements

This is the first implementation batch, not completion of all 100 items.

Completed or narrowly addressed:
- Item 1: dense orbit now renders the same model IDs, radius and angles used in collision metadata. Removed the unrelated 96-model visual sampling ring.
- Item 6: grouped reload/ammunition state survives adding/removing weapons while the group persists.
- Item 7 (partial): replacing the inventory array with another array of the same length invalidates the active cache. In-place edits must still explicitly invalidate it.
- Item 8 (partial): grouped recoil state survives regrouping. True per-item rigid-body simulation remains outside the aggregate model.
- Item 71: both producer and receiver enforce the same 2,100 ground-item bound.
- Item 81: bots consume the full weapon pickup quantity, including +20.
- Item 82 (partial): removed the 60-item bot accumulation ceiling and its overflow XP conversion; bots retain bounded 60 representative collision models. Full player/bot equivalence still needs balancing.

Validation covers matching rendered IDs/angles/radius at 5,001 weapons, retained gun/recoil state, same-length array replacement, bot 60 + 20 = 80 and ground item bounds, alongside the existing integration suite.

Next priorities: distribute aggregate damage around the ring (items 2–5), make airdrop state authoritative and shared (67–70), verify the deployed cross-device API (61–66), then implement the remaining physics, visual and performance improvements. The other numbered audit items remain open unless separately covered by existing tests. Do not interpret unit/browser tests as real iPhone verification.
