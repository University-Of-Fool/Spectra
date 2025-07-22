import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('vite').UserConfig} */
export default {
    root: "web",
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'web/index.html'),
                admin: resolve(__dirname, 'web/admin/index.html'),
                code: resolve(__dirname, 'web/code/index.html'),
                password: resolve(__dirname, 'web/password/index.html'),
                not_found: resolve(__dirname, 'web/not_found/index.html'),
            },
        },
    },
    server: {
        hmr: {
            port: 5174
        }
    }
}