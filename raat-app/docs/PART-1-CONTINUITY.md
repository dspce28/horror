# RAAT — Part 1 continuity reference (for Part 2 and later)

Written from the source code and the assets in this repository, not from screenshots of the live site.
Paths are relative to `raat-app/`.

## 1. Kokila: face and appearance
- **Canonical face:** `public/raat/scenes/her-face.webp`. It is used for every extreme close-up: the mirror in Part 1, the call avatar, the subliminal flashes, Part 2's crossroads and banyan close-ups.
- **Canonical full figure:** `public/raat/cutouts/her-look.webp`, a hunched, standing cut-out from `assets/incoming/Ghostly Woman in a Haunted Bus-6.png`.
  - Part 1 uses it for the shadow and the reflection.
  - Part 2 uses it for her standing on the road and on the building floor.
- **Seated figure:** `public/raat/cutouts/her-behind.webp`, from "Ghostly Woman on the Midnight Bus.png".
- **Look:**
  - Indian woman, late 40s, long black wet hair over the shoulders, pale skin.
  - Dark, hollow-shadowed eyes and a red bindi.
  - Bare feet.
- **Not used:** "Ghostly Woman on a Rainy Bus.png". It shows an older face with no bindi, which breaks continuity.

## 2. Saree and hair
Off-white aged cotton saree with a faded maroon border, stained and torn at the hem. Hair is long, black, wet, and often covering part of the face. On screen the hair and the hem move a little (shader), on a stepped 4-per-second clock: she never moves smoothly.

## 3. The visitor
- **Identity:** the name, language and grammatical gender (m/f/n) the visitor entered at the start, kept in `lib/store.ts`, `localStorage` and `sessionStorage`.
- **Appearance in Part 1:** shown once, in the third person, on the highway (`public/raat/cutouts/hero-m.webp` / `hero-f.webp`):
  - masculine: dark jacket, motorcycle;
  - feminine: dark kurta, maroon scooter.
  The variant is picked by `visualGender()`.
- **Camera:** first person from boarding onwards. Part 2 is entirely first person, and the visitor is never shown.

## 4. Highway and road
- The 3D highway is in `components/film/HighwayFilm.tsx` and `lib/film/highway.ts`:
  - an 8 m two-lane road with dashed centre line and edge lines, wet asphalt;
  - sodium lamps every ~42 m with light cones and reflections;
  - layered trees and fog sheets.
- The bike stopped on the verge at `WORLD.hero` (x 4.7, z −64). Part 2 returns to exactly this spot.

## 5. Night lighting and palette
- Fog: `#1b222b`. Background ink: `#0a0a0b`. Accent blood red: `#72191F` / `#b3262f`.
- Light: amber practical lights (sodium lamps `#ffae5c`, diyas) against a cold blue-grey night.
- Tube lights: green-white, flickering in short stutters (`stageState.ts`).
- Grain, vignette and a slight lens breathing come from `LENS_FRAG`. There is no RGB split: glitches are exposure stutters only.

## 6. Camera movement
- Scroll drives everything.
- On photographs, each `Shot` sets the framing (`lib/animation/director.ts`): a slow dolly (zoom), a drift toward a focus point, rack focus (`dofAt`), and `glide` for moves without a cut. Cuts cross-dissolve over ~0.5 s.
- The camera eases toward each frame (`stageState.ts`), with pointer and touch parallax.
- On the 3D highway, the camera follows a keyframed path in film seconds (`cameraAt`, `cameraP2`).

## 7. Visual effects
- **Living photographs:** breathing, head and hair motion; her stepped motion; her eyes catch the light.
- **Other effects in use:** lights dying row by row, windscreen reflection, mirror glance, seat pressing down, shadow behind the visitor, the bus vanishing into fog, a single headlight glow, dust between camera and photo.

## 8. Sound identity
- **One audio director:** `lib/audio/engine.ts`.
- **Mix:** a horror theme (low, ~0.12) under everything. All effects are synthesised in the browser. Voices duck the music.
- **Her signature:** glass bangles, her hummed tune, close breath. Her name call is a slowed, doubled, echoing whisper (server eSpeak-NG, or a voice provider).
- **Not used:** no rain, no thunder, no insect drones (removed at the visitor's request).

## 9. Typography
- **Display:** Cormorant Garamond (`--font-display`). **Body:** Inter.
- **Indian scripts:** Noto Sans Devanagari and Gujarati.
- **Subtitle styles:**
  - narration: italic, centred;
  - dialogue: a small speaker tag plus a boxed line;
  - big lines: large display type.

## 10. Mobile framing
- Portrait uses the same shots with a 64° field of view on the 3D highway, and covers the photo plane with a tighter crop.
- Subtitles are ≥ 16.8 px and call buttons 70 px. No horizontal overflow is allowed.
- Low-power devices drop the render resolution (adaptive DPR).
