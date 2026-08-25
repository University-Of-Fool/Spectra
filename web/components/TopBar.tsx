import { useTranslation } from "react-i18next"
import { ThemeSwitcher } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils.ts"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { SpectraLogo } from "./Logo"

export function TopBarDiv(props: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <div
            className={cn(
                "flex items-center p-8 md:p-10 px-6 md:px-15 bg-linear-to-b from-background to-transparent from-80% md:from-70% to-100% opacity-95 md:opacity-100 sticky top-0 left-0 w-full z-50",
                props.className,
            )}
        >
            {props.children}
        </div>
    )
}

export function TopBarLogo(props: { pageName?: string; onClick?: () => void }) {
    // 所有页面均可点击：若未传入 onClick，则默认跳转到 dashboard（真实地址为 "/"）
    const handleClick = props.onClick
        ? props.onClick
        : () => {
              location.href = "/"
          }

    return (
        <div
            style={{ display: "inline-flex" }}
            onClick={handleClick}
            className={"items-center cursor-pointer select-none"}
        >
            <SpectraLogo className={"h-12 mr-4 ml-2 md:ml-0"} />
            <div className={"text-xl font-mono font-medium"}>
                Spectra{props.pageName ? `.${props.pageName}` : ""}
            </div>
        </div>
    )
}

export function TopBarRightDiv(props: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <div className={cn("flex items-end ml-auto gap-4", props.className)}>
            {props.children}
        </div>
    )
}

export function TopBarRightSharedBy(props: {
    name: string
    className?: string
}) {
    const { t } = useTranslation()
    return (
        <div className={cn("opacity-90", props.className)}>
            <div>
                {t("shared_by", {
                    name:
                        props.name === "Guest" ? t("guest") : `@${props.name}`,
                })}
            </div>
        </div>
    )
}

export function TopBarRightButtons(props: { className?: string }) {
    return (
        <div
            className={cn(
                "opacity-50 text-xs flex gap-1.5 items-center",
                props.className,
            )}
        >
            <ThemeSwitcher></ThemeSwitcher>
            <LanguageSwitcher></LanguageSwitcher>
        </div>
    )
}

export function TopBarRightBackButton() {
    const { t } = useTranslation("admin")
    return (
        <div className="ml-auto">
            <Button
                variant="outline"
                onClick={() => {
                    location.href = "/"
                }}
            >
                <span className={"material-symbols-outlined text-[1.6em]!"}>
                    arrow_back
                </span>
                {t("button_back_to_home")}
            </Button>
        </div>
    )
}

export function TopBarRightAvatar(props: { avatar: string | null }) {
    return (
        <div className={"w-12 h-12 rounded-full bg-foreground/5"}>
            <img
                alt={"avatar"}
                className={cn({
                    hidden: !props.avatar,
                    "rounded-full": !!props.avatar,
                })}
                src={props.avatar || ""}
            />
        </div>
    )
}

export function TopBarRightCol(props: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <div
            className={cn(
                "flex flex-col items-end ml-auto gap-1",
                props.className,
            )}
        >
            {props.children}
        </div>
    )
}
