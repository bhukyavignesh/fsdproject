import { ChevronDown, CreditCard, Landmark, QrCode, Smartphone, Wallet, Lock } from 'lucide-react';
import { cx } from '../../utils/format';

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / QR', hint: 'GPay, PhonePe, Paytm, BHIM', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', hint: 'Visa, Mastercard, RuPay, Amex', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major Indian banks', icon: Landmark },
  { id: 'wallet', label: 'Digital Wallets', hint: 'Paytm, Amazon Pay, Mobikwik', icon: Wallet },
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'Bank of Baroda'];
const WALLETS = ['Paytm Wallet', 'Amazon Pay', 'Mobikwik', 'Freecharge'];

export const initialPayment = {
  method: 'upi',
  upi: { mode: 'id', id: '' },
  card: { number: '', expiry: '', cvv: '', name: '' },
  netbanking: { bank: '' },
  wallet: { provider: '' },
};

function luhn(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function validatePayment(p) {
  const e = {};
  if (p.method === 'upi' && p.upi.mode === 'id' && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(p.upi.id)) e.upiId = 'Enter a valid UPI ID, e.g. name@okhdfc';
  if (p.method === 'card') {
    const digits = p.card.number.replace(/\s/g, '');
    if (!/^\d{15,16}$/.test(digits) || !luhn(digits)) e.cardNumber = 'Enter a valid card number';
    const [mm, yy] = p.card.expiry.split('/').map(Number);
    const now = new Date();
    const exp = mm && yy ? new Date(2000 + yy, mm, 0) : null;
    if (!exp || mm > 12 || exp < now) e.cardExpiry = 'Invalid expiry';
    if (!/^\d{3,4}$/.test(p.card.cvv)) e.cardCvv = 'Invalid CVV';
    if (p.card.name.trim().length < 2) e.cardName = 'Enter name on card';
  }
  if (p.method === 'netbanking' && !p.netbanking.bank) e.bank = 'Choose your bank';
  if (p.method === 'wallet' && !p.wallet.provider) e.wallet = 'Choose a wallet';
  return e;
}

const Err = ({ id, msg }) => (msg ? <p id={id} className="mt-1 text-xs text-red-600">{msg}</p> : null);

function UpiPanel({ value, errors, onChange }) {
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm" role="tablist" aria-label="UPI mode">
        {[['id', 'Enter UPI ID'], ['qr', 'Scan QR']].map(([m, l]) => (
          <button key={m} type="button" role="tab" aria-selected={value.mode === m} onClick={() => onChange({ ...value, mode: m })} className={cx('rounded-lg px-3 py-1.5 font-semibold', value.mode === m ? 'bg-white shadow-sm' : 'text-ink-500')}>{l}</button>
        ))}
      </div>
      {value.mode === 'id' ? (
        <div>
          <label htmlFor="upi-id" className="label">UPI ID</label>
          <input id="upi-id" className="input" placeholder="yourname@okaxis" value={value.id} onChange={(e) => onChange({ ...value, id: e.target.value.trim() })} aria-invalid={Boolean(errors.upiId)} aria-describedby="upi-id-err" />
          <Err id="upi-id-err" msg={errors.upiId} />
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4">
          <div className="grid h-24 w-24 place-items-center rounded-lg bg-slate-100"><QrCode className="h-14 w-14 text-ink-700" aria-hidden /></div>
          <p className="text-sm text-ink-500">A dynamic QR will be generated when you click <strong>Pay</strong>. Scan it with any UPI app within 5 minutes.</p>
        </div>
      )}
    </div>
  );
}

function CardPanel({ value, errors, onChange }) {
  const fmtNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  const fmtExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="cc-number" className="label">Card number</label>
        <input id="cc-number" autoComplete="cc-number" inputMode="numeric" className="input font-mono tracking-wider" placeholder="4111 1111 1111 1111" value={value.number} onChange={(e) => onChange({ ...value, number: fmtNumber(e.target.value) })} aria-invalid={Boolean(errors.cardNumber)} aria-describedby="cc-number-err" />
        <Err id="cc-number-err" msg={errors.cardNumber} />
      </div>
      <div>
        <label htmlFor="cc-exp" className="label">Expiry (MM/YY)</label>
        <input id="cc-exp" autoComplete="cc-exp" inputMode="numeric" className="input font-mono" placeholder="08/29" value={value.expiry} onChange={(e) => onChange({ ...value, expiry: fmtExpiry(e.target.value) })} aria-invalid={Boolean(errors.cardExpiry)} aria-describedby="cc-exp-err" />
        <Err id="cc-exp-err" msg={errors.cardExpiry} />
      </div>
      <div>
        <label htmlFor="cc-cvv" className="label">CVV</label>
        <input id="cc-cvv" autoComplete="cc-csc" type="password" inputMode="numeric" maxLength={4} className="input font-mono" placeholder="•••" value={value.cvv} onChange={(e) => onChange({ ...value, cvv: e.target.value.replace(/\D/g, '') })} aria-invalid={Boolean(errors.cardCvv)} aria-describedby="cc-cvv-err" />
        <Err id="cc-cvv-err" msg={errors.cardCvv} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="cc-name" className="label">Name on card</label>
        <input id="cc-name" autoComplete="cc-name" className="input" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} aria-invalid={Boolean(errors.cardName)} aria-describedby="cc-name-err" />
        <Err id="cc-name-err" msg={errors.cardName} />
      </div>
    </div>
  );
}

function OptionGrid({ name, options, value, onChange, error }) {
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {options.map((o) => (
          <label key={o} className={cx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium', value === o ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300')}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="accent-brand-600" />
            {o}
          </label>
        ))}
      </div>
      <Err msg={error} />
    </div>
  );
}

export default function PaymentAccordion({ value, errors, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v });

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
      {PAYMENT_METHODS.map(({ id, label, hint, icon: Icon }) => {
        const open = value.method === id;
        return (
          <div key={id} className={cx(open && 'bg-slate-50/60')}>
            <h3>
              <button type="button" id={`pay-${id}-btn`} aria-expanded={open} aria-controls={`pay-${id}`} onClick={() => set('method', id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className={cx('grid h-5 w-5 place-items-center rounded-full border-2', open ? 'border-brand-600' : 'border-slate-300')}>
                  {open && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                </span>
                <Icon className="h-5 w-5 text-ink-700" aria-hidden />
                <span className="flex-1">
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="block text-xs text-ink-500">{hint}</span>
                </span>
                <ChevronDown className={cx('h-4 w-4 text-ink-500 transition', open && 'rotate-180')} aria-hidden />
              </button>
            </h3>
            {open && (
              <div id={`pay-${id}`} role="region" aria-labelledby={`pay-${id}-btn`} className="animate-fade-up px-4 pb-4">
                {id === 'upi' && <UpiPanel value={value.upi} errors={errors} onChange={(v) => set('upi', v)} />}
                {id === 'card' && <CardPanel value={value.card} errors={errors} onChange={(v) => set('card', v)} />}
                {id === 'netbanking' && <OptionGrid name="bank" options={BANKS} value={value.netbanking.bank} error={errors.bank} onChange={(bank) => set('netbanking', { bank })} />}
                {id === 'wallet' && <OptionGrid name="wallet" options={WALLETS} value={value.wallet.provider} error={errors.wallet} onChange={(provider) => set('wallet', { provider })} />}
              </div>
            )}
          </div>
        );
      })}
      <p className="flex items-center gap-1.5 bg-white px-4 py-2.5 text-xs text-ink-500"><Lock className="h-3.5 w-3.5" aria-hidden /> 256-bit encrypted. We never store your card details.</p>
    </div>
  );
}
