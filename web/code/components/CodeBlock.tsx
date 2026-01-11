import hljs from "highlight.js/lib/core"
import githubLight from "highlight.js/styles/github.min.css?url"
import githubDark from "highlight.js/styles/github-dark.min.css?url"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useTheme } from "@/components/ThemeProvider.tsx"
import { Button } from "@/components/ui/button.tsx"
import { cn } from "@/lib/utils.ts"
import { LANGS } from "../../components/languages.ts"

interface CodeBlockProps {
    code: string
    language: string
    wrap?: boolean // 是否允许自动换行
}

export default function CodeBlock({
    code,
    language,
    wrap = false,
}: CodeBlockProps) {
    const preRef = useRef<HTMLPreElement>(null)
    const codeRef = useRef<HTMLElement>(null)
    const [lineHeights, setLineHeights] = useState<number[]>([])
    const [highlightLine, setHighlightLine] = useState<number | null>(null)
    const [copyIconContent, setCopyIconContent] = useState("content_copy")
    const [copyButtonVisibility, setCopyButtonVisibility] = useState(false)
    const { t } = useTranslation("codepage")
    let { theme } = useTheme()
    if (theme === "system") {
        const root = document.documentElement
        const isDark = root.classList.contains("dark")
        theme = isDark ? "dark" : "light"
    }

    useEffect(() => {
        let active = true

        ;(async () => {
            // 动态加载语言模块
            const loader = LANGS[language]?.hljsFunction
            if (!loader) {
                console.warn(`Unsupported language: ${language}`)
                return
            }

            const langModule = await loader()
            hljs.registerLanguage(language, langModule.default)

            if (active && codeRef.current) {
                hljs.highlightElement(codeRef.current)
            }
        })()

        return () => {
            active = false
        }
    }, [language, code])

    useEffect(() => {
        const updateLineHeights = () => {
            if (!preRef.current) return
            if (!codeRef.current) return

            const codeEl = preRef.current.querySelector("code")
            if (!codeEl) return

            const lines = code.split("\n")
            const tempSpans: HTMLSpanElement[] = []

            // 清理之前的临时span
            for (const el of codeEl.querySelectorAll(".temp-line")) {
                el.remove()
            }

            const fragment = document.createDocumentFragment()

            lines.forEach((line) => {
                const span = document.createElement("span")
                span.className = "temp-line"
                span.style.display = "block"
                span.style.visibility = "hidden"
                span.textContent = line || "\n"
                fragment.appendChild(span)
                tempSpans.push(span)
            })

            codeEl.appendChild(fragment)

            // 计算相对于 pre 的 top 和 height
            const preRect = codeRef.current.getBoundingClientRect()
            //const rects =
            tempSpans.map((span) => {
                const r = span.getBoundingClientRect()
                return { top: r.top - preRect.top, height: r.height }
            })
            //setLineRects(rects)

            setLineHeights(tempSpans.map((span) => span.offsetHeight))

            // 移除临时span
            for (const span of tempSpans) {
                span.remove()
            }
        }

        updateLineHeights()
        window.addEventListener("resize", updateLineHeights)
        return () => window.removeEventListener("resize", updateLineHeights)
    }, [code, wrap])

    useEffect(() => {
        const scrollToHash = () => {
            const hash = window.location.hash
            if (hash) {
                const el = document.getElementById(hash.slice(1))
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" })
                    setHighlightLine(parseInt(hash.slice(2), 10) - 1)
                }
            }
        }

        // 延迟执行，保证高亮完成
        const timeout = setTimeout(scrollToHash, 50)

        return () => clearTimeout(timeout)
    }, [code]) // 每次 code 更新都尝试滚动

    const handleLineClick = (lineNumber: number) => {
        const url = new URL(window.location.href)
        url.hash = `L${lineNumber + 1}` // 生成锚点
        void navigator.clipboard.writeText(url.toString())
        history.replaceState(null, "", url.toString())
        setHighlightLine(lineNumber)
        toast.success(
            t("codeblock.anchor_copied", { line: (lineNumber + 1).toString() }),
        )
    }

    useEffect(() => {
        const bar = document.getElementById("highlight-bar")
        if (!bar) return
        bar.style.backgroundColor = "rgba(255, 255, 0, 0.25)"
        bar.style.transition = ""
        const timeout = setTimeout(() => {
            bar.style.backgroundColor = "rgba(255, 255, 0, 0)"
            bar.style.transition = "background-color 1s ease"
        }, 3000)
        return () => clearTimeout(timeout)
    }, [highlightLine])

    // 处理 Ctrl+A/Cmd+A，只选择代码内容
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "a") {
            e.preventDefault()
            selectCodeContent()
        }
    }

    // 选择代码内容
    const selectCodeContent = () => {
        if (!codeRef.current) return
        const selection = window.getSelection()
        if (!selection) return
        const range = document.createRange()
        range.selectNodeContents(codeRef.current)
        selection.removeAllRanges()
        selection.addRange(range)
    }

    return (
        <div>
            <link
                rel={"stylesheet"}
                href={theme === "dark" ? githubDark : githubLight}
            />
            <pre
                ref={preRef}
                // 这里的 language 不是 Tailwind 类名，故不应用 cn()
                className={`hljs ${language} rounded-xl relative border border-border`}
                style={{
                    display: "flex",
                    overflowX: wrap ? "hidden" : "auto",
                    whiteSpace: wrap ? "pre-wrap" : "pre",
                    padding: 0,
                }}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onMouseEnter={() => setCopyButtonVisibility(true)}
                onMouseLeave={() => setCopyButtonVisibility(false)}
            >
                <div
                    className={"pl-6 p-4 opacity-50"}
                    style={{
                        textAlign: "right",
                        userSelect: "none",
                    }}
                >
                    {lineHeights.map((h, i) => (
                        <div
                            className={"cursor-pointer"}
                            // We don’t recommend using indexes for keys if the order of items **may change**
                            //                                                                  -- React documentation
                            // biome-ignore lint/suspicious/noArrayIndexKey: the array here won't change
                            key={i}
                            style={{ height: h }}
                            id={`L${i + 1}`}
                            onClick={() => handleLineClick(i)}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>
                <code
                    ref={codeRef}
                    className={"hljs p-4 flex-1 overflow-hidden"}
                >
                    {code}
                </code>
                <div
                    id="highlight-bar"
                    style={{
                        display: highlightLine !== null ? "block" : "none",
                        position: "absolute",
                        top:
                            lineHeights
                                .slice(
                                    0,
                                    highlightLine !== null ? highlightLine : 0,
                                )
                                .reduce((sum, h) => sum + h, 0) + 16,
                        left: 0,
                        width: "100%",
                        height: lineHeights[
                            highlightLine !== null ? highlightLine : 0
                        ],
                        backgroundColor: "rgba(255, 255, 0, 0)",
                        pointerEvents: "none",
                        transition: "",
                        mixBlendMode: theme === "dark" ? "normal" : "multiply",
                    }}
                />
                <Button
                    className={cn(
                        "absolute right-3 top-3",
                        copyButtonVisibility ? "opacity-100" : "opacity-50",
                    )}
                    variant={"outline"}
                    size={"icon"}
                    onClick={() => {
                        // 复制内容到剪贴板
                        void navigator.clipboard.writeText(code)
                        setCopyIconContent("check")
                        setTimeout(
                            () => setCopyIconContent("content_copy"),
                            2000,
                        )
                    }}
                >
                    <span
                        className={cn(
                            "material-symbols-outlined text-sm",
                            copyIconContent === "check" ? "text-green-500" : "",
                        )}
                    >
                        {copyIconContent}
                    </span>
                </Button>
            </pre>
        </div>
    )
}
