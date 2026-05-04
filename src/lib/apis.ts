const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('Falta NEXT_PUBLIC_API_URL en .env.local');
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Error consultando ${path}`);
  }

  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Error ejecutando ${path}`);
  }

  return res.json();
}