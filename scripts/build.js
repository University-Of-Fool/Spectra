import {__dirname, runCommand} from './common.js';
import {join} from "node:path";

process.chdir(join(__dirname, ".."));

(async () => {
    const isWindows = process.platform === "win32";
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
    console.warn("[!] 正在构建前端文件...");
    // pnpm vite build
    try {
        await (isWindows
            ? runCommand("cmd.exe", ["/c", "npx.cmd", "pnpm", "vite", "build"])
            : runCommand("pnpm", ["vite", "build"]));
    } catch (e) {
        console.error(`[!] 构建前端文件失败: ${e.message}`);
    }
    console.warn("[!] 前端文件构建完成。");
    console.warn("[!] 正在构建程序...");
    await runCommand("cargo", ["build", "--release"]);
    console.warn("✅ 程序构建完成。");
    console.warn(`✅ 构建好的二进制文件位于 ${
        join(process.cwd(), "target", "release")
    } 。`);

})()