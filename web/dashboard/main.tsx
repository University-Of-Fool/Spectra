import { render } from "preact"
import { TopBar } from "./components/TopBar"
import { AreaOperation } from "./components/AreaOperation"
import { AreaShared } from "./components/AreaShared"

const root = document.getElementById("app")!

export function Dashboard() {
    return <div>
        <TopBar />
        <AreaOperation />
        <div className={"flex justify-center"}>
            <div className={"w-100 mt-20 mb-14 border-t-1 border-neutral-200"}></div>
        </div>
        <AreaShared />
    </div>
}

render(<Dashboard />, root)
