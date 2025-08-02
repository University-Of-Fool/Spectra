export function AreaShared() {
    return <div className={"flex flex-col items-center"}>
        <div className={"font-thin text-2xl mb-12"}>
            已分享的项目
        </div>

        <table className="w-200 text-sm text-left text-neutral-700 dark:text-neutral-200">
            <thead className="text-sm uppercase border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                    <th className="px-4 py-3">类型</th>
                    <th className="px-4 py-3">链接</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">访问次数</th>
                    <th className="px-4 py-3">创建时间</th>
                    <th className="px-4 py-3">操作</th>
                </tr>
            </thead>
            <tbody>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <td className="px-4 py-2">文件快传</td>
                    <td className="px-4 py-2 hover:underline cursor-pointer">s.akyuu.cn/XIfD08bavR</td>
                    <td className="px-4 py-2">有效</td>
                    <td className="px-4 py-2">1</td>
                    <td className="px-4 py-2">13 分钟前</td>
                    <td className="px-4 py-2">
                        <button type="button" className={"button-icon"}>
                            <span className={"material-symbols-outlined point cursor-pointer text-[1.4rem]!"}>delete</span>
                        </button>
                    </td>
                </tr>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <td className="px-4 py-2">短链接</td>
                    <td className="px-4 py-2 hover:underline cursor-pointer">s.akyuu.cn/6BR9YP3qT</td>
                    <td className="px-4 py-2">有效</td>
                    <td className="px-4 py-2">3</td>
                    <td className="px-4 py-2">2 小时前</td>
                    <td className="px-4 py-2">
                        <button type="button" className={"button-icon"}>
                            <span className={"material-symbols-outlined point cursor-pointer text-[1.4rem]!"}>delete</span>
                        </button>
                    </td>
                </tr>
                <tr className="opacity-50 border-b border-neutral-200 dark:border-neutral-700">
                    <td className="px-4 py-2">Pastebin</td>
                    <td className="px-4 py-2 cursor-not-allowed">s.akyuu.cn/KaIKUUdfGB</td>
                    <td className="px-4 py-2">失效</td>
                    <td className="px-4 py-2">8</td>
                    <td className="px-4 py-2">2025/7/12</td>
                    <td className="px-4 py-2">
                        <button type="button" className={"button-icon"}>
                            <span className={"material-symbols-outlined point cursor-pointer text-[1.4rem]!"}>delete</span>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
        <div className="text-center text-sm text-neutral-500 mt-8 mb-20 point cursor-pointer">
            查看更多…
        </div>

    </div>
}