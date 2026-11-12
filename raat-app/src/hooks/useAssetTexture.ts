'use client';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { assetUrl, type AssetId } from '@/lib/assets';

/** Returns the procedural stand-in at once, then swaps in the real file if the manifest says it exists. */
export function useAssetTexture(id: AssetId, fallback: () => THREE.Texture): THREE.Texture {
  const stand = useMemo(fallback, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tex, setTex] = useState<THREE.Texture>(stand);
  useEffect(() => {
    const url = assetUrl(id);
    if (!url) return;
    let alive = true;
    new THREE.TextureLoader().load(url, (t) => { if (!alive) return; t.colorSpace = THREE.SRGBColorSpace; setTex(t); });
    return () => { alive = false; };
  }, [id]);
  useEffect(() => () => { stand.dispose(); }, [stand]);
  return tex;
}
