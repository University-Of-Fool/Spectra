import { ThemeProvider } from "@/components/ThemeProvider"
import "../public/style.css"
import { render } from "preact"
import "../components/i18n"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { TopBarDiv, TopBarLogo } from "../components/TopBar"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")

function NotFound() {
    const { t } = useTranslation("not_found")
    return (
        <ThemeProvider>
            <div className={"h-screen"}>
                <TopBarDiv className="fixed">
                    <TopBarLogo></TopBarLogo>
                </TopBarDiv>

                <div className={"h-full flex items-center justify-center"}>
                    <div
                        className={
                            "not-dark:bg-white dark:bg-neutral-900 shadow-lg border-1 border-border rounded-lg p-8 flex flex-col items-center gap-4"
                        }
                    >
                        <div>
                            <div className={"text-4xl font-bold font-mono"}>
                                404
                            </div>
                        </div>
                        <div className={"opacity-75"}>{t("msg")}</div>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    )
}

render(
    <Suspense fallback={<div></div>}>
        <NotFound />
    </Suspense>,
    root,
)
