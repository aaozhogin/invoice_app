'use client';
import { useRouter } from 'next/navigation';

export default function LineItemCodesClient() {
  const router = useRouter();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Line Item Codes</h1>
      <button
        onClick={() => router.push('/main-menu')}
        style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}
      >
        Back
      </button>
    </div>
  );
}