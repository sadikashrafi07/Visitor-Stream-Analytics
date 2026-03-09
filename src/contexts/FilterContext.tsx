import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { FilterState } from '@/lib/types';

export const defaultFilters: FilterState = {
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
  setFilter: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

function createDefaultFilters(): FilterState {
  return {
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
}

function getActiveFilterCount(filters: FilterState): number {
  let count = 0;

  if (filters.dateRange.from !== null || filters.dateRange.to !== null) {
    count += 1;
  }

  if (filters.country !== null) count += 1;
  if (filters.deviceType !== null) count += 1;
  if (filters.browser !== null) count += 1;
  if (filters.os !== null) count += 1;
  if (filters.referrer !== null) count += 1;
  if (filters.utmSource !== null) count += 1;
  if (filters.utmMedium !== null) count += 1;
  if (filters.utmCampaign !== null) count += 1;
  if (filters.bounceFilter !== 'all') count += 1;
  if (filters.hasConversion !== 'all') count += 1;
  if (filters.section !== null) count += 1;
  if (filters.eventType !== null) count += 1;

  return count;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(() => createDefaultFilters());

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const value = useMemo<FilterContextType>(
    () => ({
      filters,
      setFilter,
      resetFilters,
      activeFilterCount,
    }),
    [filters, setFilter, resetFilters, activeFilterCount]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const context = useContext(FilterContext);

  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }

  return context;
}