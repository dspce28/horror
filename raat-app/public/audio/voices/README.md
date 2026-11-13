# Recorded voice lines

A real recording always beats a generated voice, and it plays even without any voice provider.

1. Record the line as MP3 (mono is fine, 44.1 kHz, no music, a little room tone is OK).
2. Save it as `<who>/<line key>-<language>.mp3`, for example:
   - `kokila/whisper_end-en.mp3` — "We'll meet again."
   - `kokila/whisper_end-hi.mp3` — "फिर मिलेंगे…"
   - `kokila/whisper_end-gu.mp3` — "મળશું… ફરી."
3. Add `"<line key>-<language>"` to `lines` in `manifest.json`, e.g. `["whisper_end-en", "whisper_end-hi", "whisper_end-gu"]`.
4. Redeploy.

Line keys and speakers are listed in `src/lib/audio/lines.ts`. Lines that contain the visitor's name
(`i_name`, `call_line1`) can't be pre-recorded for every name; those use the voice provider.
