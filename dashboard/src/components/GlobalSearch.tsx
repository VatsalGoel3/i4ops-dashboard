import { useRef, useEffect, useState } from 'react';
import { Search, X, Server, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { useDebounce } from '../hooks/useDebounce';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { 
    query, 
    setQuery, 
    results, 
    isSearching, 
    clearSearch,
    setSearchInputRef 
  } = useSearch();
  
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    setSearchInputRef(inputRef);
  }, [setSearchInputRef]);

  useEffect(() => {
    setShowResults(isSearching && results.length > 0);
    setSelectedIndex(-1);
  }, [isSearching, results.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search shortcut: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Navigate results with arrow keys
      if (showResults && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        setSelectedIndex(prev => {
          const newIndex = prev + direction;
          if (newIndex >= results.length) return 0;
          if (newIndex < 0) return results.length - 1;
          return newIndex;
        });
      }

      // Select result with Enter
      if (showResults && e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }

      // Close results with Escape
      if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, selectedIndex, results]);

  const handleResultClick = (result: any) => {
    setShowResults(false);
    clearSearch();
    
    if (result.type === 'host') {
      navigate('/hosts');
      // Note: In a real implementation, you'd also highlight/scroll to the specific host
    } else if (result.type === 'vm') {
      navigate('/vms');
      // Note: In a real implementation, you'd also highlight/scroll to the specific VM
    }
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search hosts, VMs... (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)} // Delay to allow clicks
          className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-80 overflow-y-auto z-50"
        >
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {result.type === 'host' ? (
                  <Server className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Monitor className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {result.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {result.subtitle}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                  {result.type}
                </span>
              </div>
            </button>
          ))}
          
          {results.length === 10 && (
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
              Showing top 10 results. Be more specific to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
} 