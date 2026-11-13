# RAAT — The Last Passenger · Part 1 (pure supernatural horror)

Live: https://raat-last-passenger-dspce.vercel.app/ · branch `claude/stoic-archimedes-axihrk`.
Marks: **Tested** = run in a real browser (Playwright/Chromium) against the production build and checked.
**Not tested** = exactly that. Part 2 has **not** been built: only the short "Coming soon" teaser exists.

## 1. Story changes
All comedy is gone (matchmaking, the movie complaint, joke badges, joke ticket, the laugh, the comedy music).
| # | Scene (id) | What happens |
|---|---|---|
| 1 | Warning (`open`) | Black, night insects, a breath, low rumble; "Some journeys should never be taken after midnight." |
| 2 | Highway (`highway`) | Captured local time; the motorbike coughs and dies (sound); silence; phone: battery 3%, no network; headlights in the fog. |
| 3 | The bus (`bus`) | The red bus crawls out of the fog and stops. |
| 4 | Boarding (`board`) | Door, "Going to Ahmedabad?", "Just sit. Anywhere… but the back.", steps, hidden cut in the doorway light, the door shuts, the aisle, the driver far ahead, the figure at the back. |
| 5–6 | The last passenger (`inside`) | She looks like a passenger. Her reflection faces {N}. Silence; then she whispers {N}'s name from behind; "Don't look behind you…"; the seat is empty; "I'm right here…". |
| 7 | Find Kokila (game) | Flashlight game, find her three times (existing, kept). |
| 8 | Ramesh's warning (`driver`) | "Don't look at her." He never turns. In the windscreen, a woman stands behind {N}. "Whatever she says… don't answer her." |
| 9–10 | Photograph, then the drawer (games) | Wedding photo (12·5·1974; note dated 12·5·1999), then the driver's ID, duty log and newspaper cutting: Ramesh died on 13 May 1999. |
| 11 | Reveal (`reveal`) | Lights die row by row; the engine goes silent but the bus keeps moving; Ramesh turns (grey face, black eyes): "I told you not to look."; the seat beside {N} is pressed down; "Every night… someone gets on."; she comes closer; the lights come back and she is in her seat. |
| 12 | The bus stops (`leave`) | {N} gets off; the door closes; {N} turns; the fog takes the bus, far end first; the lights soften; silence; the empty road. |
| — | The ticket (`ticket`) | Kept from before but now serious: a ticket in {N}'s pocket, their name, dated 12-05-1999, seat LAST, stamped **PASSENGERS: 2**. |
| 13 | The call (`end`) | KOKILA BEN calls. Answer at any time → dialogue. Decline ×3 → black, "Pick up." from behind → a fourth call with Answer only. |
| 14 | Phone dialogue | Silence, breathing, "{N}… I knew you'd answer." (2 s pause) "Why did you get off the bus? I'm still travelling with you." |
| 15 | Apparition | Her face in the dark phone screen, the phone drops, a shadow, hair at the edge, a breath, then her, very close. Hard cut to black. |
| 16 | Whisper | Silence, "We'll meet again.", 3–4 s of black, then END OF PART ONE. |

Grammar: every line in English, Hindi and Gujarati with masculine / feminine / **neutral** forms (`[m|f|n]` tokens;
neutral uses the respectful plural, e.g. Hindi "उतर जाते हैं", Gujarati "તમે … ઊતરી ગયા"; English "them").
Onboarding gained a third choice (Neither / कोई नहीं / એકેય નહીં).

## 2. Visual and animation changes
- New shot lists for Ramesh's warning, the reveal, the bus leaving, and the empty road (`lib/animation/director.ts`).
- The bus vanishing: a fog front in the photo shader that takes the picture far-to-near (`uVanish`), headlight glow fading, light falling.
- Kept from Milestone 4: living photographs (breathing/head/hair), rack focus, windscreen reflection, lights dying row by row.
- Apparition sequence and end screen (CSS, restrained reveals, no transition on the cut to black).

## 3. Audio and voice
**One audio director** (`lib/audio/engine.ts`), no second system:
- buses: ambience (bed, rain, engine, tube hum, insects, bike) and music → *music & atmosphere* volume → duck → master; dialogue → *voices* volume → master;
- ducking under every spoken line, restored slowly; **one voice at a time** (a new line fades the previous out in 120 ms);
- HRTF placement just behind the listener for whispers; stereo placement for Ramesh; phone EQ (300–3400 Hz, saturation) + line noise;
- new synthesized sounds: night insects, motorbike ride / sputter / stall, sari fabric, close breath, sudden silence, engine cut, lights back, call connect/end, the teaser's crunch.
- Settings panel (tap, works on phones): overall volume, voices, music & atmosphere; mute; replay-last-line.
- No-jump-scare mode: the reveal's scream and shake are replaced by a breath; the call scare and apparition fade in slowly; no stings.

**Voices** (`app/api/voice/route.ts`, `lib/audio/voice.ts`, `lib/audio/lines.ts`):
- 16 lines are voiced (Kokila 9, Ramesh 7) — including the name whisper, "Don't look behind you", "Don't look at her", "Pick up.", both phone lines and the final whisper.
- Generated **on the server**; the browser never sees a key. Only script lines can be spoken (by key), so the route is not an open TTS service. Names are cleaned (letters/marks only, 32 chars). Lines with a name are cached only in the visitor's browser; lines without are cached at the edge.
- The visitor's name is spoken **inside the whole sentence** (the full sentence is generated), not stitched.
- The browser asks once whether a provider exists. With none, it never requests clips and the subtitles carry every line; a provider failure or a slow network (8 s timeout) also falls back to subtitles. The story never waits on audio.

## 4. Files (this part)
New: `app/api/voice/route.ts`, `lib/audio/voice.ts`, `lib/audio/lines.ts`, `lib/replay.ts`, `data/recommendations.ts`, `components/ui/EndScreen.tsx`, `components/ui/FinalSequence.tsx`, `docs/PART-1-REPORT.md`.
Changed: `data/stories/last-passenger.ts`, `data/translations/{en,hi,gu,index}.ts`, `lib/audio/engine.ts`, `components/experience/AudioController.tsx`, `components/ui/IncomingCall.tsx`, `components/ui/Hud.tsx`, `components/ui/PhoneNotification.tsx`, `components/scenes/TicketScene.tsx`, `components/scenes/PhotoWorld.tsx`, `lib/three/shaders.ts`, `lib/animation/director.ts`, `lib/animation/stageState.ts`, `lib/gender.ts`, `lib/store.ts`, `components/experience/{Entry,Experience,WorldStage,FourthWall}.tsx`, `components/prototype/Prototype.tsx`, `app/globals.css`.
Removed: `components/ui/EndingCard.tsx`.

## 5. Audio assets used
All effects and atmosphere are **synthesized in the browser** (Web Audio): no third-party recordings, no licensing exposure.
The optional theme file `public/raat/audio/theme.mp4` is unchanged from before. No film music is embedded anywhere;
the soundtrack list only links out.

## 6. Missing assets / credentials
- **A voice provider key** (see §7). Until one is set, the story plays with subtitles only — no voice acting.
- **Photography that doesn't exist yet**: a moving motorbike (the breakdown is told through sound and narration over the existing highway film), a crossroads and a lemon for the teaser (told in type, sound and darkness), a bus driving *away* (the bus is taken by fog in place instead).

## 7. Voice (TTS) set-up — environment variables (Vercel → Project → Settings → Environment Variables)
One of:
- **Azure Speech** (native gu-IN / hi-IN / en-IN neural voices): `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`.
  Voices used: Kokila — en-IN-NeerjaNeural / hi-IN-SwaraNeural / gu-IN-DhwaniNeural; Ramesh — en-IN-PrabhatNeural / hi-IN-MadhurNeural / gu-IN-NiranjanNeural.
- **ElevenLabs** (more expressive; check Gujarati quality first): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_KOKILA`, `ELEVENLABS_VOICE_RAMESH` (voice IDs), optional `ELEVENLABS_MODEL` (default `eleven_multilingual_v2`; `eleven_v3` adds whisper delivery).
Then redeploy. `GET /api/voice` reports `{ available, provider }`.

## 8. Testing results
All in Chromium (Playwright) against the production build; mobile = iPhone 13 emulation with real touch events.

| Check | Result |
|---|---|
| Full ending, English, masculine, decline ×3: ticket (name, 12-05-1999, PASSENGERS: 2) → call "KOKILA BEN" → 3 declines → "Pick up." → 4th call with **one** button → both lines with pauses → apparition → "We'll meet again." → end card | **Tested, desktop and mobile** |
| Hindi, **neutral**, no-jump-scare mode: same path, soft scare, Hindi grammar (उठाओगे / उतर क्यों गए) | **Tested** |
| Gujarati, **feminine**, answer the first call: no scare, feminine forms (ઊતરી ગઈ) | **Tested** |
| End screen: four options; teaser ends on "Part two · Coming soon"; 10 film links (each verified to resolve to the right Wikipedia article; one fixed); 9 soundtrack links open in a new tab with `noopener` | **Tested** |
| Replay: back to the start without reload, story/call/declines reset, language kept, new story clock | **Tested** |
| Games in the new order (Find Kokila → photograph → drawer): all complete | **Tested, desktop and mobile (touch)** |
| Story clock: lock screen, "Time:" line and ticket show the same captured minute; the call shows start + elapsed (Asia/Kolkata, America/Los_Angeles) | **Tested** |
| No horizontal overflow; subtitles ≥ 16.8 px; call buttons 70 px — iPhone 13 portrait and landscape | **Tested** |
| Console errors / failed network requests over every run | **None** |
| Voice route: no provider → `{available:false}`, no clip requests made; unknown line → 400 | **Tested** (live and local) |
| New boarding photo: door closed → opens → camera up the steps → interior; same bus when getting off | **Tested** (frame captures) |
| Voices with a real provider | **Not tested** (no key) |
| Sound by ear, real iPhone / Android | **Not tested** |

## 11. Screen recording
`raat-part1.mp4` (10:20, 960×540, 24.2 MB): the whole journey recorded live in the browser in three parts and joined.
Headless software rendering is slow, so repeated frames were dropped to retime it: motion looks faster and jumpier
than on a real device, and there is no sound. The final eyes flash and the whisper's audio are not visible/audible in it.

## 9. Known limitations
- No voice acting until a provider key is configured (§7).
- Real phones (iOS Safari, Android Chrome) not tested; mobile is Chromium emulating an iPhone 13 with real touch events.
- Sound mix not judged by ear here (headless browser); levels need a listen on headphones.
- Hindi and Gujarati lines should be read by a native speaker, especially the neutral forms.
- Hair motion in the photos is a shader effect on stills, not animation of new footage; no new facial expressions.

## 10. Part 2
Not built. The "Next part" option shows a short teaser (a crossroads, a lemon pierced with nails, a crunch underfoot, cut to black, "Part two · Coming soon") and nothing more.
