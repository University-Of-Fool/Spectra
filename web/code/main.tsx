import "../public/style.css"
import { render } from "preact"
import { Suspense, useState } from "react"
import { useTranslation } from "react-i18next"
import { ThemeProvider } from "@/components/ThemeProvider.tsx"
import { Toaster } from "@/components/ui/sonner.tsx"
import { cn } from "@/lib/utils.ts"
import { emptyLanguage, LANGS } from "../components/languages.ts"
import { TopBar } from "../components/TopBar.tsx"
import { TransitionHeight } from "../dashboard/HeightTransition.tsx"
import CodeBlock from "./components/CodeBlock.tsx"
import { PreviewBlock } from "./components/PreviewBlock.tsx"
import "../components/i18n"

// 将任意字符串转写成 Title Case，虽然我不知道它可能有什么用但以防万一
function capitalizeWords(str: string): string {
    const words = str.split(" ")
    const capitalizedWords = words.map((word) => {
        // Handle potential empty strings from multiple spaces
        if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        }
        return word
    })
    return capitalizedWords.join(" ")
}

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
    const { t } = useTranslation(["codepage", "languages"])
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

    const languageDef = LANGS[extraData.language] || emptyLanguage
    if (languageDef.id === "empty") {
        languageDef.id = extraData.language
        languageDef.displayName = capitalizeWords(extraData.language)
    }

    return (
        <ThemeProvider>
            <Suspense fallback={<div></div>}>
                <TopBar
                    name={backendData.creator_name}
                    avatar={backendData.creator_avatar}
                    page={"Clipboard"}
                />
                <div className={"flex justify-center"}>
                    <div className={"mx-10 mb-10 w-280"}>
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
                            {languageDef.previewable && (
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
                                                {preview
                                                    ? t("preview_collapse", {
                                                          language: t(
                                                              languageDef.displayName,
                                                              {
                                                                  ns: "languages",
                                                              },
                                                          ),
                                                      })
                                                    : t("preview_expand", {
                                                          language: t(
                                                              languageDef.displayName,
                                                              {
                                                                  ns: "languages",
                                                              },
                                                          ),
                                                      })}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            <CodeBlock
                                code={backendData.content}
                                language={extraData.language}
                                wrap={languageDef.wrap}
                            />
                        </div>
                    </div>
                </div>
                <Toaster richColors></Toaster>
            </Suspense>
        </ThemeProvider>
    )
}

function App() {
    return (
        <Suspense fallback={<div></div>}>
            <Main />
        </Suspense>
    )
}

const app = document.getElementById("app")
if (!app) throw new Error("app is empty")

render(<App />, app)
