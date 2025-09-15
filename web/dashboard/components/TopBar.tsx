export function TopBar() {
    return (
        <div className={"flex items-center p-10 px-15 bg-gradient-to-b from-neutral-100/100 to-neutral-100/0 from-70% to-100% sticky top-0 left-0 w-full z-50"}>
            <img alt={"logo"} src="../logo_demo.svg" className={"h-12 mr-4"}></img>
            <div className={"text-xl font-mono font-medium"}>Spectra</div>
            <div className={"flex flex-col items-end ml-auto mr-4 gap-1"}>
                <div className={"opacity-90"}>
                    下午好，RLt。
                </div>
                <div className={"opacity-50 text-xs flex gap-1.5 items-center"}>
                    <div className={"cursor-pointer"}>
                        登出
                    </div>
                    <div className={"cursor-pointer"}>
                        切换账号
                    </div>
                    <span id="dark-mode-icon" className={"material-symbols-outlined point cursor-pointer text-[1.25rem]!"}
                    >dark_mode</span>
                </div>
            </div>
            <img className={"w-12 h-12 rounded-full"} alt={"avatar"} src={"../avatar.jpg"} />
        </div>
    )
}