# Natural bear combat and shared wounds

## Problem and behavior change

The old extra-weapon hit handler placed an enemy directly on the moving blade's contact perimeter. The general enemy loop also imposed an invisible weapon-ring barrier and strong segment repulsion. Together these could make a bear slide around the player with the rotating weapons.

Brown and polar bears now use a dedicated grounded combat path that bypasses all three position corrections. A cut changes HP, creates a body-local wound, and applies a capped, damped impulse. The bear's AI remains responsible for its movement. Existing leap attacks and travelling claw waves are removed; brown bear, polar bear and giant bear encounters use the same grounded rules. Other animal species retain their earlier encounter logic.

## Cuts, injury and animation

- Four overlapping body regions cover the rear, torso, head and muzzle for swept blade contact.
- A blade can damage once per crossing. Continuous overlap refreshes its contact latch without repeatedly damaging every frame. A short shared cut window bounds simultaneous burst damage.
- Wounds store their contact point and slash direction relative to the bear's facing, so marks stay on the moving body. Up to eight wounds are rendered and retained for 25 seconds.
- Brief red particles and a visible wound follow ordinary cuts. Only bleeding-element weapons apply a bounded damage-over-time effect; seeing blood does not imply unlimited continuing damage.
- Heavy bears receive smaller impulses. Knockback decays with the surface friction. Injury affects recoil, and a critically injured bear slows down. Natural bears use HP rather than the legacy fixed hit-count death rule.
- New quadruped art includes gait-driven paws, shoulder/body movement, a muzzle and jaw, front-paw attack animation, wound marks and brief directional hurt response. Corpses retain the model and wounds during collapse/fade.

## Grounded attacks

Attacks commit to a direction when preparation starts, then move through windup, active contact and recovery. Remaining near a bear does not continuously drain HP.

- **Swat:** a front paw sweeps across a short arc; the rendered paw and damage region use the same pose calculation.
- **Bite:** the jaw opens and the head reaches forward; only the short active bite contact deals damage.
- **Charge:** a ground-level run with preparation and braking/recovery; no airborne homing jump.
- **Close push:** both front paws press forward, selected when the nearby target has recently been staggered. This is a game interpretation, not a claim that bears routinely perform a fixed “hug combo.”

Each attack tracks its victims and can damage each one once. Players can evade by leaving the committed contact region. Armor and invulnerability remain effective. Attack damage events include a position and time; the victim checks their own recent movement samples before accepting a delayed hit.

## Multiplayer

The elected active client that already manages shared NPCs now also simulates natural bears. Followers receive stable bear IDs, HP, body position, facing, gait, wounds, hurt response, attack timing, prior victims and serial counters. Followers interpolate positions and submit stable, deduplicated cut/projectile actions. The host validates target existence, distance, timestamps and replay IDs.

Attack and wound serials survive ownership transfer. Stale snapshots hide the bear instead of inventing a death. Recent attack-hit and death records are repeated for delivery and deduplicated by recipients. Nearby participants receive shared encounter progress and the direct boss reward; generated loot is emitted once by the host. This remains casual client-hosted networking, not a trusted competitive server.

Both Netlify and EdgeOne adapters validate the new fields. Bounds: 32 bears, 8 wounds per bear, 48 cut/death events, 32 hit events, and 64 recorded victims per active attack. The request ceiling is increased to 192 KiB of JSON text to accommodate the added snapshots; the existing bounds on weapons, flying objects and loot remain.

## Behavior references and interpretation

- [National Park Service — Bear Attacks](https://www.nps.gov/articles/bearattacks.htm): differentiates bluff charges from aggressive charges and describes physical warning behavior. Real bears can bound while running; removing the old high homing leap is a game design decision, not a claim that bears cannot jump.
- [Florida Fish and Wildlife — Black Bear Behavior](https://myfwc.com/wildlifehabitats/wildlife/bear/facts/behavior/): standing on hind legs can be investigative, not automatically an attack.
- [Injury patterns of fatal bear attacks in Japan: seven cases](https://pubmed.ncbi.nlm.nih.gov/29530623/): supports the role of biting in injuries, but is not a universal sequence or animation timing guide.

The attack choices, timings, damage values and close-push behavior are authored for readable gameplay. The vector art is a 2.5D approximation, not an anatomical or wildlife-safety simulator.

## Verification

The Chromium integration suite covers cuts without positional attachment, continuous-overlap rejection, a new crossing, ordinary cuts without automatic bleeding damage, active-window bite damage, one hit per victim, dodging a committed swat, grounded damping at 30/120 Hz, all four attack poses, shared wounds and remote cuts through the real HTTP sanitizer across three isolated browser contexts, shared attack IDs, duplicate death rewards, and ownership-transfer serials/stale-state handling. Both relay adapters test wound/attack/event forwarding and coordinate limits. Existing gameplay, touch, pets, durability, audio and build checks remain in use.

Production deployment, real-device latency and subjective animation quality still need live playtesting. Non-bear wildlife and other survival species are not made globally shared by this update.

## Regional injury and collapse pass

Bear contacts now classify head, torso, or a specific front/rear leg side in bear-local coordinates. Head hits recoil the head group with attached head wounds; torso hits briefly compress the body; leg hits reduce the affected paw's gait and tuck it before recovery. Responses decay, do not add permanent slowdown, and do not change hit damage. Both relays preserve region/side/front metadata. Old transient hurt poses stop being sent after three seconds.

Bear corpses now retain their wounds, fold their paws, lower the body and droop/close the head/eyes over a 1.6-second collapse/fade rather than using the generic fast spinning corpse. Remote corpse age is corrected by the death event timestamp. This is authored 2.5D articulation, not a 3D ragdoll.

## Upright view and crown correction

Bears now render with world-facing foot positions and vertically raised legs, torso, neck and head, matching the character scene's upright 2.5D convention. Facing changes head/foot placement and gaze rather than rotating the entire sprite like a top-down icon. Ground combat coordinates and attack calculations are unchanged. Regional head/paw reactions and attached wounds remain supported.

The crown renders as a separate upright overlay after body/head transforms are restored. Its screen axes do not rotate with heading or recoil. It is hidden during corpse collapse. A four-heading rendering regression checks the crown transform, and a screenshot covers brown/polar bosses in each direction.
