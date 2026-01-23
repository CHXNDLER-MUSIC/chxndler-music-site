"use client";
import React, { useState, useEffect } from 'react';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured' | 'configured' | 'error';
  [key: string]: any;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  performance: {
    totalResponseTime: number;
    apiLatencies: Record<string, number>;
  };
  checks: Record<string, HealthCheck>;
  responseTime: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return '#10B981';
    case 'degraded': return '#F59E0B';
    case 'unhealthy': return '#EF4444';
    default: return '#6B7280';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return '🟢';
    case 'degraded': return '🟡';
    case 'unhealthy': return '🔴';
    default: return '⚪';
  }
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

interface HealthStatusWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function HealthStatusWidget({ isOpen, onToggle }: HealthStatusWidgetProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health');

      if (response.ok || response.status === 503) {
        let parsed: any;
        try {
          parsed = await response.json();
        } catch (e) {
          // If we cannot parse the body at all, treat as hard error
          throw new Error('Invalid health response');
        }

        const isDegraded = response.status === 503;
        const safeData: HealthData = {
          status: (isDegraded ? 'degraded' : (parsed?.status ?? 'healthy')) as HealthData['status'],
          uptime: typeof parsed?.uptime === 'number' ? parsed.uptime : 0,
          memory: {
            used: typeof parsed?.memory?.used === 'number' ? parsed.memory.used : 0,
            total: typeof parsed?.memory?.total === 'number' ? parsed.memory.total : 0,
          },
          performance: {
            totalResponseTime: typeof parsed?.performance?.totalResponseTime === 'number'
              ? parsed.performance.totalResponseTime
              : (typeof parsed?.responseTime === 'number' ? parsed.responseTime : 0),
            apiLatencies: parsed?.performance?.apiLatencies && typeof parsed?.performance?.apiLatencies === 'object'
              ? parsed.performance.apiLatencies
              : {},
          },
          checks: parsed?.checks && typeof parsed?.checks === 'object' ? parsed.checks : {},
          responseTime: typeof parsed?.responseTime === 'number' ? parsed.responseTime : 0,
        };

        setHealthData(safeData);
        setError(null);
      } else {
        // Non-OK and not 503: treat as hard error
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      // Only hard error on network failure or completely unparseable body
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      // Always resolve loading state
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    const status = error ? 'unhealthy' : (healthData?.status || 'unknown');
    const icon = error ? '🔴' : getStatusIcon(status);
    
    return (
      <button
        onClick={onToggle}
        className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg font-mono text-sm transition-all transform hover:scale-105 flex items-center gap-2"
        title={`System Health: ${status.toUpperCase()} (Response: ${healthData?.responseTime || 'N/A'}ms)`}
      >
        {icon} Health
      </button>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-4 min-w-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">System Health</h3>
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
          Loading health data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-4 min-w-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">System Health</h3>
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">🔴</div>
          <div className="text-sm text-red-600 font-medium">Health Check Failed</div>
          <div className="text-xs text-gray-500 mt-1">{error}</div>
          <button
            onClick={fetchHealthData}
            className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const overallStatusColor = getStatusColor(healthData.status);
  const criticalServices = Object.entries(healthData.checks).filter(([_, check]) => 
    check.status === 'unhealthy' || check.status === 'error'
  );
  const degradedServices = Object.entries(healthData.checks).filter(([_, check]) => 
    check.status === 'degraded'
  );

  return (
    <div className="bg-white rounded-xl shadow-xl p-4 min-w-[320px] max-w-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: overallStatusColor, boxShadow: `0 0 8px ${overallStatusColor}40` }}
          />
          <h3 className="font-semibold text-gray-900">System Health</h3>
          <span 
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ 
              backgroundColor: `${overallStatusColor}20`, 
              color: overallStatusColor 
            }}
          >
            {healthData.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHealthData}
            className="text-gray-400 hover:text-gray-600 text-xs"
            title="Refresh health data"
          >
            🔄
          </button>
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{healthData.responseTime}ms</div>
          <div className="text-xs text-blue-800">Response Time</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-green-600">{formatUptime(healthData.uptime)}</div>
          <div className="text-xs text-green-800">Uptime</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-purple-600">{healthData.memory.used}MB</div>
          <div className="text-xs text-purple-800">Memory Usage</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-orange-600">
            {Object.keys(healthData.performance.apiLatencies).length}
          </div>
          <div className="text-xs text-orange-800">API Calls</div>
        </div>
      </div>

      {/* Service Status Summary */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Service Status</h4>
        
        {criticalServices.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <div className="text-xs font-medium text-red-800 mb-1">
              🔴 Critical Issues ({criticalServices.length})
            </div>
            {criticalServices.slice(0, 3).map(([serviceName, check]) => (
              <div key={serviceName} className="text-xs text-red-600 flex justify-between">
                <span className="font-mono">{serviceName}</span>
                <span>{check.status}</span>
              </div>
            ))}
            {criticalServices.length > 3 && (
              <div className="text-xs text-red-500 mt-1">
                +{criticalServices.length - 3} more
              </div>
            )}
          </div>
        )}

        {degradedServices.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <div className="text-xs font-medium text-yellow-800 mb-1">
              🟡 Degraded Services ({degradedServices.length})
            </div>
            {degradedServices.slice(0, 3).map(([serviceName, check]) => (
              <div key={serviceName} className="text-xs text-yellow-600 flex justify-between">
                <span className="font-mono">{serviceName}</span>
                <span>{check.responseTime ? `${check.responseTime}ms` : 'degraded'}</span>
              </div>
            ))}
            {degradedServices.length > 3 && (
              <div className="text-xs text-yellow-600 mt-1">
                +{degradedServices.length - 3} more
              </div>
            )}
          </div>
        )}

        {criticalServices.length === 0 && degradedServices.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="text-xs font-medium text-green-800">
              🟢 All systems operational
            </div>
            <div className="text-xs text-green-600 mt-1">
              {Object.keys(healthData.checks).length} services healthy
            </div>
          </div>
        )}
      </div>

      {/* API Performance */}
      {Object.keys(healthData.performance.apiLatencies).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">API Latencies</h4>
          <div className="space-y-1">
            {Object.entries(healthData.performance.apiLatencies).map(([service, latency]) => (
              <div key={service} className="flex justify-between text-xs">
                <span className="font-mono text-gray-600">{service}</span>
                <span className={`font-medium ${latency > 1000 ? 'text-red-600' : latency > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {latency}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
        <a
          href="/health"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
        >
          📊 Full Dashboard
        </a>
        <button
          onClick={fetchHealthData}
          className="px-3 py-2 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
