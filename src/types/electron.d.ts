interface ExecResult {
  stdout: string
  stderr: string
}

interface ElectronAPI {
  exec: (command: string, args: string[]) => Promise<ExecResult>
  execStream: (command: string, args: string[]) => void
  onStreamData: (callback: (data: string) => void) => void
  onStreamEnd: (callback: (code: number) => void) => void
  onStreamError: (callback: (error: string) => void) => void
  cancelStream: () => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
