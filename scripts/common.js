import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

export const __dirname = dirname(fileURLToPath(import.meta.url));

export function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            ...options,
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`命令 "${command} ${args.join(' ')}" 退出码为 ${code}`));
                return;
            }
            resolve();
        });

        child.on('error', (err) => {
            reject(new Error(`执行命令 "${command} ${args.join(' ')}" 时发生错误: ${err.message}`));
        });
    });
}