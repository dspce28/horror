# RAAT — The Last Passenger · Part 2: The Circle

Branch `claude/stoic-archimedes-axihrk`. "Tested" means run in Chromium (Playwright) against the production build and checked. "Not tested" means exactly that.

## How Part 2 is reached
- At END OF PART ONE, **Next part** starts Part 2 in place, with no reload.
- Name, language, gender, scare mode, sound settings and the story clock all carry over. Nothing is asked again.
- The scroll track now covers only Part 2's nine scenes.
- The part is saved in the session, so a reload resumes Part 2 from its start.
- **Replay** (Part 1) still goes back to the beginning.
- After Part 2 the end screen offers:
  - **Replay part two**
  - **Start again from part one**
  - films and songs
  - a "Part three · Coming soon" card. Nothing of Part 3 is built.

## Scene by scene
| # | Scene id | World | What happens |
|---|---|---|---|
| 1 | `p2call` | 3D highway (the same road and lamps as Part 1) | The bus is gone. Her call (answer only): "Walk away from there… and don't look back." Call ended · No network. A first-person walk down the road; anklets, faint, behind. |
| 2 | `p2cross` | Photo, crossroads | Wide shot, then a dolly to the water circle, the offerings, the diya and the doll (close-up). The flame leans against the wind. A rack focus across the road: a figure. |
| 3 | `p2her` | Photo plus Kokila cut-out | She is closer every time (5 stepped positions, through fog, never walking). Her face fills the screen: "Don't step inside the circle!" The diya dies. The visitor runs (two lanes, stride shake). |
| 4 | `p2haveli` | Photo, haveli door | Knock once, then twice. The chain slides off, the doors part by themselves, the camera goes through the gap into black. "Nobody is there." |
| 5 | `p2banyan` | Photo plus 11 silhouettes | The camera drifts around the trunk. A creak above; the camera looks up and pans across the branches as eleven figures appear one by one, counted on screen. One turns. Silence. Her name whispered from behind, her face: "Get out of here…". Run. |
| 6 | `p2build` | Photo plus Kokila cut-out | Unfinished building; she stands on the second floor. Message from KOKILA BEN: RUN AWAY FROM HERE. She is gone. Concrete falls (debris, dust, shake). Run. |
| 7 | `p2house` | Photo | Locked door, black and red ritual design. A doll close-up with the visitor's **real name** as HTML text, pinned to the doll in dark red. Message: DO NOT ENTER. Three knocks from inside, then three more. Run. The door never opens. |
| 8 | `p2return` | 3D highway | Back on the same four-lane road, walking towards a dim light. |
| 9 | `p2pump` | 3D highway plus a built petrol pump | The pump, almost empty, one stuttering tube light. Her call: silence, a small laugh, "Now get ₹100 worth of petrol, you idiot!" (Gujarati ડોબા/ડોબી, neutral ડોબાં), laughter. The bike, exactly where it stopped. The attendant checks it. Fuel gauge insert on E. "The bike had simply run out of petrol." Her laughter. Cut to black. END OF PART TWO. |

Kokila's motives are never explained. She only laughs at the very end.

## New assets (`public/assets/part2/`)
All are 16:9 at 1600×900, with a 900 px mobile version (`-m`) and a depth map (`-d`, Depth Anything V2) for 2.5D parallax.
- **Generator watermark:** painted out of every image.
- **Construction photo:** the original image had a different woman standing on the floor. She was painted out, and Kokila's cut-out stands there instead.

| File | Source in `assets/incoming/` |
|---|---|
| `highway/p2-highway-after-bus` | Gemini_…cywafb (no-WebGL fallback) |
| `highway/p2-highway-distant-light` | Moonlit Foggy Roadside Stall (fallback) |
| `crossroads/p2-crossroads-wide` | Gemini_…6a3hx4 |
| `doll/p2-black-doll-closeup` | Gemini_…e89j2b |
| `haveli/p2-haveli-entrance` | Gemini_…y9v8bv |
| `banyan/p2-banyan-courtyard` | Gemini_…ivuhes |
| `construction/p2-construction-building` | Gemini_…bbdifb |
| `abandoned-house/p2-ritual-house` | Gemini_…eyf12r |
| `transitions/p2-lane-run`, `p2-lane-run-2` | Gemini_…jq59n3, …effnqb |
| `petrol-pump/p2-bike-m`, `p2-bike-f` | Cut from Part 1's hero cut-outs (the bike/scooter only) |

Kokila reuses the Part 1 references (`her-face`, `her-look`). No new face was introduced. Part 1 assets were not renamed or overwritten.

## Built, not photographed
- **Petrol pump:** no photograph of one exists among the supplied images, and the connected Adobe tools cannot generate images here. It is built in 3D on the Part 1 highway:
  - canopy, pillars, a stuttering tube light, a dispenser with no brand, the attendant's cabin, a blank sign;
  - the attendant is a backlit silhouette;
  - the pump only exists on the way back, never on the walk away.
- **Eleven silhouettes:** drawn as soft, non-detailed shapes in the mist (three variants), not photographs. This is fictional and non-graphic, and is not a reconstruction of any real case.

## Source files
- **New:**
  - `components/scenes/Part2Layers.tsx`: figure, silhouettes, diya, ripples, door gap, debris.
  - `components/ui/Part2Call.tsx`
  - `components/ui/Part2Overlays.tsx`: doll name, fuel gauge.
  - `docs/PART-1-CONTINUITY.md`
  - `docs/PART-2-REPORT.md`
- **Changed:**
  - `data/stories/last-passenger.ts`: 9 scenes, part windows, `setPart`.
  - `data/translations/{en,hi,gu}.ts`
  - `lib/animation/director.ts`: Part 2 shots, `focusTo` pans, effect fields.
  - `lib/animation/stageState.ts`: Part 2 paths, stride shake, name anchor.
  - `components/experience/{ScrollController,WorldStage,Experience,StoryCanvas,AudioController}.tsx`
  - `components/scenes/PhotoWorld.tsx`
  - `components/film/HighwayFilm.tsx`, `lib/film/highway.ts`: Part 2 camera, pump, bike, attendant.
  - `components/ui/{EndScreen,StoryText}.tsx`
  - `lib/{store,session,replay}.ts`
  - `lib/audio/{engine,lines}.ts`
  - `app/globals.css`

## Audio
- **Still one audio director**, with the same buses: ambience and music → mood → duck; dialogue; effects; phone EQ for calls.
- **New synthesised effects:**
  - footsteps (road with splash / stone / running), heavy breathing, anklets;
  - diya crackle, far metallic ringing, low rumble;
  - knocks (wood / muffled from inside), chain falling, old wooden door;
  - leaves, rope creak, metal impact, concrete hum, falling debris;
  - ritual objects moving, far traffic;
  - her laughter (synthesised breath and voice).
- **Ambience and silences:**
  - Wind runs outside throughout Part 2, and drops out for the banyan's silence and the final black.
  - The pump's tube hum. A dog crying on the highway and at the crossroads.
  - Insects are very low, on the road and at the crossroads only.
  - There are deliberate silences before each of her close lines.
- **Voices:**
  - Her four Part 2 lines are routed through the existing voice system. They are spoken only when a voice provider key or recorded files exist; otherwise they are subtitles.
  - Her whispered name (at the banyan) uses the free server voice.
  - The laughter is always synthesised, and is the weakest sound in the set.

## Testing
| Check | Result |
|---|---|
| Full Part 2, English, masculine, desktop 1280×720: every scene, both calls answered, both messages, the name on the doll, eleven silhouettes, the pump reveal, END OF PART TWO | **Tested** |
| Part 1 → Part 2 handover, Hindi, feminine, decline ×3: Part 1 end → Next part → Part 2 at the top, same name, feminine forms ("चलने लगती है"), the call rings with one button, session saved `part: 2` | **Tested** |
| Full Part 2, Gujarati, **neutral**, no-jump-scare mode, iPhone 13 emulation: neutral forms (ચાલતા રહેજો, અંદર ન જતા, ડોબાં), the name in Gujarati script on the doll, no horizontal overflow | **Tested** |
| Console errors / failed requests over every run | **None** |
| Real phones, sound by ear, a real voice provider | **Not tested** |

## Known limitations
- The petrol pump is a built 3D set, not a photograph. In the fog it reads, but it is visibly simpler than the photographed places. One real photo of a small rural pump would lift the finale.
- Kokila's expressions come from the existing Part 1 images. Her face can't be made "terrified" or "playful" without new photography of the same face, so the change in her is carried by framing, sound and lines.
- The bike is cut from the Part 1 hero photo with the visitor removed, so its far side is a soft edge. It is only ever seen at a distance or in the dark.
- Without a voice provider, Kokila's Part 2 lines are subtitles only.
- Headless testing can't judge sound; the mix needs a listen on headphones.

## Missing assets or credentials
- A photo of a small, isolated rural petrol pump at night (wide, plus the forecourt), to replace the 3D set.
- Optional: new photos of the same Kokila face with frightened and teasing expressions.
- A voice provider key (`ELEVENLABS_*` or `AZURE_SPEECH_*`) or recorded lines in `public/audio/voices/`, so her Part 2 lines are spoken.
