"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    // Shell command execution
    exec: (command, args) => electron_1.ipcRenderer.invoke('exec', command, args),
    // Streaming commands (for Claude output)
    // stdinData is written to the process stdin then closed — use for large payloads
    execStream: (command, args, stdinData) => electron_1.ipcRenderer.send('exec-stream', command, args, stdinData),
    onStreamData: (callback) => electron_1.ipcRenderer.on('stream-data', (_event, data) => callback(data)),
    onStreamEnd: (callback) => electron_1.ipcRenderer.on('stream-end', (_event, code) => callback(code)),
    onStreamError: (callback) => electron_1.ipcRenderer.on('stream-error', (_event, error) => callback(error)),
    cancelStream: () => electron_1.ipcRenderer.send('cancel-stream'),
    // Remove listeners (cleanup)
    removeAllListeners: (channel) => electron_1.ipcRenderer.removeAllListeners(channel),
});
