import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AuthCard(props: { error: boolean }) {
    const url = new URL(window.location.href)
    const password = useRef(url.searchParams.get("password") || "")

    return (
        <div className={"h-full flex items-center justify-center"}>
            <div
                className={
                    "not-dark:bg-white dark:bg- shadow-lg border-1 border-border rounded-lg p-8 flex flex-col items-start gap-4"
                }
            >
                <div className={"text-sm opacity-75 mb-1"}>
                    该内容需要验证密码。
                </div>
                <div className={"flex gap-2"}>
                    <Input
                        type={"password"}
                        className={"w-60 mr-1"}
                        onInput={(e) => {
                            password.current = (
                                e.target as HTMLInputElement
                            ).value
                        }}
                        value={url.searchParams.get("password") || ""}
                    />
                    <Button
                        type={"submit"}
                        onClick={() => {
                            url.searchParams.set("password", password.current)
                            window.location.href = url.href
                        }}
                    >
                        验证
                    </Button>
                </div>
                {props.error && (
                    <div className={"text-sm opacity-75 mt-1 text-red-700"}>
                        密码错误，请重试
                    </div>
                )}
            </div>
        </div>
    )
}
