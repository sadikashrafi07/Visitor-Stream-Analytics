import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { FilterState } from '@/lib/types';

const defaultFilters: FilterState = {
  dateRange: { from: null, to: null },
  country: null,
  deviceType: null,
  browser: null,
  os: null,
  referrer: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  bounceFilter: 'all',
  hasConversion: 'all',
  section: null,
  eventType: null,
};

interface FilterContextType {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const activeFilterCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'dateRange') return (val as FilterState['dateRange']).from !== null;
    if (key === 'bounceFilter') return val !== 'all';
    if (key === 'hasConversion') return val !== 'all';
    return val !== null;
  }).length;

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, activeFilterCount }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
