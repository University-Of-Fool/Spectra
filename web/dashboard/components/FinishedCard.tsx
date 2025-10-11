import { useContext, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { AccountCtx } from "../main.tsx"

export function FinishedCard(props: {
    finalUrl: string
    filePage?: boolean
    className?: string
}) {
    const context = useContext(AccountCtx)
    if (props.finalUrl === "") {
        return null
    }
    useEffect(() => {
        if (props.finalUrl !== "") {
            navigator.clipboard.writeText(props.finalUrl).then(() => {
                toast.success("链接已复制到剪贴板")
            })
        }
    }, [props.finalUrl])
    return (
        <div
            className={
                props.className || "mt-8 w-full flex flex-col items-center"
            }
        >
            <div className={"mb-6 opacity-75"}>
                {props.filePage
                    ? "上传成功，链接已复制。"
                    : "项目创建成功，链接已复制。"}
            </div>
            <Input
                className={"w-full"}
                type="text"
                value={props.finalUrl}
                readOnly
            />

            <div
                className={"flex mt-8 gap-4 items-center justify-center w-full"}
            >
                <Button
                    variant={"outline"}
                    className={"flex-1"}
                    onClick={() => context.handleTabClick("operation")}
                >
                    返回
                </Button>
                <Button
                    className={"flex-5"}
                    onClick={() => {
                        navigator.clipboard
                            .writeText(props.finalUrl)
                            .then(() => {
                                toast.success("链接已复制到剪贴板")
                            })
                    }}
                >
                    再次复制
                </Button>
                <Button
                    variant={"outline"}
                    className={"flex-1"}
                    onClick={() => {
                        window.open(props.finalUrl, "_blank")
                    }}
                >
                    打开链接
                </Button>
            </div>
        </div>
    )
}
