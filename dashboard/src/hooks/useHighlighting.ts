import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface HighlightConfig {
  highlightedId: string | null;
  highlightType: string | null;
  autoFilters: Record<string, string>;
  searchTerm: string | null;
}

export function useHighlighting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightConfig, setHighlightConfig] = useState<HighlightConfig>({
    highlightedId: null,
    highlightType: null,
    autoFilters: {},
    searchTerm: null,
  });

  useEffect(() => {
    const highlightedId = searchParams.get('highlight');
    const highlightType = searchParams.get('highlightType');
    const searchTerm = searchParams.get('search');

    // Extract auto-filters from URL params
    const autoFilters: Record<string, string> = {};
    const filterKeys = ['status', 'pipelineStage', 'os', 'ssh'];
    filterKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) autoFilters[key] = value;
    });

    setHighlightConfig({
      highlightedId,
      highlightType,
      autoFilters,
      searchTerm,
    });
  }, [searchParams]);

  const isRowHighlighted = (id: string | number) => {
    return highlightConfig.highlightedId === id.toString();
  };

  const getRowClassName = (id: string | number, baseClassName: string = '') => {
    const isHighlighted = isRowHighlighted(id);
    
    if (isHighlighted) {
      return `${baseClassName} bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500`;
    }
    
    return baseClassName;
  };

  const clearHighlighting = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('highlight');
    newParams.delete('highlightType');
    setSearchParams(newParams);
  };

  const setHighlighting = (id: string | number, type?: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('highlight', id.toString());
    if (type) {
      newParams.set('highlightType', type);
    }
    setSearchParams(newParams);
  };

  const isExpiredAssignmentHighlighted = () => {
    return highlightConfig.highlightedId === 'expired-assignments';
  };

  const getExpiredAssignmentRowClassName = (host: any, baseClassName: string = '') => {
    if (!isExpiredAssignmentHighlighted()) return baseClassName;
    
    // Check if this host has an expired assignment
    if (host.assignedUntil && host.assignedTo) {
      const isExpired = new Date(host.assignedUntil) < new Date();
      if (isExpired) {
        return `${baseClassName} bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500`;
      }
    }
    
    return baseClassName;
  };

  return {
    ...highlightConfig,
    isRowHighlighted,
    getRowClassName,
    clearHighlighting,
    setHighlighting,
    isExpiredAssignmentHighlighted,
    getExpiredAssignmentRowClassName,
  };
} 