"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
let mainWindow = null;
const isDev = !electron_1.app.isPackaged;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 960,
        minHeight: 640,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: '#0a0a0a',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Shared env for all shell commands
function getEnv() {
    return {
        ...process.env,
        PATH: getPath(),
        GH_NO_PAGER: '1',
        NO_COLOR: '1',
        GH_PROMPT_DISABLED: '1',
    };
}
// IPC: execute a command and return stdout/stderr
electron_1.ipcMain.handle('exec', async (_event, command, args) => {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(command, args, { env: getEnv(), maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject({ message: error.message, stderr });
            }
            else {
                resolve({ stdout, stderr });
            }
        });
    });
});
// Ensure common binary paths are in PATH (macOS GUI apps don't inherit shell PATH)
function getPath() {
    const extra = [
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/usr/bin',
        '/bin',
        `${process.env.HOME}/.npm-global/bin`,
        `${process.env.HOME}/.nvm/versions/node/current/bin`,
    ];
    const current = process.env.PATH || '';
    return [...extra, ...current.split(':')].filter(Boolean).join(':');
}
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
