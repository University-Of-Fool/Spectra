/********************
 * TypstDocument.tsx
 * This is from https://github.com/Myriad-Dreamin/typst.ts and was published on npm (@myriaddreamin/typst.react)
 * But it has some weird compatibility issues with our Vite so we cannot use the package from the cloud directly
 *********************/

import * as typst from "@myriaddreamin/typst.ts"
import { withGlobalRenderer } from "@myriaddreamin/typst.ts/dist/esm/contrib/global-renderer.mjs"
import { useEffect, useRef } from "react"
import htmlLayerCss from "./typst.css?inline"

export interface TypstDocumentProps {
    fill?: string
    artifact: Uint8Array
    // todo: add vector format
    format?: "json"
}

const moduleInitOptions: typst.InitOptions = {
    beforeBuild: [],
    getModule: () =>
        "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm",
}

export const TypstDocument = ({
    fill,
    artifact,
    format,
}: TypstDocumentProps) => {
    const displayDivRef = useRef<HTMLDivElement>(null)
    const getDisplayLayerDiv = () => {
        return displayDivRef?.current
    }

    useEffect(() => {
        const doRender = (renderer: typst.TypstRenderer) => {
            const divElem = getDisplayLayerDiv()
            if (!divElem) {
                return
            }

            return renderer.render({
                artifactContent: artifact,
                format: "vector",
                backgroundColor: fill,
                container: divElem,
                pixelPerPt: 3,
            })
        }

        /// get display layer div
        const divElem = getDisplayLayerDiv()
        if (!divElem) {
            return
        }

        /// we allow empty artifact
        if (!artifact?.length) {
            divElem.innerHTML = ""
            return
        }

        /// render after init
        withGlobalRenderer(
            typst.createTypstRenderer,
            moduleInitOptions,
            doRender,
        )
    }, [displayDivRef, fill, artifact, format])

    return (
        <div>
            {/* todo: remove this embedded css */}
            <style>{htmlLayerCss}</style>
            <div
                className="typst-app"
                style={{ height: "0" }}
                ref={displayDivRef}
            ></div>
        </div>
    )
}
