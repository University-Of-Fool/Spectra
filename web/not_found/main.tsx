import { ThemeProvider } from "@/components/ThemeProvider"
import "../public/style.css"
import { render } from "preact"
import { SpectraLogo } from "../components/Logo"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")

function NotFound() {
    return (
        <ThemeProvider>
            <div className={"h-screen"}>
                <div
                    className={
                        "fixed flex items-center p-10 px-15 bg-gradient-to-b from-background to-transparent from-25% top-0 left-0 w-full z-50"
                    }
                >
                    <SpectraLogo className={"h-12 mr-4"} />

                    <div className={"text-xl font-mono font-medium"}>
                        Spectra
                    </div>
                </div>

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
                        <div className={"opacity-75"}>
                            当前访问的内容不存在或已过期
                        </div>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    )
}

render(<NotFound />, root)
