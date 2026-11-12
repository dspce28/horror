// Central asset manifest. Drop a file into public/raat/... and flip its flag to true:
// the scene picks it up instead of the procedural stand-in, with no other code changes.
export const ASSETS = {
  ghostBody: { src: '/raat/characters/ghost-body.png', ready: false },
  ghostHead: { src: '/raat/characters/ghost-head.png', ready: false },
  ghostHeadLook: { src: '/raat/characters/ghost-head-look.png', ready: false },
  ghostFace: { src: '/raat/characters/ghost-face.jpg', ready: false },
  driverBack: { src: '/raat/characters/driver-back.png', ready: false },
  driverFace: { src: '/raat/characters/driver-face.png', ready: false },
  photoFront: { src: '/raat/props/photo-1999.jpg', ready: false },
  theme: { src: '/raat/audio/theme.mp4', ready: true },
} as const;

export type AssetId = keyof typeof ASSETS;
export const assetUrl = (id: AssetId): string | null => (ASSETS[id].ready ? ASSETS[id].src : null);
