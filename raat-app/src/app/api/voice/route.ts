// Character voices, generated on the server so no API key ever reaches the browser.
//
//   GET /api/voice?k=<line key>&l=<en|hi|gu>&g=<m|f|n>&n=<visitor name>
//
// Only lines from the script can be spoken (looked up by key), so this is not an open text-to-speech
// endpoint. Lines without the visitor's name are the same for everyone and are cached at the edge;
// lines with a name are cached only in that visitor's browser.
//
// Providers (set in the deployment's environment; the first one configured is used):
//   ElevenLabs:  ELEVENLABS_API_KEY, ELEVENLABS_VOICE_KOKILA, ELEVENLABS_VOICE_RAMESH, ELEVENLABS_MODEL (optional)
//   Azure:       AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
// With neither, the route answers 503 and the story plays with subtitles only.
import { translate, type Gender, type Lang } from '@/data/translations';
import type { Key } from '@/data/translations/en';
import { VOICED, cleanName, type Style, type Who } from '@/lib/audio/lines';

export const runtime = 'nodejs';

const AZURE_VOICES: Record<Lang, Record<Who, string>> = {
  en: { kokila: 'en-IN-NeerjaNeural', ramesh: 'en-IN-PrabhatNeural' },
  hi: { kokila: 'hi-IN-SwaraNeural', ramesh: 'hi-IN-MadhurNeural' },
  gu: { kokila: 'gu-IN-DhwaniNeural', ramesh: 'gu-IN-NiranjanNeural' },
};
const LOCALES: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function elevenlabs(text: string, who: Who, style: Style): Promise<ArrayBuffer | null> {
  const key = process.env.ELEVENLABS_API_KEY, voice = who === 'kokila' ? process.env.ELEVENLABS_VOICE_KOKILA : process.env.ELEVENLABS_VOICE_RAMESH;
  if (!key || !voice) return null;
  const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  // v3 models take delivery directions as audio tags
  const tagged = model.startsWith('eleven_v3') && (style === 'whisper' || style === 'close') ? `[whispers] ${text}` : text;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: tagged, model_id: model,
      voice_settings: { stability: style === 'whisper' ? .3 : .45, similarity_boost: .85, style: who === 'kokila' ? .55 : .35, use_speaker_boost: true },
    }),
  });
  return r.ok ? r.arrayBuffer() : null;
}

async function azure(text: string, lang: Lang, who: Who, style: Style): Promise<ArrayBuffer | null> {
  const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  // slower and lower for a whisper; tired and low for Ramesh
  const prosody = style === 'whisper' || style === 'close' ? 'rate="-22%" pitch="-8%" volume="soft"' : who === 'ramesh' ? 'rate="-12%" pitch="-7%"' : 'rate="-10%" pitch="-4%"';
  const ssml = `<speak version="1.0" xml:lang="${LOCALES[lang]}"><voice name="${AZURE_VOICES[lang][who]}"><prosody ${prosody}>${esc(text)}</prosody></voice></speak>`;
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'raat-voice' },
    body: ssml,
  });
  return r.ok ? r.arrayBuffer() : null;
}

/**
 * Her calling the visitor's name, with no account needed: eSpeak-NG's whispering female voice, slow and low,
 * generated here on the server. The browser then makes it a ghost (slowed, doubled, echoing). The voice follows
 * the script the name is written in (Devanagari, Gujarati or Latin), so the name is pronounced, not spelled.
 */
async function espeakName(name: string): Promise<ArrayBuffer | null> {
  const { default: ESpeakNg } = await import('espeak-ng');
  const v = /[\u0A80-\u0AFF]/.test(name) ? 'gu' : /[\u0900-\u097F]/.test(name) ? 'hi' : 'en';
  const es = await ESpeakNg({ arguments: ['-v', `${v}+whisperf`, '-s', '78', '-p', '18', '-a', '190', '-g', '12', '-w', '/out.wav', `${name}...`] });
  const wav: Uint8Array = es.FS.readFile('/out.wav');
  return wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
}

const activeProvider = () => (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_KOKILA ? 'elevenlabs' : process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION ? 'azure' : null);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  // no line asked for: just say whether voices are available (the browser asks this once, so a site without a
  // provider never shows failed requests)
  // `name`: her calling the visitor's name always has a voice (eSpeak-NG on this server, no account needed)
  if (!q.get('k')) return Response.json({ available: !!activeProvider(), provider: activeProvider(), name: true }, { headers: { 'Cache-Control': 'no-store' } });
  const k = q.get('k') as Key | null, lang = q.get('l') as Lang | null, g = q.get('g') as Gender | null;
  const line = k ? VOICED[k] : undefined;
  if (!k || !line || !lang || !(lang in LOCALES) || !g || !['m', 'f', 'n'].includes(g)) {
    return Response.json({ error: 'unknown line' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const name = cleanName(q.get('n')) || translate(lang, 'default_name', { name: '', gender: g });
  const text = translate(lang, k, { name, gender: g }).replace(/…/g, '...');
  const hasName = text.includes(name);

  let audio: ArrayBuffer | null = null, provider = 'none', type = 'audio/mpeg';
  try {
    if (process.env.ELEVENLABS_API_KEY) { provider = 'elevenlabs'; audio = await elevenlabs(text, line.who, line.style); }
    else if (process.env.AZURE_SPEECH_KEY) { provider = 'azure'; audio = await azure(text, lang, line.who, line.style); }
    else if (k === 'i_name') { provider = 'espeak'; audio = await espeakName(name); type = 'audio/wav'; }
  } catch { audio = null; }

  if (!audio) {
    // the story goes on with subtitles; the browser remembers this for the session
    return Response.json({ error: provider === 'none' ? 'no voice provider configured' : 'voice provider failed' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return new Response(audio, {
    headers: {
      'Content-Type': type,
      'Cache-Control': hasName ? 'private, max-age=86400' : 'public, max-age=86400, s-maxage=31536000, immutable',
    },
  });
}
