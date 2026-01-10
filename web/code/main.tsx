import "../public/style.css"
import { render } from "preact"
import { useState } from "react"
import { ThemeProvider } from "@/components/ThemeProvider.tsx"
import { Toaster } from "@/components/ui/sonner.tsx"
import { cn } from "@/lib/utils.ts"
import { TopBar } from "../components/TopBar.tsx"
import { TransitionHeight } from "../dashboard/HeightTransition.tsx"
import CodeBlock from "./components/CodeBlock.tsx"
import { PreviewBlock } from "./components/PreviewBlock.tsx"

const LANGS_SHOULD_WRAP = new Set(["text", "markdown", "typst", "latex"])
const LANGS_PREVIEW_ABLE = new Set(["markdown", "html", "latex", "typst"])

const backendData = JSON.parse(
    document.getElementById("spectra-data")?.textContent || "{}",
) as {
    content: string
    extra_data: string
    creator_name: string
    creator_avatar: string | null
}
if (!backendData) throw new Error("backendData is empty")
const extraData = JSON.parse(backendData.extra_data) as {
    language: string
    title: string
}

function Main() {
    const [preview, setPreview] = useState(false)

    function switchPreview() {
        setPreview(!preview)
        if (preview) {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            })
        }
    }

    return (
        <ThemeProvider>
            <TopBar
                name={backendData.creator_name}
                avatar={backendData.creator_avatar}
                page={"Clipboard"}
            />
            <div className={"flex justify-center"}>
                <div className={"mx-10 mb-10 w-280"}>
                    <div className={"flex items-baseline mb-2 mx-1 font-mono"}>
                        <div
                            className={cn(
                                "text-lg",
                                // 保持这一行的高度一致，同时不显示标题具体内容
                                !extraData.title && "opacity-0",
                            )}
                        >
                            {extraData.title || "Untitled"}
                        </div>
                        <div className={"ml-auto"}>
                            <span className={"text-sm text-muted-foreground"}>
                                {extraData.language}
                            </span>
                        </div>
                    </div>

                    <TransitionHeight>
                        {preview ? (
                            <>
                                <PreviewBlock
                                    code={backendData.content}
                                    language={
                                        extraData.language as
                                            | "html"
                                            | "latex"
                                            | "markdown"
                                            | "typst"
                                    }
                                />
                                <div className={"h-4"}></div>
                            </>
                        ) : null}
                    </TransitionHeight>
                    <div className="flex flex-col gap-4">
                        {LANGS_PREVIEW_ABLE.has(extraData.language) && (
                            <>
                                <div
                                    className={
                                        "border border-border rounded-xl p-4 bg-card cursor-pointer"
                                    }
                                    onClick={() => {
                                        switchPreview()
                                    }}
                                >
                                    <div
                                        className={
                                            "flex align-center justify-center gap-2 my-2"
                                        }
                                    >
                                        <span
                                            className={
                                                "material-symbols-outlined"
                                            }
                                        >
                                            {preview
                                                ? "arrow_upward"
                                                : "arrow_downward"}
                                        </span>
                                        <div>
                                            {preview ? "收起" : "展开"}{" "}
                                            {extraData.language} 预览
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                        <CodeBlock
                            code={backendData.content}
                            language={extraData.language}
                            wrap={LANGS_SHOULD_WRAP.has(extraData.language)}
                        />
                    </div>
                </div>
            </div>
            <Toaster richColors></Toaster>
        </ThemeProvider>
    )
}

const app = document.getElementById("app")
if (!app) throw new Error("app is empty")
render(<Main />, app)
