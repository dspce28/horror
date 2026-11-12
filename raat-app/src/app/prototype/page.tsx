import type { Metadata } from 'next';
import Prototype from '@/components/prototype/Prototype';

export const metadata: Metadata = { title: 'RAAT — 30-second prototype', robots: { index: false } };

export default function Page() {
  return <Prototype />;
}
