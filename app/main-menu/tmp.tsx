'use client';
import { useRouter } from 'next/navigation';

export default function MainMenuClient() {
  const router = useRouter();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Main Menu</h1>
      <button
        onClick={() => router.push('/line-item-codes')}
        style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}
      >
        Go to Line Item Codes
      </button>
    </div>
  );
}