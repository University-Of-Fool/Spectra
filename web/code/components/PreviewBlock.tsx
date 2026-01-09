import { MathJax, MathJaxContext } from "better-react-mathjax"
import ghCssSystem from "github-markdown-css/github-markdown.css?url"
import ghCssDark from "github-markdown-css/github-markdown-dark.css?url"
import ghCssLight from "github-markdown-css/github-markdown-light.css?url"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/components/ThemeProvider.tsx"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { TypstDocument } from "./TypstDocument"

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

        // 请求 GitHub 的 Markdown 渲染 API
        ;(async () => {
            try {
                const resp = await fetch("https://api.github.com/markdown", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "text/html",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                    body: JSON.stringify({
                        text: props.code,
                    }),
                })
                if (resp.ok) {
                    const html = await resp.text()
                    // 存储到缓存
                    mdRenderCache.set(props.code, html)
                    setMdHtml(html)
                }
            } finally {
                isLoadingRef.current = false
            }
        })()
    }, [props.code])

    return (
        <>
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
                // biome-ignore lint/security/noDangerouslySetInnerHtml: 🤔我觉得 GitHub API 是值得信任的（？
                dangerouslySetInnerHTML={{ __html: mdHtml }}
            ></div>
        </>
    )
}

function LaTeXPreviewer(props: { code: string }) {
    // 防止脚本注入
    let code = props.code.replaceAll(/<script[\s\S]*<\/script>/g, "")
    // 防止样式注入
    code = code.replaceAll(/<style[\s\S]*<\/style>/g, "")
    // 防止 <link> 注入
    code = code.replaceAll(/<link[\s\S]*?>/g, "")

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

    code = `<style> .spectra-preview-latex > p {margin-bottom: 0.2em;}</style>${code}`
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
                        注意：此处只支持预览 LaTeX
                        中的数学公式效果。若要预览页面完整的渲染效果，请使用专业
                        LaTeX 编辑器。
                    </div>
                    <div
                        className={"spectra-preview-latex "}
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
        "idle" | "countdown" | "loading" | "rendering" | "success" | "error"
    >("idle")
    const [vectorArtifact, setVectorArtifact] =
        useState<Uint8Array<ArrayBufferLike> | null>(null)
    const [errorMsg, setErrorMsg] = useState<string>("")
    const [progress, setProgress] = useState(100)
    const countdownTimerRef = useRef<number | null>(null)
    const progressIntervalRef = useRef<number | null>(null)

    const startCountdown = () => {
        setRenderState("countdown")
        setProgress(100)

        // 进度条动画（1.5秒，每15ms更新一次）
        progressIntervalRef.current = window.setInterval(() => {
            setProgress((prev) => {
                const next = prev - 1
                return next >= 100 ? 100 : next
            })
        }, 15)

        // 1.5秒后开始渲染
        countdownTimerRef.current = window.setTimeout(() => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
            }
            handleRender()
        }, 1500)
    }

    const cancelCountdown = () => {
        if (countdownTimerRef.current) {
            clearTimeout(countdownTimerRef.current)
            countdownTimerRef.current = null
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
        }
        setProgress(0)
        setRenderState("idle")
    }

    // 清理定时器
    useEffect(() => {
        startCountdown()
        return () => {
            if (countdownTimerRef.current) {
                clearTimeout(countdownTimerRef.current)
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
            }
        }
    }, [])

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
                        getModule: () =>
                            "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
                    })
                    typstInitialized = true
                }

                globalTypst = $typst
            }

            setRenderState("rendering")

            // 编译 Typst 代码
            const vec = await globalTypst.vector({
                mainContent: props.code,
            })

            if (!vec) {
                throw new Error("无法生成预览内容，请检查 Typst 代码是否正确。")
            }
            setVectorArtifact(vec)
            setRenderState("success")
        } catch (error) {
            console.error("Typst rendering error:", error)
            setErrorMsg(error instanceof Error ? error.message : "未知渲染错误")
            setRenderState("error")
        }
    }

    if (renderState === "idle") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-muted-foreground">
                    点击下方按钮以渲染 Typst 文档预览
                </p>
                <Button onClick={startCountdown}>渲染预览</Button>
            </div>
        )
    }

    if (renderState === "countdown") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 max-w-md w-full mx-auto">
                <p className="text-muted-foreground">
                    准备渲染中... ({((progress / 100) * 1.5).toFixed(1)}s)
                </p>
                <Progress value={progress} max={100} className="w-full" />
                <Button variant="outline" onClick={cancelCountdown}>
                    取消
                </Button>
            </div>
        )
    }

    if (renderState === "loading") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">
                    正在加载 Typst 渲染引擎...
                </p>
            </div>
        )
    }

    if (renderState === "rendering") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">正在渲染文档...</p>
            </div>
        )
    }

    if (renderState === "error") {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive max-w-md">
                    <p className="font-semibold mb-2">渲染失败</p>
                    <p className="text-sm">{errorMsg}</p>
                </div>
                <Button onClick={startCountdown}>重试</Button>
            </div>
        )
    }

    // renderState === "success"
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Typst 文档预览</p>
                <Button variant="secondary" size="sm" onClick={startCountdown}>
                    重新渲染
                </Button>
            </div>

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
                "border border-border rounded-xl p-4 bg-card mb-6",
                props.language === "markdown" && "markdown-body",
                props.className,
            )}
        >
            {previewElement}
        </div>
    )
}
