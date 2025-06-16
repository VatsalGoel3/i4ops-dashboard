import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
  } from 'react';
  
  type UIContextType = {
    darkMode: boolean;
    toggleDarkMode: () => void;
    pageSize: number;
    setPageSize: (size: number) => void;
  };
  
  const UIContext = createContext<UIContextType | null>(null);
  
  export function UIProvider({ children }: { children: ReactNode }) {
    const [darkMode, setDarkMode] = useState<boolean>(() => {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dark-mode');
        return stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    });
  
    const [pageSize, setPageSizeState] = useState<number>(() => {
      const stored = localStorage.getItem('ui-page-size');
      return stored ? parseInt(stored, 10) : 15;
    });
  
    const toggleDarkMode = () => setDarkMode(prev => !prev);
  
    const setPageSize = (size: number) => {
      setPageSizeState(size);
      localStorage.setItem('ui-page-size', size.toString());
    };
  
    useEffect(() => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('dark-mode', darkMode.toString());
    }, [darkMode]);
  
    return (
      <UIContext.Provider value={{ darkMode, toggleDarkMode, pageSize, setPageSize }}>
        {children}
      </UIContext.Provider>
    );
  }
  
  export function useUI() {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within a UIProvider');
    return ctx;
  }  