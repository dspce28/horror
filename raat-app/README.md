# RAAT — Episode 01: The Last Passenger

Scroll-driven interactive horror story (Next.js App Router, GSAP ScrollTrigger, Lenis, Web Audio). Real photographs are moved by the scroll like a camera, with parallax, rain, flicker and shake.
English, Hindi and Gujarati. The visitor is the hero: their name and chosen gender (Beta / Beti) drive every line.

```
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Where things live
- `src/data/stories/last-passenger.ts` — scenes, scroll lengths, dialogue cues, story events, game stops
- `src/data/translations/{en,hi,gu}.ts` — every visible string; `[male|female]` and `{N}` tokens
- `src/lib/animation/director.ts` — the shot list: which photo, focus point, zoom, light, rain, shake per scene (tune timing here)
- `src/components/experience/PhotoStage.tsx` — draws the shots
- `public/raat/scenes/` — the photographs (`*.webp` desktop, `*-m.webp` phones)
- `src/components/scenes/TicketScene.tsx` — the burning ticket
- `src/components/games/*` — "Where is she?" and the 1999 photograph puzzle
- `src/lib/audio/engine.ts` — all sound, synthesised in the browser

## Changing a picture
Replace the file in `public/raat/scenes/` with the same name (16:9, about 1600 px wide, plus a 900 px `-m` version).
