// biome-ignore-all lint: this file is not usable

import "../public/style.css"
import "highlight.js/styles/github.css"
import {render} from "preact"
import CodeBlock from "./components/CodeBlock.tsx"

const backend_data = JSON.parse(
    document.getElementById("spectra-data")!.textContent || "{}",
) as {
    content: string
    extra_data: string
}
const extra_data = JSON.parse(backend_data.extra_data) as {
    language: string
    title: string
}

function Main() {
    return (
        <div>
            <h1>{extra_data.title}</h1>
            <CodeBlock
                code={backend_data.content}
                language={extra_data.language}
            />
        </div>
    )
}

const app = document.getElementById("app")
if (!app) throw new Error("app not found")
render(<Main/>, app)
