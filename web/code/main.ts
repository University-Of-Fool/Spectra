import "./style.css";
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

try {
    const backend_data = JSON.parse(document.getElementById("spectra-data")!.textContent!)
    const codeblock = document.querySelector("#main-code-block code")! as HTMLElement;
    codeblock.classList.add(`language-${backend_data.language}`);
    hljs.highlightElement(codeblock);
} catch (_) {
}