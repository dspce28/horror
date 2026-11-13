declare module 'espeak-ng' {
  interface ESpeakInstance { FS: { readFile(path: string, opts?: { encoding: 'utf8' }): Uint8Array } }
  export default function ESpeakNg(opts: { arguments: string[] }): Promise<ESpeakInstance>;
}
