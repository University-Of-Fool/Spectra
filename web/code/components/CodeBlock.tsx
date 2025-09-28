import hljs from "highlight.js/lib/core"
import { useEffect, useRef, useState } from "react"
import { HLJS_LANGS } from "../hljs.ts"
import { toast } from "sonner"

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
    const [lineRects, setLineRects] = useState<
        { top: number; height: number }[]
    >([])

    useEffect(() => {
        let active = true

        ;(async () => {
            const loader = HLJS_LANGS[language]
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
            codeEl.querySelectorAll(".temp-line").forEach((el) => el.remove())

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
            const rects = tempSpans.map((span) => {
                const r = span.getBoundingClientRect()
                return { top: r.top - preRect.top, height: r.height }
            })
            setLineRects(rects)

            setLineHeights(tempSpans.map((span) => span.offsetHeight))

            // 移除临时span
            tempSpans.forEach((span) => span.remove())
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
                    setHighlightLine(parseInt(hash.slice(2)) - 1)
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
        navigator.clipboard.writeText(url.toString())
        history.replaceState(null, "", url.toString())
        setHighlightLine(lineNumber)
        toast.success(`已复制锚点位置: ${url.toString()}`)
    }

    useEffect(() => {
        const bar = document.getElementById("highlight-bar")!
        bar.style.backgroundColor = "rgba(255, 255, 0, 0.25)"
        bar.style.transition = ""
        const timeout = setTimeout(() => {
            bar.style.backgroundColor = "rgba(255, 255, 0, 0)"
            bar.style.transition = "background-color 1s ease"
        }, 3000)
        return () => clearTimeout(timeout)
    }, [highlightLine])

    useEffect(() => {
        console.log(lineHeights)
    }, [lineHeights])
    useEffect(() => {
        console.log(lineRects)
    }, [lineRects])

    return (
        <>
            <pre
                ref={preRef}
                className={`hljs ${language} rounded-xl relative`}
                style={{
                    display: "flex",
                    overflowX: wrap ? "hidden" : "auto",
                    whiteSpace: wrap ? "pre-wrap" : "pre",
                    padding: 0,
                }}
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
                        mixBlendMode: "multiply",
                    }}
                />
            </pre>
        </>
    )
}
