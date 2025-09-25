import hljs from "highlight.js/lib/core"
import { useEffect, useRef } from "react"
import { HLJS_LANGS } from "../hljs.ts"

export default function CodeBlock({
    code,
    language,
}: {
    code: string
    language: string
}) {
    const codeRef = useRef<HTMLElement>(null)

    useEffect(() => {
        let active = true

        ;(async () => {
            const loader = HLJS_LANGS[language]
            if (!loader) {
                console.warn(`Unsupported language: ${language}`)
                return
            }

            const langModule = await loader()
            hljs.registerLanguage(language, langModule.default)

            if (active && codeRef.current) {
                hljs.highlightElement(codeRef.current)
            }
        })()

        return () => {
            active = false
        }
    }, [language, code])

    return (
        <pre>
            <code ref={codeRef} className={`hljs ${language}`}>
                {code}
            </code>
        </pre>
    )
}
