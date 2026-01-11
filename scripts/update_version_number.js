/// @ts-check
/// <reference types="node" />
import { __dirname,  } from "./common.js"
import { join, resolve } from "node:path"
import {parse} from "smol-toml";
import {readFileSync, writeFileSync} from "node:fs"
const args = process.argv.slice(2)
const projectRoot = resolve(__dirname, "..")


if(!args[0]){
  console.log("[X] Please specify version number!")
  process.exit(1)
}
const cargoTomlPath = join(projectRoot, "backend","Cargo.toml")
const content = readFileSync(cargoTomlPath, "utf-8")
const _parsed = parse(content)
const parsed=JSON.parse(JSON.stringify(_parsed)) // workaround for annoying TypeScript warning 😇
if(!parsed.package || !parsed.package.version){
  console.log("[X] Cannot find version number in Cargo.toml!")
  process.exit(1)
}
const replacedContent=content.replace(parsed.package.version,args[0])
writeFileSync(cargoTomlPath,replacedContent,"utf-8")
console.log(`[√] Updated version number: ${parsed.package.version} --> ${args[0]}`)

