import { ThemeSwitcher } from "@/components/ThemeProvider"
import { cn } from "@/lib/utils.ts"
import { SpectraLogo } from "./Logo"

export function TopBar(props: {
    name: string
    avatar: string | null
    page: string
    className?: string
}) {
    return (
        <div
            className={cn(
                "flex items-center p-10 px-15 bg-gradient-to-b from-background to-transparent from-70% to-100% sticky top-0 left-0 w-full z-50",
                props.className,
            )}
        >
            <SpectraLogo className={"h-12 mr-4"} />

            <div className={"text-xl font-mono font-medium"}>
                Spectra.{props.page}
            </div>
            <div className={"flex flex-col items-end ml-auto mr-4 gap-1"}>
                <div className={"opacity-90"}>
                    <div>由 @{props.name} 分享的内容</div>
                </div>
                <ThemeSwitcher className={"opacity-50 text-xs"}></ThemeSwitcher>
            </div>
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
        </div>
    )
}
