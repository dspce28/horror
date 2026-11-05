# Kali Chaudas CCTV

A horror site for Kali Chaudas night: recovered CCTV from a housing society, in English, Hindi and Gujarati. It ends with a form where visitors can send in their own Kali Chaudas stories (pranks, real experiences, stories they heard).

- `index.html` is the whole site (no build step).
- `assets/cams/` holds the camera frames. They are Creative Commons photos; see `assets/credits.json`. Attribution is required, so keep the credits page.
- `stories.json` holds the stories that have been approved for the public story wall. Submissions are never published automatically.

Run locally:

```bash
python3 -m http.server 8000
```
