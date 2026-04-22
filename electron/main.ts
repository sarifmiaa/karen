import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { execFile, spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open all external URLs in the default browser, never inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/')}`
    if (!url.startsWith(appUrl)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Shared env for all shell commands
function getEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: getPath(),
    GH_NO_PAGER: '1',
    NO_COLOR: '1',
    GH_PROMPT_DISABLED: '1',
  }
}

// IPC: spawn a command and stream stdout/stderr back chunk by chunk
let currentStreamProcess: ChildProcess | null = null

ipcMain.on('exec-stream', (_event, command: string, args: string[], stdinData?: string) => {
  if (currentStreamProcess) {
    currentStreamProcess.kill()
    currentStreamProcess = null
  }

  const proc = spawn(command, args, { env: getEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
  currentStreamProcess = proc

  // Write stdin payload then close — prevents process from blocking on stdin
  if (stdinData) {
    proc.stdin?.write(stdinData, 'utf8')
  }
  proc.stdin?.end()

  proc.stdout?.on('data', (chunk: Buffer) => {
    mainWindow?.webContents.send('stream-data', chunk.toString())
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    mainWindow?.webContents.send('stream-data', chunk.toString())
  })

  proc.on('close', (code) => {
    currentStreamProcess = null
    mainWindow?.webContents.send('stream-end', code ?? 0)
  })

  proc.on('error', (err) => {
    currentStreamProcess = null
    mainWindow?.webContents.send('stream-error', err.message)
  })
})

ipcMain.on('cancel-stream', () => {
  if (currentStreamProcess) {
    currentStreamProcess.kill()
    currentStreamProcess = null
  }
})

// IPC: execute a command and return stdout/stderr
ipcMain.handle('exec', async (_event, command: string, args: string[]) => {
  return new Promise((resolve, reject) => {
    execFile(command, args, { env: getEnv(), maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject({ message: error.message, stderr })
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
})

// Ensure common binary paths are in PATH (macOS GUI apps don't inherit shell PATH)
function getPath(): string {
  const extra = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
    `${process.env.HOME}/.npm-global/bin`,
    `${process.env.HOME}/.nvm/versions/node/current/bin`,
  ]
  const current = process.env.PATH || ''
  return [...extra, ...current.split(':')].filter(Boolean).join(':')
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
