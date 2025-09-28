import "../public/style.css"
import { render } from "react"
import { AuthCard } from "./components/AuthCard"
import { TopBar } from "./components/TopBar"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")

export function Dashboard() {
    return (
        <div className={"h-screen"}>
            <TopBar />
            <AuthCard />
        </div>
    )
}

render(<Dashboard />, root)
