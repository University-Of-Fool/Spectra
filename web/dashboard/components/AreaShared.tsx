import { useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { wfetch } from "../fetch"
import { TransitionHeight } from "../HeightTransition"
import { AccountCtx } from "../main"

export function AreaShared() {
    const context = useContext(AccountCtx)
    const [items, setItems] = useState([
        {
            id: "loading_dummy",
            short_path: "加载中",
            item_type: "Link",
            visits: 0,
            created_at: "1970-01-01T00:00:00.000Z",
            creator: "null",
            available: true,
        },
    ])
    const offset = useRef(0)
    const [ended, setEnded] = useState(false)
    const [nothing, setNothing] = useState(false)

    async function get_items(offset: number) {
        try {
            const resp = await wfetch(`/api/items?offset=${offset}&limit=11`)
            const data: {
                success: boolean
                payload: {
                    id: string
                    short_path: string
                    item_type: string
                    visits: number
                    created_at: string
                    creator: string
                    available: boolean
                }[]
            } = await resp.json()
            if (data.success) {
                if (data.payload.length <= 10) {
                    setEnded(true)
                    // RLt: 我认为这里不用显示通知，因为“查看更多”按钮消失已经告诉用户列表到底了
                    // toast("没有更多项目了")

                    // enita: 好的
                }
                if (data.payload.length === 0) {
                    setNothing(true)
                }
                setItems((prev) => {
                    if (offset === 0) prev = []
                    if (data.payload.length === 11) data.payload.pop()
                    return [
                        ...prev,
                        ...data.payload.map((item) => ({
                            ...item,
                            short_path: `${window.location.origin}/${item.short_path}`,
                            item_type: (() => {
                                switch (item.item_type) {
                                    case "Link":
                                        return "短链接"
                                    case "File":
                                        return "文件传输"
                                    case "Code":
                                        return "剪贴板"
                                    default:
                                        return item.item_type
                                }
                            })(),
                        })),
                    ]
                })
            }
        } catch (e) {
            console.error(e)
            toast.error("获取分享项目失败")
        }
    }

    function getOnClickDelete(id: string, path: string) {
        return async () => {
            try {
                const resp = await fetch(
                    `/api/item/${path.replace(`${window.location.origin}/`, "")}`,
                    {
                        method: "DELETE",
                    },
                )
                const data = await resp.json()
                if (data.success) {
                    toast.success("删除成功")
                    setItems((prev) => prev.filter((item) => item.id !== id))
                } else {
                    toast.error("删除失败")
                }
            } catch (e) {
                console.error(e)
                toast.error("删除失败")
            }
        }
    }

    useEffect(() => {
        let delay = 0
        if (context.sharedListUpd !== 0) delay = 100
        setTimeout(
            () =>
                get_items(0).then(() => {
                    offset.current = 10
                }),
            delay,
        )
    }, [context.sharedListUpd])
    return (
        <>
            <div className={"flex flex-col items-center"}>
                <div className={"font-thin text-2xl mb-12"}>已分享的项目</div>

                <TransitionHeight>
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
                            {items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-neutral-200 dark:border-neutral-700"
                                >
                                    <td className="px-4 py-2">
                                        {item.item_type}
                                    </td>
                                    <td className="px-4 py-2 hover:underline cursor-pointer">
                                        <a
                                            href={item.short_path}
                                            target="_blank"
                                        >
                                            {item.short_path}
                                        </a>
                                    </td>
                                    <td className="px-4 py-2">
                                        {item.available ? "有效" : "失效"}
                                    </td>
                                    <td className="px-4 py-2">{item.visits}</td>
                                    <td className="px-4 py-2">
                                        {new Date(
                                            item.created_at,
                                        ).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            type="button"
                                            onClick={getOnClickDelete(
                                                item.id,
                                                item.short_path,
                                            )}
                                            class={"button-icon"}
                                        >
                                            <span
                                                className={
                                                    "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                                }
                                            >
                                                delete
                                            </span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TransitionHeight>

                <div className={"mt-8"}></div>

                {!nothing &&
                    (ended ? (
                        <div
                            className={
                                "text-center text-sm text-neutral-500 point"
                            }
                        >
                            没有其他项目了…
                        </div>
                    ) : (
                        <div
                            className={
                                "text-center text-sm text-neutral-500 point cursor-pointer"
                            }
                            onClick={() => {
                                get_items(offset.current).then(() => {
                                    offset.current += 10
                                })
                            }}
                        >
                            查看更多…
                        </div>
                    ))}

                {nothing && (
                    <div className={"text-center text-sm text-neutral-500"}>
                        暂无分享项目
                    </div>
                )}

                <div className={"mb-20"}></div>
            </div>
        </>
    )
}
