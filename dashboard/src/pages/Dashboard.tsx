import HostStatusPie from '../components/charts/HostStatusPie';
import HostUptimeHistory from '../components/charts/HostUptimeHistory';
import ResourceDistribution from '../components/charts/ResourceDistribution';
import CriticalKPIs from '../components/CriticalKPIs';
import { useDataContext } from '../context/DataContext';
import { PipelineStage } from '../api/types';

export default function Dashboard() {
  const { hosts, lastUpdated } = useDataContext();

  const stageCounts = hosts.reduce((counts, h) => {
    const stage = h.pipelineStage || PipelineStage.Unassigned;
    counts[stage] = (counts[stage] || 0) + 1;
    return counts;
  }, {} as Record<PipelineStage, number>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold">Infrastructure Overview</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {lastUpdated && (
            <span>
              Last updated:{' '}
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* ── Pipeline Stage Summary - Fixed layout ─── */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Pipeline Stage Summary
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.values(PipelineStage).map((stage) => (
              <div
                key={stage}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center min-w-[120px]"
              >
                <span className={`
                  text-2xl font-bold
                  ${stage === PipelineStage.Broken ? 'text-red-600 dark:text-red-400' : 
                    stage === PipelineStage.Active ? 'text-green-600 dark:text-green-400' :
                    'text-indigo-600 dark:text-indigo-400'}
                `}>
                  {stageCounts[stage] || 0}
                </span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-300 text-center">
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Critical KPIs - Actually useful metrics ─── */}
        <CriticalKPIs hosts={hosts} />

        {/* ── Actionable Insights & Status ───────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              Hosts by Status
            </h2>
            <HostStatusPie hosts={hosts} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              Host Uptime – Last 5 Polls
            </h2>
            <HostUptimeHistory />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              Resource Distribution
            </h2>
            <ResourceDistribution hosts={hosts} />
          </div>
        </section>
      </main>
    </div>
  );
}