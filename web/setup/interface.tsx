export interface SetupConfigPayload {
    refresh_time: string
    domain: string
    turnstile_enabled: boolean
    turnstile_site_key: string
    turnstile_secret_key: string
}

export interface AdminSetupPayload {
    name: string
    email: string
    password: string
    avatar: string | null
}

export interface ApiResponse<T> {
    success: boolean
    payload: T
}
