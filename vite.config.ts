import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pro GitHub Pages v rootu user/org webu použij base: '/'
// Pro projektovou stránku použij název repozitáře, např. '/skimo-lawbook-react/'
export default defineConfig({
  plugins: [react()],
  base: '/zakony-public/',
})
