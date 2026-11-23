# RAAT Part 2: image prompts for the missing shots

## Rules for every image
- 16:9 landscape, at least 1672×941.
- Photorealistic, cinematic night, shot on a 35 mm film camera.
- Deep blue-grey night, wet asphalt, fog, amber practical lights, subtle film grain.
- No text, no signs with letters, no logos or brand names (no Indian Oil, HP, BPCL or GSRTC), no watermark.
- **Attach reference images.** A text prompt alone will not reproduce Kokila's face or the visitor's bike:
  - For Kokila, attach `raat-app/public/raat/scenes/her-face.webp` and `raat-app/public/raat/cutouts/her-look.webp`.
  - For the bike, attach `raat-app/public/raat/scenes/hero-m.webp` (motorcycle) or `hero-f.webp` (scooter).

Negative prompt (if your tool has one): `text, letters, logo, brand, watermark, signature, cartoon, CGI, 3D render, oversaturated, extra fingers, deformed face, gore, blood pool, daylight`

---

## 1. Petrol pump, wide (highest priority)
```
A small isolated rural petrol pump beside an empty two-lane highway in Gujarat, India, at 3 a.m. Seen from the road, about 40 metres away, at eye height, as someone walking towards it. A low flat white canopy on four square pillars, one long tube light under it glowing cold green-white, a single old fuel dispenser, a tiny brick attendant's cabin with one dim amber window. Wet asphalt reflecting the tube light, thick ground fog, dark trees behind, one sodium street lamp far down the road. Almost empty, lonely, quiet, slightly eerie. Blank faded sign board with no text. Photorealistic, cinematic, 35mm film, deep blue-grey night, subtle grain, 16:9.
```

## 2. Petrol pump forecourt, close
```
Under the canopy of a small rural Indian petrol pump at night, first-person eye-level view standing on the wet concrete forecourt. One old fuel dispenser with a dim green display showing no digits, a coiled black hose, oil stains, a plastic chair by a tiny brick cabin with an amber window, one flickering tube light above casting hard cold light, darkness and fog beyond the canopy edge, the empty highway on the right. No people. No text or branding anywhere. Photorealistic, cinematic, 35mm film, subtle grain, 16:9.
```

## 3. The attendant checking the bike's tank
Attach `hero-m.webp` and use the motorcycle variant. For a female visitor, attach `hero-f.webp` and swap in the scooter.
```
Night, edge of a small rural petrol pump forecourt in Gujarat. A middle-aged Indian petrol pump attendant in a faded khaki shirt, seen from the side and slightly behind, face mostly in shadow, has opened the fuel tank cap of a parked black commuter motorcycle [OR: a maroon scooter] and is peering into it with a small torch. The vehicle matches the reference image exactly. Cold green-white tube light from the canopy behind him, wet road, fog, empty highway. Quiet, matter-of-fact moment. No text, no logos. Photorealistic, cinematic, 35mm film, 16:9.
```

## 4. Fuel tank, extreme close-up (optional; the site already has a gauge insert)
```
Extreme close-up of an open motorcycle fuel tank at night, lit by a small torch: the inside is completely dry and empty, a few drops at the bottom, the tank cap hanging open on its hinge, scratched black paint with raindrops. Cold tube light in the out-of-focus background. Photorealistic macro, shallow depth of field, 16:9, no text.
```

## 5. Kokila, urgent warning at the crossroads (close-up)
Attach `her-face.webp`. The face must match.
```
Extreme close-up of the woman in the reference image, same face, same red bindi, same long wet black hair, same pale skin and dark hollow eyes. Night, at a deserted crossroads, a warm diya glow from below on one side of her face, fog behind. Her expression is urgent and frightened, lips slightly parted as if whispering a warning, eyes wide and fixed on the camera, brows raised. Not smiling, not angry. Photorealistic, cinematic, 35mm film, shallow depth of field, 16:9.
```

## 6. Kokila, terrified at the banyan (close-up)
Attach `her-face.webp`.
```
Extreme close-up of the woman in the reference image, same face, bindi, hair and skin. Night, cold blue moonlight and mist, banyan leaves blurred behind her. She is terrified: eyes wide, glancing past the camera and upward as if at something above, breath held, a tear track on one cheek, hair stuck to her face. Not monstrous, human fear. Photorealistic, cinematic, 35mm film, 16:9.
```

## 7. Kokila, teasing smile (for the final call)
Attach `her-face.webp`.
```
Close-up portrait of the woman in the reference image, same face, bindi and hair, in near-total darkness lit only by the cold glow of a phone screen from below. A small knowing, teasing half-smile, one eyebrow slightly raised, eyes still dark and unsettling. Playful but still eerie, not friendly. Photorealistic, cinematic, 35mm film, 16:9.
```

## 8. Kokila across the crossroads (wide)
Attach the crossroads image `raat-app/public/assets/part2/crossroads/p2-crossroads-wide.webp` plus `her-look.webp`.
```
The same deserted Indian crossroads as the reference: wet asphalt, a circle of water in the middle of the road with vadas, lemons, green chillies, a glass of water, a small lit diya and a black cloth doll inside it, one sodium street lamp, fog. On the far side of the road, about 30 metres away, the woman from the second reference stands barefoot and perfectly still facing the camera, off-white aged cotton saree with a faded maroon border, long wet black hair over her shoulders, half hidden in fog. Photorealistic, cinematic, 35mm film, 16:9.
```

## 9. Haveli courtyard with banyan and otlo
The current banyan photo has no haveli around it.
```
Inside the courtyard of an abandoned old Gujarati haveli at night: weathered carved wooden balconies (jharokhas) and peeling lime-plastered walls on three sides, an ancient banyan tree growing in the centre with aerial roots hanging down and red sacred threads tied around its trunk, a raised square stone platform (otlo) around its base, one small diya flickering on the otlo, dry leaves on stone flooring, fog drifting through the courtyard, cold moonlight from above, deep shadows in the doorways. Nobody present. Photorealistic, cinematic, 35mm film, 16:9, no text.
```

## 10. Through the haveli door (the moment after it opens)
```
First-person view through a pair of heavy old carved wooden haveli doors that have just swung inward by themselves, an iron chain lying on the stone threshold, beyond them a pitch-dark passage opening into a misty moonlit courtyard with the silhouette of a huge banyan tree. Two small oil lamps in wall niches either side of the door. No people. Photorealistic, cinematic, 35mm film, 16:9.
```

## 11. Kokila on the unfinished building floor
Attach `raat-app/public/assets/part2/construction/p2-construction-building.webp` plus `her-look.webp`.
```
The same half-constructed concrete building at night as the reference: exposed steel bars, bamboo scaffolding, brick infill, one bare amber bulb, fog. On the open second-floor slab, the woman from the second reference stands barefoot at the edge, looking down at the camera, still and watchful, off-white saree with a faded maroon border, long wet black hair. She is small in the frame. Photorealistic, cinematic, 35mm film, 16:9.
```

---

## Not recommended to generate
- **The eleven hanging figures:** most generators refuse this. When they don't, the result tends to look like the real Burari case. The site draws them as soft silhouettes in the mist, which keeps them fictional and non-graphic.
- **Anything with readable text** (the visitor's name, messages, signs): the site renders all text as real text.
