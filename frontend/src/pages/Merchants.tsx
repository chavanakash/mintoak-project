import { useEffect, useState } from 'react';
import { merchantsApi } from '../api/client';

type Merchant = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  kycStatus: string;
};

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '' });
  const [error, setError] = useState('');

  const load = () => merchantsApi.list().then(setMerchants).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await merchantsApi.create(form);
      setForm({ businessName: '', ownerName: '', phone: '' });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section>
      <h2>Merchants</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Business name"
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          required
        />
        <input
          placeholder="Owner name"
          value={form.ownerName}
          onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          required
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <button type="submit">Onboard merchant</button>
      </form>
      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">Business</th>
            <th align="left">Owner</th>
            <th align="left">Phone</th>
            <th align="left">KYC</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((m) => (
            <tr key={m.id}>
              <td>{m.businessName}</td>
              <td>{m.ownerName}</td>
              <td>{m.phone}</td>
              <td>{m.kycStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
