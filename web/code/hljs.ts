import type { hljsTypst as _hljsTypst } from "@myriaddreamin/highlighter-typst"

declare global {
    interface Window {
        hljsTypst: typeof _hljsTypst
    }
}

export const HLJS_LANGS: Record<
    string,
    () => Promise<typeof import("highlight.js/lib/languages/*")>
> = {
    markdown: () => import("highlight.js/lib/languages/markdown"),
    html: () => import("highlight.js/lib/languages/xml"),
    css: () => import("highlight.js/lib/languages/css"),
    javascript: () => import("highlight.js/lib/languages/javascript"),
    typescript: () => import("highlight.js/lib/languages/typescript"),
    json: () => import("highlight.js/lib/languages/json"),
    yaml: () => import("highlight.js/lib/languages/yaml"),
    xml: () => import("highlight.js/lib/languages/xml"),
    sql: () => import("highlight.js/lib/languages/sql"),
    python: () => import("highlight.js/lib/languages/python"),
    java: () => import("highlight.js/lib/languages/java"),
    csharp: () => import("highlight.js/lib/languages/csharp"),
    php: () => import("highlight.js/lib/languages/php"),
    go: () => import("highlight.js/lib/languages/go"),
    rust: () => import("highlight.js/lib/languages/rust"),
    swift: () => import("highlight.js/lib/languages/swift"),
    c: () => import("highlight.js/lib/languages/c"),
    cpp: () => import("highlight.js/lib/languages/cpp"),
    ino: () => import("highlight.js/lib/languages/arduino"),
    latex: () => import("highlight.js/lib/languages/latex"),
    // Typst.ts 的作者 Myriad-Dreamin 确实有提供 Typst 语法高亮器，
    // 但是它需要 Typst 解析器（which 也是个 wasm module）以正常工作。
    // 尽量轻量和简化起见，这里用 Claude 写的简化语法树就足够了。
    typst: () => import("./custom/typst_language"),
}
