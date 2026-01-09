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
    return (
        <ThemeProvider>
            <TopBar
                name={backendData.creator_name}
                avatar={backendData.creator_avatar}
                page={"Code"}
            />
            <div className={"flex justify-center"}>
                <div className={"mx-10 mb-10 w-280"}>
                    {(LANGS_PREVIEW_ABLE.has(extraData.language) ||
                        extraData.title) && (
                        <div
                            className={
                                "flex items-baseline mb-2 mx-1 font-mono"
                            }
                        >
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
                                <span
                                    className={"text-sm text-muted-foreground"}
                                >
                                    {extraData.language}
                                </span>
                                <span className="ml-2 mr-2 text-muted-foreground">
                                    ·
                                </span>
                                <span
                                    className={cn(
                                        "text-sm text-muted-foreground cursor-pointer hover:underline transition",
                                        preview && "text-foreground",
                                    )}
                                    onClick={() => {
                                        setPreview(!preview)
                                    }}
                                >
                                    preview
                                </span>
                            </div>
                        </div>
                    )}

                    <div>
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
                                        className={"mb-0"}
                                    />
                                    <div className={"h-6"} />
                                </>
                            ) : null}
                        </TransitionHeight>
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
