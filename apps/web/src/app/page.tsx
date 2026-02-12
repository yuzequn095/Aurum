export default async function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${apiBase}/v1/health`, { cache: 'no-store' });
  const data = await res.json();

  return (
    <main style={{ padding: 24 }}>
      <h1>Aurum</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
