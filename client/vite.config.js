import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    open: true, // Automatically opens default browser on dev launch
    proxy: {
      // REST API
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Static file uploads (only works for locally-stored files;
      // files on Render are fetched directly via getUploadUrl)
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Socket.IO WebSocket — forwards WS upgrades to the backend
      // so `io(window.location.origin)` would also work, but we prefer
      // the explicit VITE_SOCKET_URL approach in SocketContext.jsx
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true, // <-- enable WebSocket proxying
      },
    },
  },
})
