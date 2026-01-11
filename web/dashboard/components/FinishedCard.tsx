import { useContext, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { cn } from "@/lib/utils.ts"
import { AccountCtx } from "../main.tsx"

export function FinishedCard(props: {
    finalUrl: string
    filePage?: boolean
    className?: string
}) {
    const { t } = useTranslation("dashboard")
    useEffect(() => {
        if (props.finalUrl !== "") {
            navigator.clipboard.writeText(props.finalUrl).then(() => {
                toast.success(t("finished.copied_msg"))
            })
        }
    }, [props.finalUrl])
    const context = useContext(AccountCtx)
    if (props.finalUrl === "") {
        return null
    }
    return (
        <div
            className={cn(
                "mt-8 w-full flex flex-col items-center",
                props.className,
            )}
        >
            <div className={"mb-6 opacity-75"}>
                {props.filePage ? t("finished.msg_file") : t("finished.msg")}
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
                    {t("common.back")}
                </Button>
                <Button
                    className={"flex-5"}
                    onClick={() => {
                        navigator.clipboard
                            .writeText(props.finalUrl)
                            .then(() => {
                                toast.success(t("finished.copied_msg"))
                            })
                    }}
                >
                    {t("finished.copy_again")}
                </Button>
                <Button
                    variant={"outline"}
                    className={"flex-1"}
                    onClick={() => {
                        window.open(props.finalUrl, "_blank")
                    }}
                >
                    {t("finished.open_link")}
                </Button>
            </div>
        </div>
    )
}
