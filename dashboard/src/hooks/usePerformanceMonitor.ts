import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  domNodeCount: number;
  isVirtual: boolean;
  timestamp: number;
}

interface PerformanceStats {
  averageRenderTime: number;
  peakMemoryUsage: number;
  avgDomNodes: number;
  lastMetrics: PerformanceMetrics | null;
  improvements: {
    renderTimeImprovement: number; // % faster than non-virtual
    memoryImprovement: number; // % less memory than non-virtual
  };
}

export function usePerformanceMonitor(isVirtual: boolean = false) {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const renderStartTime = useRef<number>(0);

  // Start timing on render
  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  // Measure after render completes
  useEffect(() => {
    const measurePerformance = () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Get memory info (if available)
      let memoryUsage = 0;
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // MB
      }

      // Count DOM nodes (expensive, so throttle this)
      const domNodeCount = document.querySelectorAll('*').length;

      const newMetric: PerformanceMetrics = {
        renderTime,
        memoryUsage,
        domNodeCount,
        isVirtual,
        timestamp: Date.now()
      };

      setMetrics(prev => {
        const updated = [...prev, newMetric];
        // Keep last 100 measurements
        return updated.slice(-100);
      });
    };

    // Use RAF to measure after paint
    const rafId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(rafId);
  });

  // Calculate performance stats
  const stats: PerformanceStats = {
    averageRenderTime: 0,
    peakMemoryUsage: 0,
    avgDomNodes: 0,
    lastMetrics: null,
    improvements: {
      renderTimeImprovement: 0,
      memoryImprovement: 0
    }
  };

  if (metrics.length > 0) {
    const virtualMetrics = metrics.filter(m => m.isVirtual);
    const nonVirtualMetrics = metrics.filter(m => !m.isVirtual);
    
    stats.lastMetrics = metrics[metrics.length - 1];
    stats.averageRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
    stats.peakMemoryUsage = Math.max(...metrics.map(m => m.memoryUsage));
    stats.avgDomNodes = metrics.reduce((sum, m) => sum + m.domNodeCount, 0) / metrics.length;

    // Calculate improvements if we have both virtual and non-virtual data
    if (virtualMetrics.length > 0 && nonVirtualMetrics.length > 0) {
      const avgVirtualRender = virtualMetrics.reduce((sum, m) => sum + m.renderTime, 0) / virtualMetrics.length;
      const avgNonVirtualRender = nonVirtualMetrics.reduce((sum, m) => sum + m.renderTime, 0) / nonVirtualMetrics.length;
      
      const avgVirtualMemory = virtualMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / virtualMetrics.length;
      const avgNonVirtualMemory = nonVirtualMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / nonVirtualMetrics.length;

      stats.improvements.renderTimeImprovement = ((avgNonVirtualRender - avgVirtualRender) / avgNonVirtualRender) * 100;
      stats.improvements.memoryImprovement = ((avgNonVirtualMemory - avgVirtualMemory) / avgNonVirtualMemory) * 100;
    }
  }

  return {
    metrics,
    stats,
    isMonitoring: true
  };
}

// Hook for component-level performance tracking
export function useComponentPerformance(componentName: string) {
  const startTime = useRef<number>(performance.now());
  const [renderCount, setRenderCount] = useState(0);
  const [totalRenderTime, setTotalRenderTime] = useState(0);

  useEffect(() => {
    const renderTime = performance.now() - startTime.current;
    setRenderCount(prev => prev + 1);
    setTotalRenderTime(prev => prev + renderTime);
    startTime.current = performance.now();
  });

  return {
    componentName,
    renderCount,
    averageRenderTime: renderCount > 0 ? totalRenderTime / renderCount : 0,
    lastRenderTime: performance.now() - startTime.current
  };
}

// Hook for table-specific performance metrics
export function useTablePerformance(itemCount: number, isVirtual: boolean) {
  const [metrics, setMetrics] = useState({
    itemsPerSecond: 0,
    memoryPerItem: 0,
    domNodesPerItem: 0,
    scrollPerformance: 0
  });

  useEffect(() => {
    const measureTablePerformance = () => {
      const start = performance.now();
      
      // Simulate scroll performance test
      let scrollTime = 0;
      if (itemCount > 100) {
        const scrollStart = performance.now();
        // This would ideally be done on actual scroll events
        scrollTime = performance.now() - scrollStart;
      }

      const domNodes = document.querySelectorAll('table tr, [data-virtual-row]').length;
      let memory = 0;
      if ('memory' in performance) {
        memory = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      }

      setMetrics({
        itemsPerSecond: itemCount / ((performance.now() - start) / 1000),
        memoryPerItem: itemCount > 0 ? memory / itemCount : 0,
        domNodesPerItem: itemCount > 0 ? domNodes / itemCount : 0,
        scrollPerformance: scrollTime
      });
    };

    const timeoutId = setTimeout(measureTablePerformance, 100);
    return () => clearTimeout(timeoutId);
  }, [itemCount, isVirtual]);

  return metrics;
} 