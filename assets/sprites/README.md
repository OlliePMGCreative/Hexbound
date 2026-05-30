# Hexbound — Sprite Assets

All game sprites are currently drawn procedurally in `js/spritesheet.js`.

When you're ready to replace them with custom pixel art, add your PNG files here and update `spritesheet.js` to load and draw them using `ctx.drawImage()` instead of the procedural drawing functions.

## Recommended Specs (GBA Style)
- **Resolution**: Draw at 1× pixel size, the game will scale them
- **Format**: PNG with transparency
- **Color limit**: Aim for 16 colours max per sprite (authentic GBA feel)
- **Outline**: Add 1px black outline around all characters

## Files to Create

### player/
| File | Size | Description |
|---|---|---|
| `sorcerer_idle.png` | 24×44px | 4-frame idle animation (strip of 4, each 24px wide) |
| `sorcerer_walk.png` | 24×44px | 6-frame walk cycle |
| `sorcerer_jump.png` | 24×44px | 2-frame jump/fall |
| `sorcerer_cast.png` | 24×44px | 3-frame fireball cast |
| `sorcerer_attack.png` | 40×44px | 4-frame staff swing |
| `sorcerer_hurt.png` | 24×44px | 2-frame hurt flash |

### enemies/
| File | Size | Description |
|---|---|---|
| `skeleton_walk.png` | 16×28px | 6-frame walk cycle |
| `skeleton_rise.png` | 16×28px | 8-frame rise-from-ground animation |
| `skeleton_die.png` | 16×28px | 4-frame death |
| `ghost_float.png` | 16×20px | 4-frame float cycle (semi-transparent) |
| `bat_fly.png` | 20×12px | 4-frame flap cycle |

### tiles/
| File | Size | Description |
|---|---|---|
| `grass_top.png` | 16×16px | Grass surface tile (1 tile) |
| `stone.png` | 16×16px | Stone fill tile — can have 2-3 variants side by side |
| `tombstone.png` | 14×20px | Tombstone decoration |
| `dead_tree.png` | 24×48px | Dead tree decoration |

### ui/
| File | Size | Description |
|---|---|---|
| `heart_full.png` | 10×10px | Full heart for lives HUD |
| `heart_empty.png` | 10×10px | Empty heart |
| `mana_full.png` | 8×8px | Full mana pip |
| `mana_empty.png` | 8×8px | Empty mana pip |

## GBA Colour Palette Reference
```
Deep black (outline):  #06030f
Dark purple:           #1a0f2e
Mid purple:            #2d1b4e
Robe purple:           #5b2d8e
Skin:                  #d4a070
Bone white:            #d1c9b0
Bone shadow:           #8a7e6a
Red eyes:              #cc2020
Grass bright:          #22aa30
Grass dark:            #1a7a28
Stone light:           #6e637a
Stone mid:             #504660
Stone dark:            #362c44
Staff brown:           #7c5233
Magic purple:          #d946ef
```

## GBA Software to Use
- **Aseprite** (recommended — has GBA palette tools)
- **LibreSprite** (free Aseprite fork)
- **GraphicsGale** (free, Windows)
- Keep animations as horizontal sprite strips (frame 1 | frame 2 | frame 3...)
