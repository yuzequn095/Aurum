import Link from 'next/link';

export default async function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${apiBase}/v1/health`, { cache: 'no-store' });
  const data = await res.json();

  return (
    <main style={{ padding: 24 }}>
      <h1>Aurum</h1>
      <p>
        <Link
          href='/dashboard'
          className='inline-flex rounded-aurum border border-aurum-primaryHover bg-aurum-primary px-3 py-2 text-sm font-medium text-black shadow-aurumSm hover:bg-aurum-primaryHover'
        >
          Open Dashboard
        </Link>
      </p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
