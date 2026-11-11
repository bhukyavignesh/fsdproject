import { useState } from 'react';
import { Tag, CheckCircle2, X } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { usePreferences } from '../../context/PreferencesContext';
import Spinner from '../ui/Spinner';

export default function PromoCode() {
  const { promo, applyPromo, removePromo } = useBooking();
  const { money } = usePreferences();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus({ loading: true, error: '' });
    const res = await applyPromo(code);
    setStatus({ loading: false, error: res.valid ? '' : res.message });
    if (res.valid) setCode('');
  };

  if (promo) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-bold text-emerald-800">{promo.code} applied · you save {money(promo.discount)}</p>
          <p className="text-xs text-emerald-700">{promo.message}</p>
        </div>
        <button type="button" onClick={removePromo} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Remove promo code"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="promo" className="label">Promo code</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
          <input id="promo" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus({ loading: false, error: '' }); }} placeholder="e.g. SAVE10" className="input !pl-9 font-semibold uppercase tracking-wider" aria-invalid={Boolean(status.error)} aria-describedby="promo-help" />
        </div>
        <button type="submit" className="btn-secondary" disabled={status.loading || !code.trim()}>
          {status.loading ? <Spinner /> : 'Apply'}
        </button>
      </div>
      <p id="promo-help" role={status.error ? 'alert' : undefined} className={`mt-1.5 text-xs ${status.error ? 'text-red-600' : 'text-ink-500'}`}>
        {status.error || 'Try FIRST100, SAVE10 or WEEKEND15'}
      </p>
    </form>
  );
}
