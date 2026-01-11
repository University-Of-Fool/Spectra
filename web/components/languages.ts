// This file defines the available language supported by Spectra's pastebin functionality
export type LanguageDefinition = {
    id: string
    displayName: string
    hljsFunction: () => Promise<typeof import("highlight.js/lib/languages/*")>
    wrap: boolean
    previewable: boolean
}

export const emptyLanguage: LanguageDefinition = {
    id: "empty",
    displayName: "languages.unknown",
    hljsFunction: () => import("highlight.js/lib/languages/plaintext"),
    wrap: true,
    previewable: false,
}

export const LANGS: Record<string, LanguageDefinition> = {
    text: {
        id: "text",
        displayName: "languages.text",
        hljsFunction: () => import("highlight.js/lib/languages/plaintext"),
        wrap: true,
        previewable: false,
    },
    markdown: {
        id: "markdown",
        displayName: "languages.markdown",
        hljsFunction: () => import("highlight.js/lib/languages/markdown"),
        wrap: true,
        previewable: true,
    },
    latex: {
        id: "latex",
        displayName: "languages.latex",
        hljsFunction: () => import("highlight.js/lib/languages/latex"),
        wrap: true,
        previewable: true,
    },
    typst: {
        // Typst.ts 的作者 Myriad-Dreamin 确实有提供 Typst 语法高亮器，
        // 但是它需要 Typst 解析器（which 也是个 wasm module）以正常工作。
        // 尽量轻量和简化起见，这里用 Claude 写的简化语法树就足够了。
        id: "typst",
        displayName: "languages.typst",
        hljsFunction: () => import("../components/custom/typst_language"),
        wrap: true,
        previewable: true,
    },
    javascript: {
        id: "javascript",
        displayName: "languages.javascript",
        hljsFunction: () => import("highlight.js/lib/languages/javascript"),
        wrap: false,
        previewable: false,
    },
    python: {
        id: "python",
        displayName: "languages.python",
        hljsFunction: () => import("highlight.js/lib/languages/python"),
        wrap: false,
        previewable: false,
    },
    typescript: {
        id: "typescript",
        displayName: "languages.typescript",
        hljsFunction: () => import("highlight.js/lib/languages/typescript"),
        wrap: false,
        previewable: false,
    },
    java: {
        id: "java",
        displayName: "languages.java",
        hljsFunction: () => import("highlight.js/lib/languages/java"),
        wrap: false,
        previewable: false,
    },
    html: {
        id: "html",
        displayName: "languages.html",
        hljsFunction: () => import("highlight.js/lib/languages/xml"),
        wrap: true,
        previewable: true,
    },
    css: {
        id: "css",
        displayName: "languages.css",
        hljsFunction: () => import("highlight.js/lib/languages/css"),
        wrap: false,
        previewable: false,
    },
    json: {
        id: "json",
        displayName: "languages.json",
        hljsFunction: () => import("highlight.js/lib/languages/json"),
        wrap: false,
        previewable: false,
    },
    sql: {
        id: "sql",
        displayName: "languages.sql",
        hljsFunction: () => import("highlight.js/lib/languages/sql"),
        wrap: false,
        previewable: false,
    },
    cpp: {
        id: "cpp",
        displayName: "languages.cpp",
        hljsFunction: () => import("highlight.js/lib/languages/cpp"),
        wrap: false,
        previewable: false,
    },
    c: {
        id: "c",
        displayName: "languages.c",
        hljsFunction: () => import("highlight.js/lib/languages/c"),
        wrap: false,
        previewable: false,
    },
    php: {
        id: "php",
        displayName: "languages.php",
        hljsFunction: () => import("highlight.js/lib/languages/php"),
        wrap: false,
        previewable: false,
    },
    go: {
        id: "go",
        displayName: "languages.go",
        hljsFunction: () => import("highlight.js/lib/languages/go"),
        wrap: false,
        previewable: false,
    },
    rust: {
        id: "rust",
        displayName: "languages.rust",
        hljsFunction: () => import("highlight.js/lib/languages/rust"),
        wrap: false,
        previewable: false,
    },
    csharp: {
        id: "csharp",
        displayName: "languages.csharp",
        hljsFunction: () => import("highlight.js/lib/languages/csharp"),
        wrap: false,
        previewable: false,
    },
    swift: {
        id: "swift",
        displayName: "languages.swift",
        hljsFunction: () => import("highlight.js/lib/languages/swift"),
        wrap: false,
        previewable: false,
    },
    xml: {
        id: "xml",
        displayName: "languages.xml",
        hljsFunction: () => import("highlight.js/lib/languages/xml"),
        wrap: false,
        previewable: false,
    },
    yaml: {
        id: "yaml",
        displayName: "languages.yaml",
        hljsFunction: () => import("highlight.js/lib/languages/yaml"),
        wrap: false,
        previewable: false,
    },
    ino: {
        id: "ino",
        displayName: "languages.arduino",
        hljsFunction: () => import("highlight.js/lib/languages/arduino"),
        wrap: false,
        previewable: false,
    },
    bash: {
        id: "bash",
        displayName: "languages.bash",
        hljsFunction: () => import("highlight.js/lib/languages/bash"),
        wrap: false,
        previewable: false,
    },
}
