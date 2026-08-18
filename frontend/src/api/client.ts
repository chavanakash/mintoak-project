// These env vars must point at the *resource* path, not just the host, since
// the ingress prefix ("/api/merchants") and the compose direct-service path
// ("http://host:3001/merchants") differ in shape but both resolve to the
// same NestJS @Controller('merchants') route once rewritten.
const MERCHANTS_URL = import.meta.env.VITE_MERCHANT_API || '/api/merchants';
const TRANSACTIONS_URL = import.meta.env.VITE_TRANSACTION_API || '/api/transactions';

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json();
}

export const merchantsApi = {
  list: () => request(MERCHANTS_URL),
  create: (data: unknown) =>
    request(MERCHANTS_URL, { method: 'POST', body: JSON.stringify(data) }),
};

export const transactionsApi = {
  list: () => request(TRANSACTIONS_URL),
  create: (data: unknown) =>
    request(TRANSACTIONS_URL, { method: 'POST', body: JSON.stringify(data) }),
};
