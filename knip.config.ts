import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'electron/main.ts',
    'electron/preload.ts',
    'src/types/electron.d.ts',
    'tests/**/*.test.{ts,tsx}',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'electron/**/*.ts',
    'tests/**/*.{ts,tsx}',
  ],
  ignoreDependencies: [
    'tailwindcss', // peer dep consumed by @tailwindcss/vite
  ],
  ignoreExportsUsedInFile: true,
  paths: {
    'src/types/*': ['src/types/*'],
  },
}

export default config
