import { render } from "preact"
import { TopBar } from "./components/TopBar"
import { AuthCard } from "./components/AuthCard"

const root = document.getElementById("app")!

export function Dashboard() {
    return <div className={"h-screen"}>
        <TopBar />
        <AuthCard />
    </div>
}

render(<Dashboard />, root)
