# Aadhi Raat

Aadhi Raat: an animated Indian horror night, in English, Hindi and Gujarati. You scroll through the scenes (blood moon and diyas, the crossroads offering, the peepal tree, your name being called, the mirror, backward footprints, a jump scare, Nani's rules) while your cursor or finger is a diya lighting the dark. It ends with a form where visitors can send in their own Kali Chaudas stories (pranks, real experiences, stories they heard).

- `index.html` is the whole site (no build step).
- Ghost images in `assets/art/` were made with an AI image generator. The footer credits say so; keep that disclosure. Everything else is drawn in code.
- Sound is generated in the browser by default. To use real recordings instead, put MP3 files in `assets/audio/` and list their names in `assets/audio/manifest.json`, e.g. `["scream", "howl"]`. Supported names: `scream`, `howl`, `wind`, `whisper`, `bells`, `owl`, `breath`, `heartbeat`, `hum`, `thunder`, `crack`. Use CC0 or properly licensed files and credit them.
- `stories.json` holds the stories that have been approved for the public story wall. Submissions are never published automatically.

Run locally:

```bash
python3 -m http.server 8000
```

## Theme music

The site plays `assets/audio/theme.mp4` (or `theme.mp3` / `theme.m4a`) on the opening screens if the file exists, and lowers it once the stories start. No theme file is committed here; add your own.

## Story submissions (PHP)

- `api/stories.php` receives the form and saves each story to `data/pending/` (max 5 per hour per visitor). Nothing goes public automatically.
- `admin.php` is your private page to **Publish**, **Delete** or **Remove from site**. Published stories are written to `stories.json`, which the site reads.
- First visit to `admin.php` walks you through setting a password; it ends with creating `data/config.php` in Hostinger's File Manager. That file is never committed.
- `data/` and `assets/incoming/` are blocked from the web by `.htaccess`.

## Deploying on Hostinger

1. hPanel → **Domains → Subdomains**: create the subdomain. If the domain's DNS is managed somewhere else, add an **A record** for the subdomain pointing to the server IP shown in hPanel (Websites → Dashboard → Plan details / DNS).
2. hPanel → **Advanced → Git**: repository `git@github.com:dspce28/horror.git`, branch `claude/stoic-archimedes-axihrk`, install path = the subdomain's folder. Because the repo is private, copy the SSH key hPanel shows into GitHub → repo **Settings → Deploy keys** (read-only).
   Or upload a ZIP of the repo through **File Manager** and extract it in the subdomain folder.
3. hPanel → **Security → SSL**: install the free SSL certificate for the subdomain.
4. Open `https://<subdomain>/admin.php` and set your password.
5. Optional: put your theme track at `assets/audio/theme.mp4`.
