import "../components/i18n"
import "../public/style.css"
import { render } from "preact"
import { Suspense, useState } from "react"
import { useTranslation } from "react-i18next"
import { ThemeProvider } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import { SpectraLogo } from "../components/Logo"
import { DebugInfo } from "./components/DebugInfo"
import { Overview } from "./components/Overview"
import { Settings } from "./components/Settings"
import { SharedContent } from "./components/SharedContent"
import { UserManagement } from "./components/UserManagement"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")

function Admin() {
    const { t } = useTranslation("admin")
    const [activeTab, setActiveTab] = useState("overview")
    return (
        <ThemeProvider>
            <div className="h-screen">
                <div
                    className={
                        "fixed flex items-center p-10 px-15 bg-gradient-to-b from-background to-transparent from-25% top-0 left-0 w-full z-50"
                    }
                >
                    <SpectraLogo className="h-12 mr-4" />

                    <div className="text-xl font-mono font-medium">
                        Spectra.Admin
                    </div>

                    <div className="ml-auto">
                        <Button
                            variant="outline"
                            onClick={() => {
                                location.href = "/"
                            }}
                        >
                            <span
                                className={
                                    "material-symbols-outlined text-[1.6em]!"
                                }
                            >
                                arrow_back
                            </span>
                            {t("button_back_to_home")}
                        </Button>
                    </div>
                </div>
                <div className="mt-36 flex justify-center">
                    <div className="flex items-start w-250">
                        <div className="flex flex-col items-start gap-1 border-r pr-4">
                            <div className="flex items-center">
                                <Button
                                    variant={
                                        activeTab === "overview"
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    onClick={() => setActiveTab("overview")}
                                >
                                    {t("button_overview")}
                                </Button>
                            </div>

                            <div className="flex items-center">
                                <Button
                                    variant={
                                        activeTab === "shared_content"
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    onClick={() =>
                                        setActiveTab("shared_content")
                                    }
                                >
                                    {t("button_shared_content")}
                                </Button>
                            </div>

                            <div className="flex items-center">
                                <Button
                                    variant={
                                        activeTab === "user_management"
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    onClick={() =>
                                        setActiveTab("user_management")
                                    }
                                >
                                    {t("button_user_management")}
                                </Button>
                            </div>

                            <div className="flex items-center">
                                <Button
                                    variant={
                                        activeTab === "system_settings"
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    onClick={() =>
                                        setActiveTab("system_settings")
                                    }
                                >
                                    {t("button_system_settings")}
                                </Button>
                            </div>

                            <div className="flex items-center">
                                <Button
                                    variant={
                                        activeTab === "debug_info"
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    onClick={() => setActiveTab("debug_info")}
                                >
                                    {t("button_debug_info")}
                                </Button>
                            </div>
                        </div>

                        {activeTab === "overview" && <Overview />}
                        {activeTab === "shared_content" && <SharedContent />}
                        {activeTab === "user_management" && <UserManagement />}
                        {activeTab === "system_settings" && <Settings />}
                        {activeTab === "debug_info" && <DebugInfo />}
                    </div>
                </div>
            </div>
        </ThemeProvider>
    )
}

render(
    <Suspense fallback={<div></div>}>
        <Admin />
    </Suspense>,
    root,
)
