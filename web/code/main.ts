// biome-ignore-all lint: this file is not usable

import "./style.css"
import hljs from "highlight.js"
import "highlight.js/styles/github.css"

try {
    const backend_data = JSON.parse(
        document.getElementById("spectra-data")!.textContent || "{}",
    )
    const codeblock = document.querySelector<HTMLElement>(
        "#main-code-block code",
    )
    codeblock?.classList.add(`language-${backend_data.language}`)
    hljs.highlightElement(codeblock!)
} catch (_) {}
