import { useContext } from "react"
import TurnstileO, { useTurnstile } from "react-turnstile"

import { AccountCtx } from "../main"
import {cn} from "@/lib/utils.ts";

export function Turnstile(props: {
    className?: string
    onVerify: (token: string) => void
}) {
    useTurnstile()
    const context = useContext(AccountCtx)
    return (
        <>
            {!context.value.loading && !context.value.isLoggedIn ? (
                context.value.turnstile_enabled ? (
                    <TurnstileO
                        sitekey={context.value.turnstile_site_key}
                        className={
                            cn(props.className, "mt-6 mb-[-16px] text-center")
                        }
                        onVerify={(token) => props.onVerify(token)}
                        size={"flexible"}
                        refreshExpired={"auto"}
                    />
                ) : (
                    <div className={"mt-8 text-center text-sm opacity-50"}>
                        当前站点未开启游客上传功能，请先登录。
                    </div>
                )
            ) : (
                <></>
            )}
        </>
    )
}
