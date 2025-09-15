"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured' | 'configured' | 'error';
  [key: string]: any;
}

interface HealthData {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    rss: number;
    external: number;
    arrayBuffers: number;
  };
  performance: {
    totalResponseTime: number;
    apiLatencies: Record<string, number>;
    aggregatedMetrics?: {
      minLatency: number;
      maxLatency: number;
      avgLatency: number;
      totalExternalCalls: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
  checks: Record<string, HealthCheck>;
  responseTime: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return '#1DB954';
    case 'degraded': return '#F59E0B';
    case 'unhealthy': return '#EF4444';
    case 'error': return '#EF4444';
    case 'not_configured': return '#6B7280';
    case 'configured': return '#10B981';
    default: return '#6B7280';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return '✓';
    case 'degraded': return '⚠';
    case 'unhealthy': return '✗';
    case 'error': return '✗';
    case 'not_configured': return '○';
    case 'configured': return '◐';
    default: return '?';
  }
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatBytes = (mb: number) => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb}MB`;
};

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchHealthData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="health-dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>System Health</h2>
          </div>
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Loading health data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>System Health</h2>
            <button onClick={fetchHealthData} className="refresh-btn">
              Retry
            </button>
          </div>
          <div className="error-state">
            <span className="error-icon">⚠</span>
            <div>
              <strong>Failed to load health data</strong>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const overallStatusColor = getStatusColor(healthData.status);

  return (
    <div className="health-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="status-indicator">
            <div 
              className="status-dot" 
              style={{ backgroundColor: overallStatusColor }}
            />
            <h2>System Health</h2>
            <span className={`status-badge status-${healthData.status}`}>
              {healthData.status.toUpperCase()}
            </span>
          </div>
          <div className="header-controls">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button onClick={fetchHealthData} className="refresh-btn">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-label">Response Time</div>
            <div className="stat-value">{healthData.responseTime}ms</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Uptime</div>
            <div className="stat-value">{formatUptime(healthData.uptime)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Memory Usage</div>
            <div className="stat-value">{formatBytes(healthData.memory.used)}</div>
            <div className="stat-sub">of {formatBytes(healthData.memory.total)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">CPU Time</div>
            <div className="stat-value">{(healthData.performance.cpu.user / 1000).toFixed(1)}s</div>
            <div className="stat-sub">user + {(healthData.performance.cpu.system / 1000).toFixed(1)}s sys</div>
          </div>
        </div>

        {/* Service Checks */}
        <div className="services-grid">
          {Object.entries(healthData.checks).map(([serviceName, check]) => (
            <motion.div
              key={serviceName}
              className="service-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="service-header">
                <div className="service-status">
                  <span 
                    className="service-icon"
                    style={{ color: getStatusColor(check.status) }}
                  >
                    {getStatusIcon(check.status)}
                  </span>
                  <span className="service-name">{serviceName}</span>
                </div>
                <span 
                  className={`service-badge status-${check.status}`}
                  style={{ 
                    backgroundColor: `${getStatusColor(check.status)}20`,
                    color: getStatusColor(check.status),
                    border: `1px solid ${getStatusColor(check.status)}40`
                  }}
                >
                  {check.status}
                </span>
              </div>
              
              <div className="service-details">
                {check.responseTime && (
                  <div className="service-metric">
                    <span className="metric-label">Response Time:</span>
                    <span className="metric-value">{check.responseTime}ms</span>
                  </div>
                )}
                {check.version && (
                  <div className="service-metric">
                    <span className="metric-label">Version:</span>
                    <span className="metric-value">{check.version}</span>
                  </div>
                )}
                {check.url && (
                  <div className="service-metric">
                    <span className="metric-label">URL:</span>
                    <span className="metric-value url-value">{check.url}</span>
                  </div>
                )}
                {check.httpStatus && (
                  <div className="service-metric">
                    <span className="metric-label">HTTP Status:</span>
                    <span className="metric-value">{check.httpStatus}</span>
                  </div>
                )}
                {check.error && (
                  <div className="service-metric error-metric">
                    <span className="metric-label">Error:</span>
                    <span className="metric-value">{check.error}</span>
                  </div>
                )}
                {check.message && (
                  <div className="service-metric">
                    <span className="metric-label">Info:</span>
                    <span className="metric-value">{check.message}</span>
                  </div>
                )}
                {check.paths && (
                  <div className="service-metric">
                    <span className="metric-label">Paths:</span>
                    <div className="paths-grid">
                      {Object.entries(check.paths).map(([path, status]) => (
                        <div key={path} className="path-status">
                          <span className={`path-indicator ${status === 'exists' ? 'exists' : 'missing'}`}>
                            {status === 'exists' ? '✓' : '✗'}
                          </span>
                          <span className="path-name">{path}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {check.required && (
                  <div className="service-metric">
                    <span className="metric-label">Required Env:</span>
                    <div className="env-grid">
                      {Object.entries(check.required).map(([env, status]) => (
                        <div key={env} className="env-status">
                          <span className={`env-indicator ${status === 'present' ? 'present' : 'missing'}`}>
                            {status === 'present' ? '✓' : '✗'}
                          </span>
                          <span className="env-name">{env}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance Metrics */}
        {healthData.performance.aggregatedMetrics && (
          <div className="performance-section">
            <h3>API Performance Metrics</h3>
            <div className="performance-grid">
              <div className="perf-card">
                <div className="perf-label">Min Latency</div>
                <div className="perf-value">{healthData.performance.aggregatedMetrics.minLatency}ms</div>
              </div>
              <div className="perf-card">
                <div className="perf-label">Max Latency</div>
                <div className="perf-value">{healthData.performance.aggregatedMetrics.maxLatency}ms</div>
              </div>
              <div className="perf-card">
                <div className="perf-label">Avg Latency</div>
                <div className="perf-value">{healthData.performance.aggregatedMetrics.avgLatency}ms</div>
              </div>
              <div className="perf-card">
                <div className="perf-label">External Calls</div>
                <div className="perf-value">{healthData.performance.aggregatedMetrics.totalExternalCalls}</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="dashboard-footer">
          <span className="last-updated">
            Last updated: {new Date(healthData.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <style jsx>{`
        .health-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
          color: #e2e8f0;
          font-family: 'InterLocal', system-ui, sans-serif;
          padding: 20px;
        }

        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background: rgba(25, 227, 255, 0.05);
          border: 1px solid rgba(25, 227, 255, 0.2);
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 0 12px currentColor;
        }

        .dashboard-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #19E3FF;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .status-healthy {
          background-color: rgba(29, 185, 84, 0.2);
          color: #1DB954;
          border: 1px solid rgba(29, 185, 84, 0.4);
        }

        .status-degraded {
          background-color: rgba(245, 158, 11, 0.2);
          color: #F59E0B;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .status-unhealthy {
          background-color: rgba(239, 68, 68, 0.2);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
        }

        .auto-refresh-toggle input {
          width: 16px;
          height: 16px;
          accent-color: #19E3FF;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: rgba(25, 227, 255, 0.1);
          border: 1px solid rgba(25, 227, 255, 0.3);
          border-radius: 8px;
          color: #19E3FF;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover {
          background: rgba(25, 227, 255, 0.2);
          border-color: rgba(25, 227, 255, 0.5);
          transform: translateY(-1px);
        }

        .overview-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat-card {
          padding: 20px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(25, 227, 255, 0.2);
          border-radius: 12px;
          text-align: center;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #19E3FF;
          margin-bottom: 4px;
        }

        .stat-sub {
          font-size: 12px;
          color: #64748b;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }

        .service-card {
          padding: 20px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(25, 227, 255, 0.2);
          border-radius: 12px;
          backdrop-filter: blur(4px);
        }

        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .service-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .service-icon {
          font-size: 18px;
          font-weight: bold;
        }

        .service-name {
          font-size: 16px;
          font-weight: 600;
          color: #e2e8f0;
          text-transform: capitalize;
        }

        .service-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .service-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .service-metric {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .metric-label {
          font-size: 13px;
          color: #94a3b8;
          flex-shrink: 0;
        }

        .metric-value {
          font-size: 13px;
          color: #e2e8f0;
          text-align: right;
          word-break: break-all;
        }

        .url-value {
          font-family: monospace;
          font-size: 11px;
        }

        .error-metric .metric-value {
          color: #ef4444;
        }

        .paths-grid, .env-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
        }

        .path-status, .env-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .path-indicator, .env-indicator {
          font-size: 10px;
          font-weight: bold;
        }

        .path-indicator.exists, .env-indicator.present {
          color: #10b981;
        }

        .path-indicator.missing, .env-indicator.missing {
          color: #ef4444;
        }

        .path-name, .env-name {
          font-family: monospace;
          color: #cbd5e1;
        }

        .performance-section {
          padding: 24px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(25, 227, 255, 0.2);
          border-radius: 12px;
        }

        .performance-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #19E3FF;
        }

        .performance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .perf-card {
          padding: 16px;
          background: rgba(25, 227, 255, 0.05);
          border: 1px solid rgba(25, 227, 255, 0.1);
          border-radius: 8px;
          text-align: center;
        }

        .perf-label {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .perf-value {
          font-size: 20px;
          font-weight: 600;
          color: #19E3FF;
        }

        .dashboard-footer {
          text-align: center;
          padding: 16px;
          border-top: 1px solid rgba(25, 227, 255, 0.1);
        }

        .last-updated {
          font-size: 12px;
          color: #64748b;
        }

        .loading-state, .error-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          text-align: center;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(25, 227, 255, 0.2);
          border-top: 2px solid #19E3FF;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .error-icon {
          font-size: 24px;
          color: #ef4444;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .header-controls {
            justify-content: space-between;
          }

          .overview-stats {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .services-grid {
            grid-template-columns: 1fr;
          }

          .performance-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}