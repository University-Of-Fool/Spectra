import { spawn } from "node:child_process"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

export const __dirname = dirname(fileURLToPath(import.meta.url))

export function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            ...options,
        })

        child.on("close", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `Command "${command} ${args.join(" ")}" exited with code ${code}`,
                    ),
                )
                return
            }
            resolve()
        })

        child.on("error", (err) => {
            reject(
                new Error(
                    `Error while executing command "${command} ${args.join(" ")}": ${err.message}`,
                ),
            )
        })
    })
}
