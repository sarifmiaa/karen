import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Shell command execution
  exec: (command: string, args: string[]) =>
    ipcRenderer.invoke('exec', command, args),

  // Streaming commands (for Claude output)
  execStream: (command: string, args: string[]) =>
    ipcRenderer.send('exec-stream', command, args),

  onStreamData: (callback: (data: string) => void) =>
    ipcRenderer.on('stream-data', (_event, data) => callback(data)),

  onStreamEnd: (callback: (code: number) => void) =>
    ipcRenderer.on('stream-end', (_event, code) => callback(code)),

  onStreamError: (callback: (error: string) => void) =>
    ipcRenderer.on('stream-error', (_event, error) => callback(error)),

  cancelStream: () =>
    ipcRenderer.send('cancel-stream'),

  // Remove listeners (cleanup)
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
})
