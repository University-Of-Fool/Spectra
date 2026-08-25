import "../public/style.css"
import { render } from "preact"
import { createContext, Suspense, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ThemeProvider } from "@/components/ThemeProvider"
import { Toaster } from "@/components/ui/sonner.tsx"
import { TransitionTabs } from "../components/HeightTransition"
import { AreaFileShare } from "./components/AreaFileShare"
import { AreaOperation } from "./components/AreaOperation"
import { AreaPasteBin } from "./components/AreaPasteBin"
import { AreaShared } from "./components/AreaShared"
import { AreaShortUrl } from "./components/AreaShortUrl"
import { TopBar } from "./components/TopBar"
import "../components/i18n"
import { AboutDialog } from "./components/AboutDialog"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")

export const AccountCtx = createContext({
    value: {
        isLoggedIn: false,
        loading: true,
        name: "",
        avatar_url: "",
        turnstile_enabled: false,
        turnstile_site_key: "",
    },
    setValue: (_: {
        isLoggedIn: boolean
        loading: boolean
        name: string
        avatar_url: string
        turnstile_enabled: boolean
        turnstile_site_key: string
    }) => { },
    sharedListUpdTrigger: (_: number) => { },
    sharedListUpd: 0,
    handleTabClick: (_: string) => { },
    // 通过 Ctrl-V 全局粘贴时待填入的数据，由 main 监听 paste 事件写入，
    // 各 area 组件消费后置空
    pasteFile: null as File | null,
    setPasteFile: (_: File | null) => { },
    pasteText: "",
    setPasteText: (_: string) => { },
    // 子组件当前是否已有内容（用于判断是否响应 Ctrl-V 覆盖）
    hasFileContent: false,
    setHasFileContent: (_: boolean) => { },
    hasTextContent: false,
    setHasTextContent: (_: boolean) => { },
})

export function Dashboard() {
    const [value, setValue] = useState({
        isLoggedIn: false,
        loading: true,
        name: "",
        avatar_url: "",
        turnstile_enabled: false,
        turnstile_site_key: "",
    })
    const [sharedListUpd, sharedListUpdTrigger] = useState(0)

    const [activeTab, setActiveTab] = useState("operation")
    const handleTabClick = (tab: string) => {
        setActiveTab(tab)
    }
    const { t } = useTranslation(["dashboard", "languages"])

    // 通过 Ctrl-V 粘贴时，根据剪贴板内容自动切换到对应 tab 并传入数据
    const [pasteFile, setPasteFile] = useState<File | null>(null)
    const [pasteText, setPasteText] = useState("")
    // 记录子组件当前是否已有内容，用于决定 Ctrl-V 是否允许覆盖
    const [hasFileContent, setHasFileContent] = useState(false)
    const [hasTextContent, setHasTextContent] = useState(false)

    // 拖拽文件到页面上时，自动切换到文件传输tab
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault()
            if (e.dataTransfer?.types.includes("Files")) {
                setActiveTab("fileShare")
            }
        }

        window.addEventListener("dragover", handleDragOver)

        return () => {
            window.removeEventListener("dragover", handleDragOver)
        }
    }, [pasteFile, pasteText])

    // 全局监听 ESC，从任何 tab 返回到 Operation tab
    useEffect(() => {
        const handleEscKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || activeTab === "operation") {
                return
            }
            setActiveTab("operation")
        }
        window.addEventListener("keydown", handleEscKeyDown)
        return () => {
            window.removeEventListener("keydown", handleEscKeyDown)
        }
    })

    // 全局监听 Ctrl-V，根据剪贴板内容切换 tab 并填入
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            // 如果在输入框/文本域等可编辑元素内粘贴，交由浏览器原生处理
            const target = e.target as HTMLElement | null
            const tag = target?.tagName?.toLowerCase()
            if (
                target?.isContentEditable ||
                tag === "input" ||
                tag === "textarea" ||
                tag === "select" ||
                target?.getAttribute("role") === "textbox"
            ) {
                return
            }

            // 优先处理文件类型
            const items = e.clipboardData?.items
            if (items) {
                for (const item of Array.from(items)) {
                    if (item.kind !== "file") {
                        continue
                    }
                    const file = item.getAsFile()
                    if (!file) {
                        continue
                    }
                    // 忽略文件夹，仅处理单个普通文件
                    const entry = item.webkitGetAsEntry?.()
                    if (entry?.isDirectory) {
                        continue
                    }
                    if (activeTab === "fileShare" && !hasFileContent) {
                        setActiveTab("fileShare")
                        setPasteFile(file)
                    } else if (activeTab === "operation") {
                        setActiveTab("fileShare")
                        setPasteFile(file)
                    }
                    return
                }
            }

            // 否则读取文本
            const text = e.clipboardData?.getData("text") ?? ""
            if (text) {
                if (activeTab === "pasteBin" && !hasTextContent) {
                    setActiveTab("pasteBin")
                    setPasteText(text)
                } else if (activeTab === "operation") {
                    setActiveTab("pasteBin")
                    setPasteText(text)
                }
            }
        }
        window.addEventListener("paste", handlePaste)
        return () => {
            window.removeEventListener("paste", handlePaste)
        }
    }, [activeTab, hasFileContent, hasTextContent])
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <AccountCtx.Provider
                value={{
                    value,
                    setValue,
                    sharedListUpdTrigger,
                    sharedListUpd,
                    handleTabClick,
                    pasteFile,
                    setPasteFile,
                    pasteText,
                    setPasteText,
                    hasFileContent,
                    setHasFileContent,
                    hasTextContent,
                    setHasTextContent,
                }}
            >
                <div>
                    <TopBar />

                    <TransitionTabs
                        activeKey={activeTab}
                        tabs={[
                            {
                                key: "operation",
                                node: <AreaOperation />,
                            },
                            {
                                key: "fileShare",
                                node: <AreaFileShare />,
                            },
                            {
                                key: "pasteBin",
                                node: <AreaPasteBin />,
                            },
                            {
                                key: "shortUrl",
                                node: <AreaShortUrl />,
                            },
                        ]}
                    />

                    <div className="flex justify-center">
                        <div className="w-50 md:w-100 mt-20 mb-20 border-t border-foreground/20"></div>
                    </div>

                    {!value.loading && !value.isLoggedIn && (
                        <>
                            <div className="text-center opacity-25 text-sm mb-20">
                                {t("dashboard.unlogon_notice")}
                            </div>
                        </>
                    )}

                    {!value.loading && value.isLoggedIn && <AreaShared />}

                    <AboutDialog></AboutDialog>
                </div>
                <Toaster richColors></Toaster>
            </AccountCtx.Provider>
        </ThemeProvider>
    )
}

render(
    <Suspense fallback={<div />}>
        <Dashboard />
    </Suspense>,
    root,
)
