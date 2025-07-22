import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin/index.html'),
                code: resolve(__dirname, 'code/index.html'),
                password: resolve(__dirname, 'password/index.html'),
                not_found: resolve(__dirname, 'not_found/index.html'),
            },
        },
    },
})