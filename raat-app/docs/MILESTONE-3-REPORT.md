# RAAT — Milestone 3 report

Bus boarding, mobile flashlight, the three games, and Kokila's final call.
Live: https://raat-last-passenger-dspce.vercel.app/ (branch `claude/stoic-archimedes-axihrk`).

Everything marked **Tested** below was run in a real browser (Playwright, Chromium) against the
production build, and the result was checked. **Not tested** means exactly that.

---

## 1. Modified and new components

| Area | File | What changed |
|---|---|---|
| Session and time | `src/lib/session.ts` (new) | One session for the whole story: start timestamp, the visitor's time zone, and their 12/24-hour habit, captured when they press the final boarding button. Holds the call state and decline count in `sessionStorage`. `storyTime()` is the only time formatter. Before boarding it reads the device clock. |
| | `src/lib/store.ts` | `CallState` type; `sessionStart`, `tz`, `hour12`, `call`, `declines`. |
| | `src/hooks/useT.ts`, `src/data/translations/index.ts` | `{TIME}` (live clock) and `{START}` (boarding time) both come from `storyTime()`. |
| Opening | `src/components/experience/Entry.tsx` | Rewritten: gate → darkness (breathing, wind, creak, irregular heartbeat) → a figure → a pair of eyes → a distant bus horn → a vibrating phone → the invitation lines → name entry on that phone's lock screen. No sound before the visitor presses Begin. |
| Boarding | `src/data/stories/last-passenger.ts` | New `board` scene (13 shots) between `bus` and `inside`, with lines in English, Hindi and Gujarati. |
| | `src/components/film/HighwayFilm.tsx`, `src/lib/film/highway.ts`, `src/lib/three/shaders.ts` | The door shot: the pneumatic door opens and its interior lights the photo; the camera climbs the steps; the doorway fills with the bus's own light (the hidden cut). |
| | `src/lib/film/interior.ts`, `src/components/film/BusInterior.tsx`, `src/components/experience/WorldStage.tsx` | The interior side of the cut: facing the cab, the door shuts, turn to the aisle, walk, glance back at the driver far away, back to the aisle, the figure in the last seat. New driver cut-out in the cab. |
| Flashlight | `src/hooks/useFlashlight.ts` (new) | One Pointer Events flashlight for mouse, finger and pen. Pointer capture for touch; no smoothing for fingers (no lag); arrow keys move it too. `touch-action: none` only on the game stage. |
| | `src/components/games/DarkScene.tsx` (new) | A dark photo lit by a radial CSS mask. On narrow screens the finger's position across the screen maps to the same position across the photo. |
| Games | `src/components/games/GhostDetectionGame.tsx` (new) | **Find Kokila**: five hiding places, hold the light on her, she relocates, positional whispers, three hints, timed or untimed, win / lose / retry / skip. |
| | `src/components/games/DriverSecretGame.tsx` (new) | **The Driver's Secret**: the cab in the dark, three clues (ID card, duty log, newspaper cutting), reveal. |
| | `src/components/games/PhotographPuzzle.tsx` | **The Wedding Photograph**: magnifier, groom / bride / inked date, turn it over, Kokila's note, the anniversary memory. |
| | `src/lib/games/finish.ts` | Chains games in the same scene (inside → Find Kokila, then The Driver's Secret). |
| | `src/components/games/GhostHuntGame.tsx` | Deleted (replaced). |
| Final call | `src/components/ui/IncomingCall.tsx` (new) | The call state machine (below). |
| | `src/components/ui/KokilaScare.tsx` (new) | The jumpscare, plus its gradual no-jump-scare version. |
| | `src/components/ui/EndingCard.tsx`, `src/components/ui/Hud.tsx` | Old call screen removed; restart clears the session. |
| Glass removed | `src/components/fx/Overlays.tsx`, `src/app/globals.css`, `src/lib/animation/director.ts`, `src/lib/animation/stageState.ts` | Crack SVG, `.fx-crack` and the `crack` event are gone. Replaced by `lights-die`: the lights go out row by row, a seat creaks behind you, the phone buzzes with nothing on it. |
| Audio | `src/lib/audio/engine.ts`, `src/components/experience/AudioController.tsx` | New: horn, phone vibration, metal creak, irregular heartbeat, steps on metal, door close, rain layer. Events are matched by scene id, not number. |
| Styling | `src/app/globals.css` | Opening, games, magnifier, prop cards, scare, call buttons. |
| Others | `FourthWall.tsx`, `StoryText.tsx`, `TicketScene.tsx`, `Experience.tsx`, `ScrollController.tsx`, `Prototype.tsx` | Moved to scene ids and the session time; the ticket prints the boarding time. |

### The call state machine

```
IDLE → CALL_1 ─decline→ DECLINED_1 → CALL_2 ─decline→ DECLINED_2 → CALL_3 ─decline→ DECLINED_3
     → KOKILA_JUMPSCARE → FORCED_CALL (Answer only)
any CALL_n or FORCED_CALL ─answer→ ANSWERED → FINAL_CONVERSATION → DONE
```

- While a call is active, the page cannot scroll.
- After a reload, the call resumes from the saved decline count:
  - 0 declines → CALL_1
  - 1 decline → CALL_2
  - 2 declines → CALL_3
  - 3 declines → FORCED_CALL
- On the forced call, Enter or Space also answers.

---

## 2. Bug-fix report (found while testing this milestone)

| # | Bug | Cause | Fix |
|---|---|---|---|
| 1 | On phones, Kokila and the clues were almost impossible to light. | The dark photo panned with the beam and had dead zones. The image under the finger moved about 2.7× faster than the finger, in the opposite direction, so targets ran away. | The finger's position across the screen picks the same position across the photo, and the pan eases. Re-tested: all three games complete with real touch drags. |
| 2 | The lock-screen clock showed UTC before boarding (Kolkata showed 12:07 am when it was 5:37 am). | The store's default zone was `UTC` until the session began. | Before boarding, `storyTime()` reads the device zone and 12/24-hour habit. |
| 3 | The end badge was wrong (it said "Ghost Magnet" after winning both games). | The badge was computed once, when the page loaded. | It is now computed when the story finishes. |
| 4 | Boarding narration was out of step with the camera. "Far ahead, the driver" played over the empty aisle; "And right at the back…" played over the driver. | Camera and cue timings had drifted apart. | The camera is re-timed: cab, aisle, glance back at the driver, aisle, last seat. Each line now plays on its shot. |
| 5 | The figure at the back of the bus was nearly invisible. | It was dimmed too far. | Brighter in the boarding shot only. |
| 6 | The opening's "eyes" flash showed a smear of nose, not eyes. | The crop was aimed at the bridge of the nose. | Re-aimed at both eyes, with less contrast crush. |
| 7 | Game 3 card: the "Continue" button was barely visible. | Light-on-light colours. | Dark ink on the paper card. |
| 8 | Forced call: the phone icon was tiny and the label sat inside the button. | Button layout. | Icon centred at 38% of the button; label below it. |
| 9 | Adding the boarding scene shifted scene numbers, so effects fired in the wrong scenes. | Code compared scene numbers. | Everything uses scene ids or `sceneIndex()`. |
| 10 | Breaking-glass effect. | Didn't fit the story. | Removed completely (see table above). |

---

## 3. Desktop testing report (1280×720, Chromium, production build)

| Check | Result |
|---|---|
| Opening order: figure at about 4.4 s, eyes at 6.7 s, phone at 10.2 s after Begin (DOM timeline logged) | **Tested** |
| Eyes frame inspected after fix #6 | **Tested** |
| No sound before Begin (audio starts inside the Begin click handler) | **Tested** (code path; not listened to) |
| Name entry on the phone → story starts | **Tested** |
| Dynamic time: lock screen, "Time: …" line and ticket all show the visitor's local time (Asia/Kolkata and America/New_York; 12-hour) | **Tested** |
| Boarding: door opens, driver asks "Going to Ahmedabad?", climb, hidden cut, door shuts, aisle, driver far away, last seat, figure | **Tested** (frame-checked after fixes #4 and #5) |
| Find Kokila: found 3/3 → "She let you" win card → Continue | **Tested** |
| The Driver's Secret: 3 clues → "Then who is driving this bus?" | **Tested** |
| The Wedding Photograph: 3 front clues + back → anniversary memory → done card | **Tested** |
| Call: Decline ×3 → jumpscare → forced call with no Decline → Answer → conversation → end card | **Tested** |
| Answering on CALL_2 → no jumpscare | **Tested** |
| Scroll locked during the call (wheel up does not move the page) | **Tested** |
| Reload after 2 declines resumes at CALL_3; reload during the forced call stays forced | **Tested** |
| Enter key answers the forced call | **Tested** |
| No-jump-scare mode: soft gradual scare, call logic unchanged, story completes | **Tested** |
| Hindi and Gujarati: time line ("समय: 5:42 am।" / "સમય: 5:42 AM.") and the ticket | **Tested** |
| Same call flow on the live Vercel site | **Tested** |
| No page errors in the full run | **Tested** |

## 4. Mobile testing report (iPhone 13 profile, 390×844, Chromium, real touch events via CDP)

| Check | Result |
|---|---|
| Flashlight follows the finger (touchStart / touchMove / touchEnd); no hover needed | **Tested** |
| Find Kokila, The Driver's Secret, The Wedding Photograph all completed by touch | **Tested** (after fix #1) |
| Call: Decline ×3 → jumpscare → forced call (Answer only) → end card, tapped by finger | **Tested** |
| Page does not scroll while a game or call is active | **Tested** |
| Call buttons at least 70 px; game controls not clipped (screenshots reviewed) | **Tested** |

### Not tested
- **Real devices.** No physical iPhone (Safari/WebKit) or Android phone was used. Everything above is Chromium with mobile emulation.
- **Sound.** The audio is synthesised and every cue is triggered from code, but nobody has listened to it here. Mix levels need a human ear on real headphones.
- **Hindi and Gujarati grammar** of the new lines. I wrote them, but a native speaker should read them, especially the gendered Gujarati.
- **The 180° turn on boarding** passes across very dark side walls and shows a black sweep for a moment. On a fast device it reads as a head-turn in the dark; it is not a broken frame. Brightening those walls is an option if it bothers you.

---

## 5. Screen recording

`raat-milestone3.mp4` (9:50, 1280×720) was sent with this report.

How it was made:
- **Capture.** It is a real browser recording of the production build, not a mock-up, recorded in three parts:
  1. Opening + boarding.
  2. Interior + all three games.
  3. Encounter → ending → three declined calls → jumpscare → forced call → end card.
- **Speed.** Headless software WebGL renders slowly, so the raw capture (about 70 minutes) was retimed by dropping repeated frames. Motion can look faster or jumpier than on a real device.
- **What the cut does and doesn't show.**
  - Part 1 was recorded before fix #6, so its eyes flash is the old crop.
  - The eyes beat lasts about 120 ms by design and is effectively invisible after retiming. The DOM timeline and frozen-frame test above are the evidence for it.
  - The recording has no sound.
