import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const startTime = performance.now()
  const healthData: any = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      arrayBuffers: Math.round(process.memoryUsage().arrayBuffers / 1024 / 1024)
    },
    performance: {
      startTime: startTime,
      totalResponseTime: 0,
      apiLatencies: {},
      checks: {}
    },
    checks: {}
  }

  try {
    // Check Next.js environment
    healthData.checks.nextjs = {
      status: 'healthy',
      version: process.env.npm_package_dependencies_next || 'unknown'
    }

    // Check React environment
    healthData.checks.react = {
      status: 'healthy',
      version: process.env.npm_package_dependencies_react || 'unknown'
    }

    // Check environment variables
    const requiredEnvVars = ['NODE_ENV']
    const optionalEnvVars = ['OPENAI_API_KEY', 'JOIN_WEBHOOK_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
    
    healthData.checks.environment = {
      status: 'healthy',
      required: requiredEnvVars.reduce((acc, envVar) => {
        acc[envVar] = process.env[envVar] ? 'present' : 'missing'
        return acc
      }, {} as Record<string, string>),
      optional: optionalEnvVars.reduce((acc, envVar) => {
        acc[envVar] = process.env[envVar] ? 'present' : 'missing'
        return acc
      }, {} as Record<string, string>)
    }

    // Check filesystem access
    try {
      const fs = require('fs')
      const path = require('path')
      
      // Check if critical directories exist
      const criticalPaths = [
        'public',
        'public/audio',
        'public/elements',
        'public/cover'
      ]
      
      healthData.checks.filesystem = {
        status: 'healthy',
        paths: criticalPaths.reduce((acc, dirPath) => {
          try {
            const fullPath = path.resolve(process.cwd(), dirPath)
            acc[dirPath] = fs.existsSync(fullPath) ? 'exists' : 'missing'
          } catch (error) {
            acc[dirPath] = 'error'
          }
          return acc
        }, {} as Record<string, string>)
      }
    } catch (error) {
      healthData.checks.filesystem = {
        status: 'error',
        error: 'Filesystem check failed'
      }
    }

    // Check Supabase connection (if configured)
    // Treat Supabase as non-critical unless explicitly marked critical via env
    const SUPABASE_CRITICAL = (process.env.HEALTH_SUPABASE_CRITICAL || '').toLowerCase() === 'true';
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabaseStartTime = performance.now()
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        // Simple health check - just test the connection
        const race = await Promise.race([
          supabase.from('_health_check').select('*').limit(1),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ]) as any
        const { error } = race || {}
        
        const supabaseLatency = Math.round(performance.now() - supabaseStartTime)
        healthData.performance.apiLatencies.supabase = supabaseLatency
        
        // If the health table is missing, consider Supabase configured but not fully set up
        const tableMissing = error && typeof error?.message === 'string' && /_health_check/i.test(error.message)
        healthData.checks.supabase = {
          status: error ? (tableMissing ? 'configured' : 'degraded') : 'healthy',
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          error: error?.message || null,
          responseTime: supabaseLatency,
          critical: SUPABASE_CRITICAL
        }
      } catch (error: any) {
        const supabaseLatency = Math.round(performance.now() - supabaseStartTime)
        healthData.performance.apiLatencies.supabase = supabaseLatency
        
        healthData.checks.supabase = {
          status: 'degraded',
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          error: error.message === 'Timeout' ? 'Connection timeout' : error.message,
          responseTime: supabaseLatency,
          critical: SUPABASE_CRITICAL
        }
      }
    } else {
      healthData.checks.supabase = {
        status: 'not_configured',
        message: 'Supabase environment variables not set',
        critical: false
      }
    }

    // Check OpenAI API (if configured)
    if (process.env.OPENAI_API_KEY) {
      try {
        // Simple connectivity test without making actual API calls
        healthData.checks.openai = {
          status: 'configured',
          message: 'API key present'
        }
      } catch (error: any) {
        healthData.checks.openai = {
          status: 'error',
          error: error.message
        }
      }
    } else {
      healthData.checks.openai = {
        status: 'not_configured',
        message: 'OpenAI API key not set'
      }
    }

    // Check external webhook (if configured)
    if (process.env.JOIN_WEBHOOK_URL) {
      try {
        const webhookStartTime = performance.now()
        const response = await Promise.race([
          fetch(process.env.JOIN_WEBHOOK_URL, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ]) as Response
        
        const webhookLatency = Math.round(performance.now() - webhookStartTime)
        healthData.performance.apiLatencies.webhook = webhookLatency
        
        healthData.checks.webhook = {
          status: response.ok ? 'healthy' : 'degraded',
          url: process.env.JOIN_WEBHOOK_URL,
          httpStatus: response.status,
          responseTime: webhookLatency
        }
      } catch (error: any) {
        const webhookLatency = Math.round(performance.now() - webhookStartTime)
        healthData.performance.apiLatencies.webhook = webhookLatency
        
        healthData.checks.webhook = {
          status: 'degraded',
          url: process.env.JOIN_WEBHOOK_URL,
          error: error.message,
          responseTime: webhookLatency
        }
      }
    } else {
      healthData.checks.webhook = {
        status: 'not_configured',
        message: 'Join webhook URL not set'
      }
    }

  } catch (error: any) {
    healthData.status = 'unhealthy'
    healthData.error = error.message
  }

  // Determine overall status based on checks
  // Compute overall considering only critical checks. By default, checks are critical unless marked otherwise.
  const checkStatuses = Object.values(healthData.checks)
    .filter((check: any) => check?.critical !== false)
    .map((check: any) => check.status)
  if (checkStatuses.includes('error') || checkStatuses.includes('unhealthy')) {
    healthData.status = 'unhealthy'
  } else if (checkStatuses.includes('degraded')) {
    healthData.status = 'degraded'
  }

  // Calculate total response time and performance metrics
  const totalResponseTime = Math.round(performance.now() - startTime)
  healthData.performance.totalResponseTime = totalResponseTime
  healthData.responseTime = totalResponseTime
  
  // Add aggregated performance metrics
  const latencies = Object.values(healthData.performance.apiLatencies)
  if (latencies.length > 0) {
    healthData.performance.aggregatedMetrics = {
      minLatency: Math.min(...latencies as number[]),
      maxLatency: Math.max(...latencies as number[]),
      avgLatency: Math.round(latencies.reduce((a, b) => (a as number) + (b as number), 0) / latencies.length),
      totalExternalCalls: latencies.length
    }
  }
  
  // Add CPU and process metrics
  const cpuUsage = process.cpuUsage()
  healthData.performance.cpu = {
    user: Math.round(cpuUsage.user / 1000), // Convert to milliseconds
    system: Math.round(cpuUsage.system / 1000)
  }
  
  // Add Node.js event loop lag estimation
  const eventLoopStart = performance.now()
  setImmediate(() => {
    const eventLoopLag = performance.now() - eventLoopStart
    healthData.performance.eventLoopLag = Math.round(eventLoopLag)
  })

  // Return appropriate HTTP status
  const httpStatus = healthData.status === 'healthy' ? 200 : 
                     healthData.status === 'degraded' ? 207 : 503

  return NextResponse.json(healthData, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  })
}

// Also support HEAD requests for lightweight health checks
export async function HEAD() {
  try {
    const startTime = performance.now()
    
    // Basic health check without detailed diagnostics
    const isHealthy = process.uptime() > 0 // Simple check: process is running
    const responseTime = Math.round(performance.now() - startTime)
    const memoryUsage = process.memoryUsage()
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    
    return new Response(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
        'X-Response-Time': responseTime.toString(),
        'X-Memory-Used': memoryUsedMB.toString(),
        'X-Uptime': process.uptime().toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}
