import { useEffect, useState } from 'react';
import { transactionsApi } from '../api/client';

type Transaction = {
  id: string;
  merchantId: string;
  amount: string;
  method: string;
  status: string;
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState({ merchantId: '', amount: '', method: 'UPI' });
  const [error, setError] = useState('');

  const load = () =>
    transactionsApi.list().then(setTransactions).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transactionsApi.create({ ...form, amount: Number(form.amount) });
      setForm({ merchantId: '', amount: '', method: 'UPI' });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section>
      <h2>Transactions</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Merchant ID"
          value={form.merchantId}
          onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
          required
        />
        <input
          placeholder="Amount"
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          <option>UPI</option>
          <option>CARD</option>
          <option>QR</option>
          <option>SMS_LINK</option>
        </select>
        <button type="submit">Record transaction</button>
      </form>
      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">Merchant</th>
            <th align="left">Amount</th>
            <th align="left">Method</th>
            <th align="left">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.merchantId}</td>
              <td>{t.amount}</td>
              <td>{t.method}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
