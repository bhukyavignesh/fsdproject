import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { formatMoney } from '../utils/format';

const STRINGS = {
  en: { bookings: 'My Bookings', operator: 'Operator Portal', login: 'Log in', offers: 'Offers', help: 'Help' },
  hi: { bookings: 'मेरी बुकिंग', operator: 'ऑपरेटर पोर्टल', login: 'लॉग इन', offers: 'ऑफ़र', help: 'सहायता' },
};

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('obrs.currency') || 'INR');
  const [language, setLanguage] = useState(() => localStorage.getItem('obrs.lang') || 'en');

  const update = useCallback((key, setter) => (value) => {
    localStorage.setItem(key, value);
    setter(value);
  }, []);

  const value = useMemo(() => ({
    currency,
    language,
    setCurrency: update('obrs.currency', setCurrency),
    setLanguage: update('obrs.lang', setLanguage),
    money: (inr) => formatMoney(inr, currency),
    t: (key) => STRINGS[language]?.[key] ?? STRINGS.en[key] ?? key,
  }), [currency, language, update]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
};
