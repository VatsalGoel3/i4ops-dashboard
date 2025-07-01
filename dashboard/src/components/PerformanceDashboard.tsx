import { useState } from 'react';
import { Activity, Clock, HardDrive, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { usePerformanceMonitor, useTablePerformance } from '../hooks/usePerformanceMonitor';

interface Props {
  isVirtual: boolean;
  itemCount: number;
  isVisible?: boolean;
  onClose?: () => void;
}

export default function PerformanceDashboard({ 
  isVirtual, 
  itemCount, 
  isVisible = false,
  onClose 
}: Props) {
  const { stats } = usePerformanceMonitor(isVirtual);
  const tableMetrics = useTablePerformance(itemCount, isVirtual);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible && !isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-black/80 text-white px-3 py-2 rounded-lg text-xs hover:bg-black/90 transition-colors"
        >
          Performance
        </button>
      </div>
    );
  }

  const formatMs = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatMB = (mb: number) => `${mb.toFixed(1)}MB`;
  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Performance Metrics
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Minimize"
          >
            −
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Current Mode Indicator */}
      <div className={`mb-3 p-2 rounded-lg text-xs ${
        isVirtual 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }`}>
        <div className="flex items-center gap-1">
          {isVirtual ? <Zap size={12} /> : <Activity size={12} />}
          <span className="font-medium">
            {isVirtual ? 'Virtual Table Active' : 'Legacy Table'}
          </span>
        </div>
        <div className="text-xs opacity-75 mt-1">
          Rendering {itemCount} items
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Render Time</span>
          </div>
          <span className="text-xs font-mono">
            {formatMs(stats.averageRenderTime)}
          </span>
        </div>

                 <div className="flex items-center justify-between">
           <div className="flex items-center gap-1">
             <HardDrive size={12} className="text-purple-500" />
             <span className="text-xs text-gray-600 dark:text-gray-400">Memory</span>
           </div>
          <span className="text-xs font-mono">
            {formatMB(stats.peakMemoryUsage)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Activity size={12} className="text-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">DOM Nodes</span>
          </div>
          <span className="text-xs font-mono">
            {Math.round(stats.avgDomNodes)}
          </span>
        </div>
      </div>

      {/* Performance Improvements */}
      {(stats.improvements.renderTimeImprovement !== 0 || stats.improvements.memoryImprovement !== 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Virtual Table Improvements:
          </div>
          
          {stats.improvements.renderTimeImprovement !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs">Render Speed</span>
              <div className="flex items-center gap-1">
                {stats.improvements.renderTimeImprovement > 0 ? (
                  <TrendingUp size={10} className="text-green-500" />
                ) : (
                  <TrendingDown size={10} className="text-red-500" />
                )}
                <span className={`text-xs font-mono ${
                  stats.improvements.renderTimeImprovement > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercent(stats.improvements.renderTimeImprovement)}
                </span>
              </div>
            </div>
          )}

          {stats.improvements.memoryImprovement !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs">Memory Usage</span>
              <div className="flex items-center gap-1">
                {stats.improvements.memoryImprovement > 0 ? (
                  <TrendingUp size={10} className="text-green-500" />
                ) : (
                  <TrendingDown size={10} className="text-red-500" />
                )}
                <span className={`text-xs font-mono ${
                  stats.improvements.memoryImprovement > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercent(stats.improvements.memoryImprovement)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table-specific Metrics */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Table Performance:
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs">Items/Second</span>
          <span className="text-xs font-mono">
            {Math.round(tableMetrics.itemsPerSecond)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs">Memory/Item</span>
          <span className="text-xs font-mono">
            {(tableMetrics.memoryPerItem * 1000).toFixed(1)}KB
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs">DOM/Item</span>
          <span className="text-xs font-mono">
            {tableMetrics.domNodesPerItem.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Founding Engineer Note */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
          Founding Engineer Feature: Compare performance between virtual and legacy tables to see the scalability improvements.
        </div>
      </div>
    </div>
  );
} 