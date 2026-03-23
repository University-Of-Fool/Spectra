import type { ApiResponse } from "./interface"

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const resp = await fetch(url, init)
    let data: ApiResponse<T> | null = null
    try {
        data = (await resp.json()) as ApiResponse<T>
    } catch {
        throw new Error(`HTTP ${resp.status}`)
    }

    if (!data.success) {
        const reason =
            typeof data.payload === "string"
                ? data.payload
                : `HTTP ${resp.status}`
        throw new Error(reason)
    }

    return data.payload
}

