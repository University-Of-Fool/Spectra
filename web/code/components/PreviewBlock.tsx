import { loadFonts } from "@myriaddreamin/typst.ts"
import { MathJax, MathJaxContext } from "better-react-mathjax"
import DOMPurify from "dompurify"
import ghCssSystem from "github-markdown-css/github-markdown.css?url"
import ghCssDark from "github-markdown-css/github-markdown-dark.css?url"
import ghCssLight from "github-markdown-css/github-markdown-light.css?url"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/components/ThemeProvider.tsx"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TypstDocument } from "./typst.react/TypstDocument"

const mdRenderCache = new Map<string, string>()

// 全局单例：Typst 编译器实例
let globalTypst: {
    vector: (options: {
        mainContent: string
    }) => Promise<Uint8Array<ArrayBufferLike> | undefined>
} | null = null
let typstInitialized = false

function HtmlPreviewer(props: { code: string }) {
    return (
        // 由于对 iframe 注入脚本并动态计算高度在 React 中不太现实，且客观存在安全风险，
        // 因此这里指定一个固定的高度
        <iframe
            sandbox="allow-same-origin allow-scripts"
            srcDoc={props.code}
            className="w-full h-180 bg-white"
        ></iframe>
    )
}

function MarkdownPreviewer(props: { code: string }) {
    const [mdHtml, setMdHtml] = useState<string>("")
    const isLoadingRef = useRef(false)
    const { theme } = useTheme()

    useEffect(() => {
        // 检查缓存中是否已有渲染结果
        const cached = mdRenderCache.get(props.code)
        if (cached) {
            setMdHtml(cached)
            return
        }

        // 避免重复请求
        if (isLoadingRef.current) {
            return
        }

        isLoadingRef.current = true
    }, [props.code])

    ;(async () => {
        // 由于我们不确定用户给的 Markdown 里有什么语言，这里就不按需加载语言了
        const hljs = (await import("highlight.js")).default
        const { Marked } = await import("marked")
        const { markedHighlight } = await import("marked-highlight")
        const marked = new Marked(
            markedHighlight({
                emptyLangClass: "hljs",
                langPrefix: "hljs language-",
                highlight(code, lang) {
                    const language = hljs.getLanguage(lang) ? lang : "plaintext"
                    return hljs.highlight(code, { language }).value
                },
            }),
        )
        const parsedHtml = DOMPurify.sanitize(
            await marked.parse(
                // See: https://github.com/markedjs/marked/issues/2139
                props.code.replace(
                    /^[\u200B\u200E\u200F\uFEFF\u200C\u200D]/u,
                    "",
                ),
                {
                    gfm: true,
                },
            ),
        )
        mdRenderCache.set(props.code, parsedHtml)
        setMdHtml(parsedHtml)
        isLoadingRef.current = false
    })()

    return (
        <>
            {/* Markdown 里是很有可能出现 LaTeX 格式的公式的，因此这里套一层 MathJax 渲染 */}
            <MathJaxContext
                config={{
                    tex: {
                        inlineMath: [
                            ["$", "$"],
                            ["\\(", "\\)"],
                        ],
                        processEnvironments: false,
                    },
                }}
            >
                <MathJax dynamic>
                    <link
                        href={
                            theme === "dark"
                                ? ghCssDark
                                : theme === "light"
                                  ? ghCssLight
                                  : ghCssSystem
                        }
                        rel={"stylesheet"}
                    />
                    <div
                        className={"m-15 sm-m-5"}
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: 已经通过 DOMPurify 处理过了
                        dangerouslySetInnerHTML={{ __html: mdHtml }}
                    ></div>
                </MathJax>
            </MathJaxContext>
        </>
    )
}

function LaTeXPreviewer(props: { code: string }) {
    const { t } = useTranslation("codepage")
    // 防止代码注入
    let code = DOMPurify.sanitize(props.code)

    // 手动添加换行
    code = code
        // 两个及以上个换行符是一个段落
        .split(/\n{2,}/g)
        .map((text) => `<p>${text.trim()}</p>`)
        .join("\n")
        .split("\n")
        .map((text) => {
            // 去掉注释
            let ctn = text.replace(/%.*$/gm, "")
            // 添加换行符
            ctn = ctn.replace("\\\\", "<br/>")
            // 对于以 \ 开头的行，单独成段，以方便预览
            if (ctn.startsWith("\\")) return `</p><p>${ctn}</p><p>`
            return ctn
        })
        .join("\n")

    return (
        <MathJaxContext
            config={{
                tex: {
                    inlineMath: [
                        ["$", "$"],
                        ["\\(", "\\)"],
                    ],
                    processEnvironments: false,
                },
            }}
        >
            <MathJax dynamic>
                <div>
                    <div className="p-4 mb-4 rounded-lg text-accent-foreground bg-accent">
                        {t("preview.latex.notice")}
                    </div>
                    <div
                        className={"spectra-preview-latex *:mb-1"}
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: idk if there's better method
                        dangerouslySetInnerHTML={{ __html: code }}
                    ></div>
                </div>
            </MathJax>
        </MathJaxContext>
    )
}

function TypstPreviewer(props: { code: string }) {
    const [renderState, setRenderState] = useState<
        "idle" | "loading" | "rendering" | "success" | "error"
    >("idle")
    const [vectorArtifact, setVectorArtifact] =
        useState<Uint8Array<ArrayBufferLike> | null>(null)
    const [errorMsg, setErrorMsg] = useState<string>("")
    const { t } = useTranslation("codepage")
    const handleRender = async () => {
        setRenderState("loading")
        setErrorMsg("")

        try {
            // 动态导入并初始化 typst.ts（全局单例）
            if (!globalTypst) {
                const { $typst } = await import("@myriaddreamin/typst.ts")

                // 只在第一次初始化时设置配置
                if (!typstInitialized) {
                    $typst.setCompilerInitOptions({
                        beforeBuild: [
                            loadFonts([], { assets: ["cjk", "text"] }),
                        ],
                        getModule: () =>
                            "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
                    })
                    typstInitialized = true
                }

                globalTypst = $typst
            }

            setRenderState("rendering")

            // 手动设置 Typst 文档的字体以防止汉字渲染出错
            const font_inject = `#set text(font: ("Noto Serif SC"))`
            const injected = `${font_inject}\n${props.code}`

            // 编译 Typst 代码
            const vec = await globalTypst.vector({
                mainContent: injected,
            })

            if (!vec) {
                throw new Error(t("preview.typst.error"))
            }
            setVectorArtifact(vec)
            setRenderState("success")
        } catch (error) {
            console.error("Typst rendering error:", error)
            setErrorMsg(String(error) || t("preview.typst.error_unknown"))
            setRenderState("error")
        }
    }

    const handleNoWarning = () => {
        localStorage.setItem("codeTypstPreviewNoWarning", "true")
        handleRender()
    }

    useEffect(() => {
        const noWarning = localStorage.getItem("codeTypstPreviewNoWarning")
        if (noWarning === "true") {
            handleRender()
        }
    }, [])

    if (renderState === "idle") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-muted-foreground">
                    {t("preview.typst.render_note")}{" "}
                </p>
                <div className={"flex gap-2"}>
                    <Button onClick={handleNoWarning} variant={"outline"}>
                        {t("preview.typst.no_warning")}
                    </Button>
                    <Button onClick={handleRender}>
                        {t("preview.typst.render")}
                    </Button>
                </div>
            </div>
        )
    }

    if (renderState === "loading") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">
                    {t("preview.typst.loading")}
                </p>
            </div>
        )
    }

    if (renderState === "rendering") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">
                    {t("preview.typst.rendering")}
                </p>
            </div>
        )
    }

    if (renderState === "error") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive max-w-md text-center">
                    <p className="font-semibold mb-2">
                        {t("preview.typst.render_error")}
                    </p>
                    <p className="text-sm">{errorMsg}</p>
                </div>
                <Button onClick={handleRender}>
                    {t("preview.typst.try_again")}
                </Button>
            </div>
        )
    }

    // renderState === "success"
    return (
        <div>
            {/** biome-ignore lint/style/noNonNullAssertion: if it is null then this will not even enter the DOM tree */}
            <TypstDocument artifact={vectorArtifact!}></TypstDocument>
        </div>
    )
}

export function PreviewBlock(props: {
    code: string
    language: "html" | "latex" | "markdown" | "typst"
    className?: string
}) {
    const previewElement = (() => {
        switch (props.language) {
            case "html":
                return <HtmlPreviewer code={props.code} />
            case "latex":
                return <LaTeXPreviewer code={props.code} />
            case "markdown":
                return <MarkdownPreviewer code={props.code} />
            case "typst":
                return <TypstPreviewer code={props.code} />
        }
    })()
    return (
        <div
            className={cn(
                "border border-border rounded-xl p-4 bg-card",
                props.language === "markdown" && "markdown-body",
                props.className,
            )}
        >
            {previewElement}
        </div>
    )
}
