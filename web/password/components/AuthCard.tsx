import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export function AuthCard(props: { error: boolean }) {
    const url = new URL(window.location.href)
    const password = useRef(url.searchParams.get("password") || "")
    const { t } = useTranslation("password")
    return (
        <div className={"h-full flex items-center justify-center"}>
            <div
                className={
                    "bg-white dark:bg-neutral-900 shadow-lg border-1 border-border rounded-lg p-8 flex flex-col items-start gap-4"
                }
            >
                <div className={"text-sm opacity-75 mb-1"}>{t("msg")}</div>
                <div className={"flex gap-2"}>
                    <Input
                        type={"password"}
                        className={"w-60 mr-1 dark:bg-neutral-800"}
                        onInput={(e) => {
                            password.current = (
                                e.target as HTMLInputElement
                            ).value
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                url.searchParams.set(
                                    "password",
                                    password.current,
                                )
                                window.location.href = url.href
                            }
                        }}
                        autocomplete={"one-time-code"}
                        value={url.searchParams.get("password") || ""}
                    />
                    <Button
                        type={"submit"}
                        onClick={() => {
                            url.searchParams.set("password", password.current)
                            window.location.href = url.href
                        }}
                    >
                        {t("action")}
                    </Button>
                </div>
                {props.error && (
                    <div className={"text-sm opacity-75 mt-1 text-red-700"}>
                        {t("wrong_msg")}
                    </div>
                )}
            </div>
        </div>
    )
}
