/// @ts-check
/// <reference types="node" />

import { execSync } from "node:child_process"
import {
    createWriteStream,
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
} from "node:fs"
import { join, resolve } from "node:path"
import archiver from "archiver"
import toml from "toml"
import { __dirname, runCommand } from "./common.js"

const args = process.argv.slice(2)
const targetArgIndex = args.indexOf("--target")
const target = targetArgIndex !== -1 ? args[targetArgIndex + 1] : null
const isWindows = process.platform === "win32"
const projectRoot = resolve(__dirname, "..")
const distDir = join(projectRoot, "dist")
const binaryTargetDir = join(
    projectRoot,
    "target",
    target ? `${target}/release` : "release",
)

process.chdir(projectRoot)

function getCargoVersion() {
    try {
        const cargoTomlPath = join(projectRoot, "backend", "Cargo.toml")
        const content = readFileSync(cargoTomlPath, "utf-8")
        const parsed = toml.parse(content)
        return parsed.package?.version || "0.0.0"
    } catch (e) {
        console.warn("[!] Failed to parse Cargo.toml:", e.message)
        return "0.0.0"
    }
}

function getNativeRustTarget() {
    try {
        const output = execSync("rustup show active-toolchain", {
            encoding: "utf-8",
        })
        const match = output.match(/-(\S+)\s/)
        return match ? match[1] : null
    } catch (e) {
        console.warn("[!] Failed to get the native Rust target:", e.message)
        return null
    }
}

;(async () => {
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

    console.warn("[!] Building frontend files...")
    try {
        await (isWindows
            ? runCommand("cmd.exe", ["/c", "npx.cmd", "pnpm", "vite", "build"])
            : runCommand("pnpm", ["vite", "build"]))
        console.warn("[!] Frontend files built.")
    } catch (e) {
        console.error(`[!] Failed to build frontend files: ${e.message}`)
        process.exit(1)
    }

    console.warn("[!] Building the Rust application...")
    const cargoArgs = ["build", "--release"]
    if (target) cargoArgs.push(`--target=${target}`)
    const options = {
        env: {
            ...process.env,
            SQLX_OFFLINE: "true",
        },
    }
    if (target?.includes("musl")) {
        options.env.OPENSSL_STATIC = "1"
    }
    try {
        await runCommand("cargo", cargoArgs, options)
        console.warn("✅ Rust application built.")
    } catch (e) {
        console.error(`[!] Failed to build Rust application: ${e.message}`)
        process.exit(1)
    }

    const binaryName = "Spectra"
    const binaryPath = join(
        binaryTargetDir,
        isWindows ? `${binaryName}.exe` : binaryName,
    )

    if (!existsSync(binaryPath)) {
        console.error(`[!] Built binary not found: ${binaryPath}`)
        process.exit(1)
    }

    console.warn("[!] Packaging the ZIP file...")
    try {
        const zipPath = join(
            distDir,
            `Spectra-${getCargoVersion()}-${target || getNativeRustTarget()}.zip`,
        )
        if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
        if (existsSync(zipPath)) rmSync(zipPath)
        const output = createWriteStream(zipPath)
        const archive = archiver("zip", { zlib: { level: 9 } })
        new Promise((resolve, reject) => {
            archive.pipe(output)
            output.on("close", resolve)
            archive.on("error", reject)
        }).then(() => {
            console.warn(`✅ Packaging complete: ${zipPath}`)
        })
        archive.file(binaryPath, {
            name: binaryName + (isWindows ? ".exe" : ""),
        })
        archive.file(join(projectRoot, "LICENSE"), { name: "LICENSE" })
        archive.file(join(projectRoot, "README.md"), { name: "README.md" })
        await archive.finalize()
    } catch (e) {
        console.log(e)
        console.error(`[!] Packaging failed: ${e.message}`)
        process.exit(1)
    }
})()
