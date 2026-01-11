import { t } from "i18next"
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
        toast.error(t("top_bar.service_unavailable"))
        console.error(e)
        throw new Error(t("top_bar.service_unavailable"))
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
        toast.error(t("top_bar.user_expired"))
        throw new Error(t("top_bar.user_expired"))
    }
    return resp
}
