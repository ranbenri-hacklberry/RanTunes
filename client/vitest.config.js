
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // Atomic Alisasing: Bypass heavy libraries completely
            'lucide-react': path.resolve(__dirname, './src/test/LucideStub.jsx'),
            'framer-motion': path.resolve(__dirname, './src/test/FramerMotionStub.jsx'),
            // Stub components
            '@/components': path.resolve(__dirname, './src/test/ComponentStub.jsx')
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.jsx'],
        testTimeout: 10000,
    },
})
