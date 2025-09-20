import { render } from "preact"
import { TopBar } from "./components/TopBar"
import { AreaOperation } from "./components/AreaOperation"
import { AreaShared } from "./components/AreaShared"
import { AreaFileShare } from "./components/AreaFileShare"
import { AreaPasteBin } from "./components/AreaPasteBin"
import { AreaShortUrl } from "./components/AreaShortUrl"
import { useState } from "preact/hooks"
import { TransitionTabs } from "./HeightTransition"

const root = document.getElementById("app")!

export function Dashboard() {
    const [activeTab, setActiveTab] = useState("fileShare")
    const handleTabClick = (tab: string) => {
        setActiveTab(tab)
    }
    return <div>
        <TopBar />

        <TransitionTabs activeKey={activeTab} children={[
            { key: "operation", node: <AreaOperation handleTabClick={handleTabClick} /> },
            { key: "fileShare", node: <AreaFileShare handleTabClick={handleTabClick} /> },
            { key: "pasteBin", node: <AreaPasteBin handleTabClick={handleTabClick} /> },
            { key: "shortUrl", node: <AreaShortUrl handleTabClick={handleTabClick} /> },
        ]} />


        <div className={"flex justify-center"}>
            <div className={"w-100 mt-20 mb-14 border-t-1 border-neutral-200"}></div>
        </div>

        <AreaShared />

    </div>
}

render(<Dashboard />, root)
