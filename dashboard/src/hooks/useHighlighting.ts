import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface HighlightConfig {
  highlightedId: string | null;
  highlightType: string | null;
  autoFilters: Record<string, string>;
  searchTerm: string | null;
}

export function useHighlighting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);

  const config: HighlightConfig = useMemo(() => ({
    highlightedId: searchParams.get('highlight'),
    highlightType: searchParams.get('highlightType'),
    searchTerm: searchParams.get('search'),
    autoFilters: {
      status: searchParams.get('status') || '',
      pipelineStage: searchParams.get('pipelineStage') || '',
      ssh: searchParams.get('ssh') || '',
    }
  }), [searchParams]);

  // Apply highlighting effect when URL params change
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    const highlightParam = searchParams.get('highlight');
    
    if (highlightId) {
      setHighlightedId(highlightId);
      setIsHighlighting(true);

      // Scroll to the highlighted element after a brief delay
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-row-id="${highlightId}"]`);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 500);

      // Remove highlighting after 3 seconds
      const clearTimer = setTimeout(() => {
        setIsHighlighting(false);
        // Keep the ID but remove the visual effect
        setTimeout(() => {
          setHighlightedId(null);
          // Clean up URL params
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('highlight');
          newParams.delete('highlightType');
          if (!newParams.get('search')) {
            newParams.delete('search');
          }
          setSearchParams(newParams, { replace: true });
        }, 300);
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [searchParams, setSearchParams]);

  const isRowHighlighted = (id: string | number) => {
    return highlightedId === id.toString() && isHighlighting;
  };

  const getRowClassName = (id: string | number, baseClassName: string = '') => {
    const highlighted = isRowHighlighted(id);
    return `${baseClassName} ${
      highlighted 
        ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 transition-all duration-300 animate-pulse' 
        : ''
    }`.trim();
  };

  const clearHighlighting = () => {
    setHighlightedId(null);
    setIsHighlighting(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('highlight');
    newParams.delete('highlightType');
    setSearchParams(newParams, { replace: true });
  };

  return {
    config,
    isRowHighlighted,
    getRowClassName,
    clearHighlighting,
    highlightedId,
    isHighlighting
  };
} 