export function TopBar(props: {
    name: string
    avatar: string | null
    page: string
    className?: string
}) {
    return (
        <div
            className={
                "flex items-center p-10 px-15 bg-gradient-to-b from-neutral-100/100 to-neutral-100/0 from-25% top-0 left-0 w-full z-50 " +
                props.className
            }
        >
            <img
                alt={"logo"}
                src="/logo_demo.svg"
                className={"h-12 mr-4"}
            ></img>

            <div className={"text-xl font-mono font-medium"}>
                Spectra.{props.page}
            </div>
            <div className={"flex flex-col items-end ml-auto mr-4 gap-1"}>
                <div className={"opacity-75 text-sm"}>
                    由 @{props.name} 分享的内容
                </div>
            </div>
            <div className={"w-12 h-12 rounded-full bg-black/10"}>
                <img
                    alt={"avatar"}
                    className={!props.avatar ? " hidden" : "rounded-full"}
                    src={props.avatar || ""}
                />
            </div>
        </div>
    )
}
