import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { Host, VM } from '../api/types';

interface SearchResult {
  type: 'host' | 'vm';
  id: number;
  title: string;
  subtitle: string;
  data: Host | VM;
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  clearSearch: () => void;
  focusSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement> | null;
  setSearchInputRef: (ref: React.RefObject<HTMLInputElement>) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ 
  children, 
  hosts = [], 
  vms = [] 
}: { 
  children: ReactNode;
  hosts?: Host[];
  vms?: VM[];
}) {
  const [query, setQuery] = useState('');
  const [searchInputRef, setSearchInputRef] = useState<React.RefObject<HTMLInputElement> | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search hosts
    hosts.forEach(host => {
      const matches = [
        host.name.toLowerCase().includes(searchTerm),
        host.ip.toLowerCase().includes(searchTerm),
        host.os.toLowerCase().includes(searchTerm),
        host.assignedTo?.toLowerCase().includes(searchTerm),
        host.pipelineStage.toLowerCase().includes(searchTerm),
        host.notes?.toLowerCase().includes(searchTerm),
      ].some(Boolean);

      if (matches) {
        results.push({
          type: 'host',
          id: host.id,
          title: host.name,
          subtitle: `${host.ip} • ${host.os} • ${host.status}`,
          data: host,
        });
      }
    });

    // Search VMs
    vms.forEach(vm => {
      const matches = [
        vm.name.toLowerCase().includes(searchTerm),
        vm.ip.toLowerCase().includes(searchTerm),
        vm.machineId.toLowerCase().includes(searchTerm),
        vm.os?.toLowerCase().includes(searchTerm),
        vm.host?.name.toLowerCase().includes(searchTerm),
      ].some(Boolean);

      if (matches) {
        results.push({
          type: 'vm',
          id: vm.id,
          title: vm.name,
          subtitle: `${vm.ip} • Host: ${vm.host?.name || 'Unknown'} • ${vm.status}`,
          data: vm,
        });
      }
    });

    return results.slice(0, 10); // Limit results
  }, [query, hosts, vms]);

  const isSearching = query.length > 0;

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const focusSearch = useCallback(() => {
    searchInputRef?.current?.focus();
  }, [searchInputRef]);

  return (
    <SearchContext.Provider value={{
      query,
      setQuery,
      results,
      isSearching,
      clearSearch,
      focusSearch,
      searchInputRef,
      setSearchInputRef,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
} 