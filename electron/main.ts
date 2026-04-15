import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { execFile } from 'child_process'

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
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

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
