'use client';
import { useRouter } from 'next/navigation';

export default function MainMenuClient() {
  const router = useRouter();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Main Menu</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
        <button
          onClick={() => router.push('/line-item-codes')}
          style={{ padding: '0.75rem 1rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          Line Item Codes
        </button>
        <button
          onClick={() => router.push('/calendar')}
          style={{ padding: '0.75rem 1rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          Calendar
        </button>
        <button
          onClick={() => router.push('/carers')}
          style={{ padding: '0.75rem 1rem', fontSize: '1rem', cursor: 'pointer', marginLeft: '1rem' }}
        >
          Carers
        </button>
      </div>
    </div>
  );
}