import { useContext } from "react"
import { useTranslation } from "react-i18next"
import TurnstileO, { useTurnstile } from "react-turnstile"
import { cn } from "@/lib/utils.ts"
import { AccountCtx } from "../main"

export function Turnstile(props: {
    className?: string
    onVerify: (token: string) => void
}) {
    useTurnstile()
    const { t } = useTranslation("dashboard")
    const context = useContext(AccountCtx)
    return (
        <>
            {!context.value.loading && !context.value.isLoggedIn ? (
                context.value.turnstile_enabled ? (
                    <TurnstileO
                        sitekey={context.value.turnstile_site_key}
                        className={cn(
                            props.className,
                            "mt-6 mb-[-16px] text-center",
                        )}
                        onVerify={(token) => props.onVerify(token)}
                        size={"flexible"}
                        refreshExpired={"auto"}
                    />
                ) : (
                    <div className={"mt-8 text-center text-sm opacity-50"}>
                        {t("common.turnstile_disabled")}
                    </div>
                )
            ) : (
                <></>
            )}
        </>
    )
}
