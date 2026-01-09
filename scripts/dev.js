import { __dirname, runCommand } from "./common.js";
import { join } from "node:path";

process.chdir(join(__dirname, ".."));

function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

async function checkCommandExists(command) {
    const isWindows = process.platform === "win32";
    try {
        if (isWindows) {
            // Windows 使用 where 查找可执行文件
            await runCommand("cmd.exe", ["/c", "where", command], {
                stdio: "ignore",
            });
        } else {
            // POSIX 使用 shell 内建的 `command -v`
            await runCommand("sh", ["-c", `command -v ${command}`], {
                stdio: "ignore",
            });
        }
        return true;
    } catch (e) {
        return false;
    }
}
(async () => {
    const isWindows = process.platform === "win32";

    // 检测并安装 Bacon (在所有系统上都需要)
    if (!(await checkCommandExists("bacon"))) {
        console.warn("[!] 正在安装 Bacon...");
        try {
            await runCommand("cargo", ["install", "--locked", "bacon"]);
            console.warn("[!] Bacon 安装完成。");
        } catch (installError) {
            console.error(`[!] 安装 Bacon 失败: ${installError.message}`);
            process.exit(1);
        }
    }

    console.warn("[!] 正在安装 npm 依赖...");
    try {
        await (isWindows
            ? runCommand("cmd.exe", ["/c", "npx.cmd", "pnpm", "install"])
            : runCommand("pnpm", ["install"]));
        console.warn("[!] npm 依赖安装完成。");
    } catch (installError) {
        console.error(`[!] 安装 npm 依赖失败: ${installError.message}`);
        process.exit(1);
    }

    if (!isWindows) {
        // 检测 tmux
        if (!(await checkCommandExists("tmux"))) {
            console.error("[!] 未检测到 tmux，请先安装:");
            console.error("    Ubuntu/Debian: sudo apt install tmux");
            console.error("    Fedora: sudo dnf install tmux");
            console.error("    macOS: brew install tmux");
            process.exit(1);
        }

        // 启动 tmux 会话，左右分屏
        console.warn("[!] 使用 Ctrl+B 然后按 D 退出 tmux 会话（detach）");
        console.warn("[!] 使用 'tmux attach' 重新连接到会话");
        await sleep(1500);

        // 创建 tmux 会话并设置左右分屏
        await runCommand("tmux", [
            "new-session",
            "-s",
            "spectra-dev",
            "-d",
            "cd backend && bacon run",
        ]);
        await runCommand("tmux", [
            "split-window",
            "-h",
            "-t",
            "spectra-dev",
            "pnpm vite dev",
        ]);
        await runCommand("tmux", ["attach-session", "-t", "spectra-dev"]);
    } else {
        console.warn("[!] 启动 Windows Terminal...");
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
        ]);
    }
})();
