#!/usr/bin/env bun
import { spawn } from 'bun'
import { exists } from 'fs/promises'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

const log = (prefix, message, color = colors.reset) => {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`${color}[${prefix}] ${colors.dim}${timestamp}${colors.reset} ${color}${message}${colors.reset}`)
}

const logBackend = (message) => log('BACKEND', message, colors.green)
const logFrontend = (message) => log('FRONTEND', message, colors.blue)
const logSystem = (message) => log('SYSTEM', message, colors.yellow)

async function startBackend() {
  logSystem('Starting Go backend server with hot reload...')
  
  const backendProcess = spawn({
    cmd: ['mise', 'exec', '--', 'air'],
    cwd: './backend',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Stream backend output
  const backendReader = backendProcess.stdout.getReader()
  const backendErrorReader = backendProcess.stderr.getReader()
  
  // Read stdout
  const readBackendOut = async () => {
    try {
      while (true) {
        const { done, value } = await backendReader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        text.split('\n').forEach(line => {
          if (line.trim()) {
            // Add special formatting for Air messages
            if (line.includes('watching') || line.includes('building') || line.includes('restarting')) {
              logBackend(`🔄 ${line}`)
            } else if (line.includes('failed') || line.includes('error')) {
              logBackend(`❌ ${line}`)
            } else if (line.includes('Starting server') || line.includes('listening')) {
              logBackend(`🚀 ${line}`)
            } else {
              logBackend(line)
            }
          }
        })
      }
    } catch (error) {
      logBackend(`Output stream error: ${error.message}`)
    }
  }

  // Read stderr
  const readBackendErr = async () => {
    try {
      while (true) {
        const { done, value } = await backendErrorReader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        text.split('\n').forEach(line => {
          if (line.trim()) logBackend(`ERROR: ${line}`)
        })
      }
    } catch (error) {
      logBackend(`Error stream error: ${error.message}`)
    }
  }

  readBackendOut()
  readBackendErr()

  return backendProcess
}

async function startFrontend() {
  logSystem('Starting Vite frontend server...')
  
  const frontendProcess = spawn({
    cmd: ['npm', 'run', 'dev'],
    cwd: './frontend',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Stream frontend output
  const frontendReader = frontendProcess.stdout.getReader()
  const frontendErrorReader = frontendProcess.stderr.getReader()
  
  // Read stdout
  const readFrontendOut = async () => {
    try {
      while (true) {
        const { done, value } = await frontendReader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        text.split('\n').forEach(line => {
          if (line.trim()) logFrontend(line)
        })
      }
    } catch (error) {
      logFrontend(`Output stream error: ${error.message}`)
    }
  }

  // Read stderr
  const readFrontendErr = async () => {
    try {
      while (true) {
        const { done, value } = await frontendErrorReader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        text.split('\n').forEach(line => {
          if (line.trim()) logFrontend(`ERROR: ${line}`)
        })
      }
    } catch (error) {
      logFrontend(`Error stream error: ${error.message}`)
    }
  }

  readFrontendOut()
  readFrontendErr()

  return frontendProcess
}

async function main() {
  logSystem('🚀 Starting MedXamion development servers...')
  
  // Check if required directories exist
  if (!(await exists('./backend'))) {
    logSystem('❌ Backend directory not found!')
    process.exit(1)
  }
  
  if (!(await exists('./frontend'))) {
    logSystem('❌ Frontend directory not found!')
    process.exit(1)
  }

  try {
    // Start both servers
    const backendProcess = await startBackend()
    const frontendProcess = await startFrontend()

    logSystem('✅ Both servers started successfully!')
    logSystem('📱 Frontend: http://localhost:5173 (Vite HMR)')
    logSystem('🔧 Backend: http://localhost:8080 (Air Hot Reload)')
    logSystem('📚 API Docs: http://localhost:8080/docs')
    logSystem('')
    logSystem('🔄 Both servers will automatically reload on file changes!')
    logSystem('Press Ctrl+C to stop all servers')

    // Handle graceful shutdown
    const cleanup = async () => {
      logSystem('🛑 Shutting down servers...')
      
      try {
        backendProcess.kill()
        frontendProcess.kill()
      } catch (error) {
        logSystem(`Cleanup error: ${error.message}`)
      }
      
      logSystem('👋 Goodbye!')
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    // Wait for processes to exit
    await Promise.race([
      backendProcess.exited,
      frontendProcess.exited
    ])

    logSystem('⚠️  One of the servers exited unexpectedly')
    cleanup()

  } catch (error) {
    logSystem(`❌ Failed to start servers: ${error.message}`)
    process.exit(1)
  }
}

main().catch((error) => {
  logSystem(`Fatal error: ${error.message}`)
  process.exit(1)
})