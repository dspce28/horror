# RAAT — Episode 01: The Last Passenger

Scroll-driven interactive horror story (Next.js App Router, React Three Fiber, GSAP ScrollTrigger, Lenis, Web Audio).
English, Hindi and Gujarati. The visitor is the hero: their name and chosen gender (Beta / Beti) drive every line.

```
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Where things live
- `src/data/stories/last-passenger.ts` — scenes, scroll lengths, dialogue cues, story events, game stops
- `src/data/translations/{en,hi,gu}.ts` — every visible string; `[male|female]` and `{N}` tokens
- `src/lib/animation/director.ts` — camera shots and world state per scene (pure functions, tune timing here)
- `src/components/scenes/*` — highway, bus (outside and inside), characters, atmosphere, ticket
- `src/components/games/*` — "Where is she?" and the 1999 photograph puzzle
- `src/lib/audio/engine.ts` — all sound, synthesised in the browser
- `src/lib/assets.ts` — asset manifest. Put real character art in `public/raat/...` and set `ready: true`

## Replacing the stand-in characters
The ghost, her head (hair over face / looking), the driver (back / face) and the 1999 photo are procedural
stand-ins. Transparent PNG cut-outs with the same framing replace them with no code changes.
