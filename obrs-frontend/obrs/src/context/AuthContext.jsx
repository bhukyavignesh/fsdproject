import { createContext, useContext, useMemo } from 'react';
import { usePersistentReducer } from '../hooks/usePersistentReducer';

const AuthContext = createContext(null);

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { user: action.user };
    case 'LOGOUT':
      return { user: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = usePersistentReducer(authReducer, { user: null }, 'obrs.auth');

  const value = useMemo(() => ({
    user: state.user,
    isAuthenticated: Boolean(state.user),
    isOperator: state.user?.role === 'operator',
    // Replace with real token-based auth (e.g. POST /auth/login -> JWT in httpOnly cookie).
    login: ({ name, email, role = 'traveller' }) => dispatch({
      type: 'LOGIN',
      user: { id: email, name, email, role, initials: name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() },
    }),
    logout: () => dispatch({ type: 'LOGOUT' }),
  }), [state.user, dispatch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
