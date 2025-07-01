import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

process.chdir(join(__dirname, ".."));
function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            ...options,
        });
        child.on("close", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `命令 "${command} ${args.join(" ")}" 退出码为 ${code}`,
                    ),
                );
                return;
            }
            resolve();
        });

        child.on("error", (err) => {
            reject(
                new Error(
                    `执行命令 "${command} ${args.join(" ")}" 时发生错误: ${err.message}`,
                ),
            );
        });
    });
}

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
    // 检测并安装 Zellij
    if (!(await checkCommandExists("zellij"))) {
        console.warn("[!] 正在安装 Zellij...");
        try {
            await runCommand("cargo", ["install", "--locked", "zellij"]);
            console.log("[!] Zellij 安装完成。");
        } catch (installError) {
            console.error(`[!] 安装 Zellij 失败: ${installError.message}`);
            process.exit(1);
        }
    }

    // 检测并安装 Bacon
    if (!(await checkCommandExists("bacon"))) {
        console.warn("[!] 正在安装 Bacon...");
        try {
            await runCommand("cargo", ["install", "--locked", "bacon"]);
            console.log("[!] Bacon 安装完成。");
        } catch (installError) {
            console.error(`[!] 安装 Bacon 失败: ${installError.message}`);
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
            command "pwsh"
            args "-c" "cd backend ; bacon run"
        }
        pane borderless=true {
            command "pwsh"
            args "-c" "pnpm install ; pnpm vite dev"
        }
    }

}
`.trim(),
    );

    console.log("[!] 使用 Ctrl+Q 退出 Zellij");
    await sleep(1500);

    // 启动 Zellij 会话
    await runCommand("zellij", ["--layout", zellijLayoutPath]);
})();
