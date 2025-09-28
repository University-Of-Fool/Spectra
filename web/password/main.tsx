import "../public/style.css"
import { render } from "react"
import { TopBar } from "../components/TopBar.tsx"
import { AuthCard } from "./components/AuthCard"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")
const backendDataElement = document.getElementById("spectra-data")
if (!backendDataElement)
    throw new Error("Launch failed: spectra-data element not found")
const backendData: {
    error: boolean
    path_name: string
    creator_name: string
    creator_avatar: string | null
} = JSON.parse(backendDataElement.innerText)
console.log(backendData)
export function Dashboard() {
    return (
        <div className={"h-screen"}>
            <TopBar
                className={"fixed"}
                name={backendData.creator_name}
                avatar={backendData.creator_avatar}
                page={"Auth"}
            />
            <AuthCard error={backendData.error} />
        </div>
    )
}

render(<Dashboard />, root)
