/// @ts-check
/// <reference types="node" />
import { __dirname, runCommand } from "./common.js"
import { join, resolve } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { createWriteStream } from "node:fs"
import archiver from "archiver"
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import toml from "toml"
const args = process.argv.slice(2)
const targetArgIndex = args.indexOf("--target")
const target = targetArgIndex !== -1 ? args[targetArgIndex + 1] : null
const isWindows = process.platform === "win32"
const projectRoot = resolve(__dirname, "..")
const distDir = join(projectRoot, "dist")
const binaryTargetDir = join(projectRoot, "target", target || "release")

process.chdir(projectRoot)

function getCargoVersion() {
    try {
        const cargoTomlPath = join(projectRoot, "backend","Cargo.toml")
        const content = readFileSync(cargoTomlPath, "utf-8")
        const parsed = toml.parse(content)
        return parsed.package?.version || "0.0.0"
    } catch (e) {
        console.warn("[!] 无法解析 Cargo.toml:", e.message)
        return "0.0.0"
    }
}

function getNativeRustTarget() {
    try {
        const output = execSync("rustup show active-toolchain", { encoding: "utf-8" })
        const match = output.match(/-(\S+)\s/)
        return match ? match[1] : null
    } catch (e) {
        console.warn("[!] 无法获取原生 Rust target:", e.message)
        return null
    }
}


;(async () => {
    console.warn("[!] 正在安装 npm 依赖...")
    try {
        await (isWindows
            ? runCommand("cmd.exe", ["/c", "npx.cmd", "pnpm", "install"])
            : runCommand("pnpm", ["install"]))
        console.warn("[!] npm 依赖安装完成。")
    } catch (installError) {
        console.error(`[!] 安装 npm 依赖失败: ${installError.message}`)
        process.exit(1)
    }

    console.warn("[!] 正在构建前端文件...")
    try {
        await (isWindows
            ? runCommand("cmd.exe", ["/c", "npx.cmd", "pnpm", "vite", "build"])
            : runCommand("pnpm", ["vite", "build"]))
        console.warn("[!] 前端文件构建完成。")
    } catch (e) {
        console.error(`[!] 构建前端文件失败: ${e.message}`)
        process.exit(1)
    }

    console.warn("[!] 正在构建 Rust 程序...")
    const cargoArgs = ["build", "--release"]
    if (target) cargoArgs.push("--target", target)
    try {
        await runCommand("cargo", cargoArgs)
        console.warn("✅ Rust 程序构建完成。")
    } catch (e) {
        console.error(`[!] Rust 构建失败: ${e.message}`)
        process.exit(1)
    }

    const binaryName = "Spectra"
    const binaryPath = join(binaryTargetDir, isWindows ? `${binaryName}.exe` : binaryName)

    if (!existsSync(binaryPath)) {
        console.error(`[!] 未找到构建好的二进制文件: ${binaryPath}`)
        process.exit(1)
    }

    console.warn("[!] 正在打包为 zip 文件...")
    try {
        if (existsSync(distDir)) rmSync(distDir, { recursive: true })
        mkdirSync(distDir, { recursive: true })

        const zipPath = join(distDir, `Spectra-${getCargoVersion()}-${target || getNativeRustTarget()}.zip`)
        const output = createWriteStream(zipPath)
        const archive = archiver("zip", { zlib: { level: 9 } });
        (new Promise((resolve, reject) => {
            archive.pipe(output)
            output.on("close", resolve)
            archive.on("error", reject)
        })).then(() => {
            console.warn(`✅ 打包完成：${zipPath}`)
        })
        archive.file(binaryPath, { name: binaryName + (isWindows ? ".exe" : "") })
        archive.file(join(projectRoot, "LICENSE"), { name: "LICENSE" })
        archive.file(join(projectRoot, "README.md"), { name: "README.md" })
        await archive.finalize()
    } catch (e) {
        console.log(e)
        console.error(`[!] 打包失败: ${e.message}`)
        process.exit(1)
    }
})()
