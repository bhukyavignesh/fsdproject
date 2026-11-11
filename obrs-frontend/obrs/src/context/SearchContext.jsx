import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { todayISO } from '../utils/format';

export const DEFAULT_FILTERS = {
  ac: false,
  nonAc: false,
  sleeper: false,
  seater: false,
  departureSlots: [],
  price: [0, 5000],
  amenities: [],
  operators: [],
  boardingPoints: [],
  droppingPoints: [],
  minRating: 0,
};

const initialState = {
  query: { from: 'Bengaluru', to: 'Chennai', date: todayISO(1), returnDate: '' },
  filters: DEFAULT_FILTERS,
  sort: 'departure',
};

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: { ...state.query, ...action.query }, filters: DEFAULT_FILTERS };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'TOGGLE_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: toggleIn(state.filters[action.key], action.value) } };
    case 'RESET_FILTERS':
      return { ...state, filters: { ...DEFAULT_FILTERS, price: action.price ?? DEFAULT_FILTERS.price } };
    case 'SET_SORT':
      return { ...state, sort: action.sort };
    default:
      return state;
  }
}

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const setQuery = useCallback((query) => dispatch({ type: 'SET_QUERY', query }), []);
  const setFilter = useCallback((key, value) => dispatch({ type: 'SET_FILTER', key, value }), []);
  const toggleFilter = useCallback((key, value) => dispatch({ type: 'TOGGLE_FILTER', key, value }), []);
  const resetFilters = useCallback((price) => dispatch({ type: 'RESET_FILTERS', price }), []);
  const setSort = useCallback((sort) => dispatch({ type: 'SET_SORT', sort }), []);

  const value = useMemo(() => ({
    ...state, setQuery, setFilter, toggleFilter, resetFilters, setSort,
  }), [state, setQuery, setFilter, toggleFilter, resetFilters, setSort]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
};
