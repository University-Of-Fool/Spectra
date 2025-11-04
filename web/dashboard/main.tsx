import "../public/style.css"
import { render } from "preact"
import { createContext, useEffect, useState } from "react"
import { ThemeProvider } from "@/components/ThemeProvider"
import { Toaster } from "@/components/ui/sonner.tsx"
import { AreaFileShare } from "./components/AreaFileShare"
import { AreaOperation } from "./components/AreaOperation"
import { AreaPasteBin } from "./components/AreaPasteBin"
import { AreaShared } from "./components/AreaShared"
import { AreaShortUrl } from "./components/AreaShortUrl"
import { TopBar } from "./components/TopBar"
import { TransitionTabs } from "./HeightTransition"

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
    }) => {},
    sharedListUpdTrigger: (_: number) => {},
    sharedListUpd: 0,
    handleTabClick: (_: string) => {},
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

    // 拖拽文件到页面上时，自动切换到文件快传tab
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
    }, [])
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <AccountCtx.Provider
                value={{
                    value,
                    setValue,
                    sharedListUpdTrigger,
                    sharedListUpd,
                    handleTabClick,
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
                        <div className="w-100 mt-20 mb-20 border-t-1 border-foreground/20"></div>
                    </div>

                    {!value.loading && !value.isLoggedIn && (
                        <>
                            <div className="text-center opacity-25 text-sm mb-20">
                                要查看历史分享项目，请先登录。
                            </div>
                        </>
                    )}

                    {!value.loading && value.isLoggedIn && <AreaShared />}
                </div>
                <Toaster richColors></Toaster>
            </AccountCtx.Provider>
        </ThemeProvider>
    )
}

render(<Dashboard />, root)
