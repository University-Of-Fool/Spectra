import { toast } from "sonner"

export async function wfetch(input: RequestInfo, init?: RequestInit) {
    const resp = await fetch(input, {
        ...init,
        credentials: "include",
    })
    // 1. 检测服务器是否启动
    try {
        await resp.clone().json()
    } catch (e) {
        toast.error("无法连接到服务器。")
        console.error(e)
        throw new Error("无法连接到服务器。")
    }
    // 2. 检测是否需要登录
    if (resp.status === 401) {
        const user = JSON.parse(localStorage.getItem("user") || "null") as {
            email: string
            password: string
        } | null
        if (user) {
            await fetch("/api/login", {
                body: JSON.stringify(user),
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })
            return wfetch(input, init)
        }
        toast.error("登录状态失效")
        throw new Error("登录状态失效")
    }
    return resp
}
