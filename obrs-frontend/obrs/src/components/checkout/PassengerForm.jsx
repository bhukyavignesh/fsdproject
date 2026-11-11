import { BedDouble, Armchair } from 'lucide-react';
import { SEAT_STATUS } from '../../data/constants';
import { cx } from '../../utils/format';

const GENDERS = ['Male', 'Female', 'Other'];

/** One passenger card per seat. Female-reserved seats lock gender to Female. */
export default function PassengerForm({ index, seat, value, errors = {}, onChange }) {
  const femaleOnly = seat.status === SEAT_STATUS.FEMALE;
  const idp = `p${index}`;
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold">
        Passenger {index + 1}
        <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs', femaleOnly ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700')}>
          {seat.type === 'sleeper' ? <BedDouble className="h-3 w-3" aria-hidden /> : <Armchair className="h-3 w-3" aria-hidden />}
          Seat {seat.label}{femaleOnly && ' · Female only'}
        </span>
      </legend>

      <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
        <div>
          <label htmlFor={`${idp}-name`} className="label">Full name</label>
          <input id={`${idp}-name`} name={`${idp}-name`} autoComplete={index === 0 ? 'name' : 'off'} className="input" value={value.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${idp}-name-err` : undefined} placeholder="As on ID proof" />
          {errors.name && <p id={`${idp}-name-err`} className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${idp}-age`} className="label">Age</label>
          <input id={`${idp}-age`} name={`${idp}-age`} type="number" inputMode="numeric" min="1" max="120" className="input" value={value.age} onChange={(e) => set({ age: e.target.value })} aria-invalid={Boolean(errors.age)} aria-describedby={errors.age ? `${idp}-age-err` : undefined} />
          {errors.age && <p id={`${idp}-age-err`} className="mt-1 text-xs text-red-600">{errors.age}</p>}
        </div>
      </div>

      <div className="mt-3">
        <span className="label" id={`${idp}-gender`}>Gender</span>
        <div role="radiogroup" aria-labelledby={`${idp}-gender`} className="flex gap-2">
          {GENDERS.map((g) => {
            const disabled = femaleOnly && g !== 'Female';
            const checked = value.gender === g;
            return (
              <label key={g} className={cx('chip cursor-pointer !px-4 !py-2 text-sm', checked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-700', disabled && 'cursor-not-allowed opacity-40')}>
                <input type="radio" className="sr-only" name={`${idp}-gender`} value={g} checked={checked} disabled={disabled} onChange={() => set({ gender: g })} />
                {g}
              </label>
            );
          })}
        </div>
        {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender}</p>}
      </div>
    </fieldset>
  );
}
