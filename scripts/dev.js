import {__dirname, runCommand} from './common.js';
import {join} from 'node:path';

process.chdir(join(__dirname, ".."));


function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

async function checkCommandExists(command) {
    try {
        await runCommand(command, ["--version"], {
            stdio: "ignore", // 完全不输出
        });
        return true;
    } catch {
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
        // 检测并安装 Zellij
        if (!(await checkCommandExists("zellij"))) {
            console.warn("[!] 正在安装 Zellij...");

            try {
                await runCommand("cargo", ["install", "--locked", "zellij"]);
                console.warn("[!] Zellij 安装完成。");
            } catch (installError) {
                console.error(`[!] 安装 Zellij 失败: ${installError.message}`);
                process.exit(1);
            }
        }

        // 创建 Zellij 左右分屏布局
        const zellijLayoutPath = join(__dirname, "zellij_layout.kdl");
        const fs = await import("node:fs/promises");
        await fs.writeFile(
            zellijLayoutPath,
            `
layout {
    pane split_direction="vertical" {
        pane borderless=true {
            command "bash"
            args "-c" "cd backend ; bacon run"
        }
        pane borderless=true {
            command "bash"
            args "-c" "pnpm install ; pnpm vite dev"
        }
    }

}
`.trim(),
        );

        console.warn("[!] 使用 Ctrl+Q 退出 Zellij");
        await sleep(1500);

        // 启动 Zellij 会话
        await runCommand("zellij", ["--layout", zellijLayoutPath]);
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