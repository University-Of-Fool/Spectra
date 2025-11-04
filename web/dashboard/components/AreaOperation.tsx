import { type ReactNode, useContext } from "react"
import { cn } from "@/lib/utils.ts"
import { AccountCtx } from "../main.tsx"

interface CardProps {
    children?: ReactNode
    className?: string
    onClick?: () => void
}

function Card({ children, className = "", onClick }: CardProps) {
    return (
        <div
            className={cn(
                "bg-white hover:bg-neutral-100 shadow-lg border-1 border-border rounded-lg cursor-pointer transition-colors dark:bg-foreground/10 dark:hover:bg-foreground/18",
                className,
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )
}
export function AreaOperation() {
    const context = useContext(AccountCtx)
    return (
        <div className={"flex flex-col items-center"}>
            <div className={"font-thin dark:font-light text-2xl mt-6 mb-12"}>
                接下来要进行什么操作？
            </div>
            <div className={"flex gap-8"}>
                <Card
                    className={"w-60 h-75 flex flex-col p-5 hover-float"}
                    onClick={() => context.handleTabClick("fileShare")}
                >
                    <div className={"flex flex-1 items-center justify-center"}>
                        <span
                            className={
                                "material-symbols-outlined dashboard-operation-large-icon opacity-100 text-[#f7d063]"
                            }
                        >
                            drive_file_move
                        </span>
                    </div>
                    <div
                        className={
                            "mt-auto mb-2 text-lg font-semibold opacity-75"
                        }
                    >
                        文件快传
                    </div>
                    <div className={"text-sm opacity-50"}>分享本地文件。</div>
                </Card>
                <Card
                    className={"w-60 h-75 flex flex-col p-5 hover-float"}
                    onClick={() => context.handleTabClick("pasteBin")}
                >
                    <div className={"flex flex-1 items-center justify-center"}>
                        <span
                            className={
                                "material-symbols-outlined dashboard-operation-large-icon opacity-100 text-[#6F76E1]"
                            }
                        >
                            content_paste
                        </span>
                    </div>
                    <div
                        className={
                            "mt-auto mb-2 text-lg font-semibold opacity-75"
                        }
                    >
                        Pastebin
                    </div>
                    <div className={"text-sm opacity-50"}>
                        分享代码/文本/日志文件。
                    </div>
                </Card>
                <Card
                    className={"w-60 h-75 flex flex-col p-5 hover-float"}
                    onClick={() => context.handleTabClick("shortUrl")}
                >
                    <div className={"flex flex-1 items-center justify-center"}>
                        <span
                            className={
                                "material-symbols-outlined dashboard-operation-large-icon opacity-100 text-[#E65B5B]"
                            }
                        >
                            link
                        </span>
                    </div>
                    <div
                        className={
                            "mt-auto mb-2 text-lg font-semibold opacity-75"
                        }
                    >
                        短链接
                    </div>
                    <div className={"text-sm opacity-50"}>
                        创建简短的跳转链接。
                    </div>
                </Card>
            </div>
        </div>
    )
}
