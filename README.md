# Kali Chaudas CCTV

An animated horror night for Kali Chaudas, in English, Hindi and Gujarati. You scroll through five scenes (blood moon and diyas, the crossroads offering, the peepal tree, backward footprints, a jump scare) while your cursor or finger is a diya lighting the dark. It ends with a form where visitors can send in their own Kali Chaudas stories (pranks, real experiences, stories they heard).

- `index.html` is the whole site (no build step).
- Everything is drawn in code except the face at the end (`assets/cams/doll.jpg`), a CC BY photo credited in `assets/credits.json`. Attribution is required, so keep the credit link in the footer.
- All sound is generated in the browser; there are no audio files.
- `stories.json` holds the stories that have been approved for the public story wall. Submissions are never published automatically.

Run locally:

```bash
python3 -m http.server 8000
```
