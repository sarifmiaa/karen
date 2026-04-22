import '@testing-library/jest-dom/vitest'
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

Object.defineProperty(window, 'api', {
  value: {
    exec: vi.fn(),
    execStream: vi.fn(),
    cancelStream: vi.fn(),
    onStreamData: vi.fn(),
    onStreamEnd: vi.fn(),
    onStreamError: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  writable: true,
})
