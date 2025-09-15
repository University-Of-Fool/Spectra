import { render } from "preact"
import { TopBar } from "./components/TopBar"
import { AreaOperation } from "./components/AreaOperation"
import { AreaShared } from "./components/AreaShared"
import { AreaFileShare } from "./components/AreaFileShare"
import { AreaPasteBin } from "./components/AreaPasteBin"
import { AreaShortUrl } from "./components/AreaShortUrl"
import { useState } from "preact/hooks"

const root = document.getElementById("app")!

export function Dashboard() {
    const [activeTab, setActiveTab] = useState("fileShare")
    const handleTabClick = (tab: string) => {
        setActiveTab(tab)
    }
    return <div>
        <TopBar />

        {activeTab === "operation" && <AreaOperation handleTabClick={handleTabClick} />}
        {activeTab === "fileShare" && <AreaFileShare />}
        {activeTab === "pasteBin" && <AreaPasteBin />}
        {activeTab === "shortUrl" && <AreaShortUrl />}

        <div className={"flex justify-center"}>
            <div className={"w-100 mt-20 mb-14 border-t-1 border-neutral-200"}></div>
        </div>

        <AreaShared />

    </div>
}

render(<Dashboard />, root)
