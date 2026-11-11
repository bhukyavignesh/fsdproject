import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cx } from '../utils/format';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [role, setRole] = useState(state?.role ?? 'traveller');
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter your name and a valid email.');
    login({ ...form, role });
    navigate(state?.from?.pathname ?? (role === 'operator' ? '/operator' : '/dashboard'), { replace: true });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-500">{state?.denied ? 'That page needs an operator account.' : 'Log in to manage bookings and travel faster.'}</p>

        <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {[['traveller', 'Traveller', UserRound], ['operator', 'Bus operator', Building2]].map(([id, label, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={role === id} onClick={() => setRole(id)} className={cx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold', role === id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200')}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="login-name" className="label">Full name</label>
            <input id="login-name" autoComplete="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input id="login-email" type="email" autoComplete="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full !py-3">Continue</button>
          <p className="text-center text-xs text-ink-500">Demo login — any name and email will work.</p>
        </form>
      </div>
    </div>
  );
}
