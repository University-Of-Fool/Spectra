import { join } from "node:path"
import { __dirname, runCommand } from "./common.js"

process.chdir(join(__dirname, ".."))

function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout)
    })
}

async function checkCommandExists(command) {
    const isWindows = process.platform === "win32"
    try {
        if (isWindows) {
            // Use where to find executables on Windows
            await runCommand("cmd.exe", ["/c", "where", command], {
                stdio: "ignore",
            })
        } else {
            // Use the POSIX shell builtin `command -v`
            await runCommand("sh", ["-c", `command -v ${command}`], {
                stdio: "ignore",
            })
        }
        return true
    } catch (_e) {
        return false
    }
}
;(async () => {
    const isWindows = process.platform === "win32"

    // Check for and install Bacon (required on all systems)
    if (!(await checkCommandExists("bacon"))) {
        console.warn("[!] Installing Bacon...")
        try {
            await runCommand("cargo", ["install", "--locked", "bacon"])
            console.warn("[!] Bacon installed.")
        } catch (installError) {
            console.error(`[!] Failed to install Bacon: ${installError.message}`)
            process.exit(1)
        }
    }

    console.warn("[!] Installing npm dependencies...")
    try {
        await (isWindows
            ? runCommand("cmd.exe", ["/c", "npx.cmd", "pnpm", "install"])
            : runCommand("pnpm", ["install"]))
        console.warn("[!] npm dependencies installed.")
    } catch (installError) {
        console.error(`[!] Failed to install npm dependencies: ${installError.message}`)
        process.exit(1)
    }

    if (!isWindows) {
        // Check for tmux
        if (!(await checkCommandExists("tmux"))) {
            console.error("[!] tmux not found. Please install it first:")
            console.error("    Ubuntu/Debian: sudo apt install tmux")
            console.error("    Fedora: sudo dnf install tmux")
            console.error("    macOS: brew install tmux")
            process.exit(1)
        }

        // Start a tmux session with split panes
        console.warn("[!] Press Ctrl+B, then D to detach from the tmux session")
        console.warn("[!] Run 'tmux attach' to reconnect to the session")
        await sleep(1500)

        // Create a tmux session with split panes
        await runCommand("tmux", [
            "new-session",
            "-s",
            "spectra-dev",
            "-d",
            "cd backend && bacon run",
        ])
        await runCommand("tmux", [
            "split-window",
            "-h",
            "-t",
            "spectra-dev",
            "pnpm vite dev",
        ])
        await runCommand("tmux", ["attach-session", "-t", "spectra-dev"])
    } else {
        console.warn("[!] Starting Windows Terminal...")
        await runCommand("wt", [
            "new-tab",
            "-d",
            ".",
            "npx.cmd",
            "pnpm",
            "vite",
            "dev",
            ";",
            "new-tab",
            "-d",
            ".\\backend",
            "bacon.exe",
            "run",
        ])
    }
})()
