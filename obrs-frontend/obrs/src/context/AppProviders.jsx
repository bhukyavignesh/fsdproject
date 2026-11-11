import { PreferencesProvider } from './PreferencesContext';
import { AuthProvider } from './AuthContext';
import { SearchProvider } from './SearchContext';
import { BookingProvider } from './BookingContext';
import { ToastProvider } from '../components/ui/Toast';

export default function AppProviders({ children }) {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <SearchProvider>
          <BookingProvider>
            <ToastProvider>{children}</ToastProvider>
          </BookingProvider>
        </SearchProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}
