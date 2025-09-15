export function AreaOperation({ handleTabClick }: { handleTabClick: (tab: string) => void }) {
    return <div className={"flex flex-col items-center"}>
        <div className={"font-thin text-2xl mt-6 mb-12"}>
            接下来要进行什么操作？
        </div>
        <div className={"flex gap-8"}>
            <div className={"card card-clickable w-60 h-75 flex flex-col p-5 hover-float"} onClick={() => handleTabClick("fileShare")}>
                <div className={"flex flex-1 items-center justify-center"}>
                    <span className={"material-symbols-outlined dashboard-operation-large-icon opacity-100 text-[#F0D457]"}>drive_file_move</span>
                </div>
                <div className={"mt-auto mb-2 text-lg font-semibold opacity-75"}>
                    文件快传
                </div>
                <div className={"text-sm opacity-50"}>
                    分享本地文件。
                </div>
            </div>
            <div className={"card card-clickable w-60 h-75 flex flex-col p-5 hover-float"} onClick={() => handleTabClick("pasteBin")}>
                <div className={"flex flex-1 items-center justify-center"}>
                    <span className={"material-symbols-outlined dashboard-operation-large-icon opacity-100 text-[#6F76E1]"}>content_paste</span>
                </div>
                <div className={"mt-auto mb-2 text-lg font-semibold opacity-75"}>
                    Pastebin
                </div>
                <div className={"text-sm opacity-50"}>
                    分享代码/文本/日志文件。
                </div>
            </div>
            <div className={"card card-clickable w-60 h-75 flex flex-col p-5 hover-float"} onClick={() => handleTabClick("shortUrl")}>
                <div className={"flex flex-1 items-center justify-center"}>
                    <span className={"material-symbols-outlined dashboard-operation-large-icon opacity-100 text-[#E65B5B]"}>link</span>
                </div>
                <div className={"mt-auto mb-2 text-lg font-semibold opacity-75"}>
                    短链接
                </div>
                <div className={"text-sm opacity-50"}>
                    创建简短的跳转链接。
                </div>
            </div>
        </div>
    </div>
}