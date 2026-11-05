# Kali Chaudas CCTV

An animated horror night for Kali Chaudas, in English, Hindi and Gujarati. You scroll through the scenes (blood moon and diyas, the crossroads offering, the peepal tree, your name being called, the mirror, backward footprints, a jump scare, Nani's rules) while your cursor or finger is a diya lighting the dark. It ends with a form where visitors can send in their own Kali Chaudas stories (pranks, real experiences, stories they heard).

- `index.html` is the whole site (no build step).
- Ghost images in `assets/art/` were made with an AI image generator. The footer credits say so; keep that disclosure. Everything else is drawn in code.
- Sound is generated in the browser by default. To use real recordings instead, put MP3 files in `assets/audio/` and list their names in `assets/audio/manifest.json`, e.g. `["scream", "howl"]`. Supported names: `scream`, `howl`, `wind`, `whisper`, `bells`, `owl`, `breath`, `heartbeat`, `hum`, `thunder`, `crack`. Use CC0 or properly licensed files and credit them.
- `stories.json` holds the stories that have been approved for the public story wall. Submissions are never published automatically.

Run locally:

```bash
python3 -m http.server 8000
```
