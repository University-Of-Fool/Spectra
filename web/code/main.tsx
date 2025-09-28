import "../public/style.css"
import "highlight.js/styles/github.css"
import { render } from "preact"
import { Toaster } from "@/components/ui/sonner.tsx"
import { TopBar } from "../components/TopBar.tsx"
import CodeBlock from "./components/CodeBlock.tsx"

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
    return (
        <>
            <TopBar
                name={backendData.creator_name}
                avatar={backendData.creator_avatar}
                page={"Code"}
            />
            <div className={"flex justify-center"}>
                <div className={"mx-10 mb-10 w-280"}>
                    {extraData.title && (
                        <div
                            className={
                                "flex items-baseline mb-2 mx-1 font-mono"
                            }
                        >
                            <div className={"text-lg opacity-100"}>
                                {extraData.title}
                            </div>
                            <div className={"text-sm opacity-75 ml-auto"}>
                                {extraData.language}
                            </div>
                        </div>
                    )}
                    <div>
                        <CodeBlock
                            code={backendData.content}
                            language={extraData.language}
                            wrap={extraData.language === "text"}
                        />
                    </div>
                </div>
            </div>
            <Toaster richColors></Toaster>
        </>
    )
}

const app = document.getElementById("app")
if (!app) throw new Error("app is empty")
render(<Main />, app)
