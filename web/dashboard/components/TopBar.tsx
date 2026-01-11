import { useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ThemeSwitcher } from "@/components/ThemeProvider.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Checkbox } from "@/components/ui/checkbox.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils.ts"
import { LanguageSwitcher } from "../../components/LanguageSwitcher.tsx"
import { SpectraLogo } from "../../components/Logo.tsx"
import { AccountCtx } from "../main.tsx"

export function TopBar() {
    const context = useContext(AccountCtx)
    const references = {
        email: useRef(""),
        password: useRef(""),
        remember: useRef(true),
    }
    const [loginSuccess, setLoginSuccess] = useState(true)
    const { t } = useTranslation("dashboard")

    async function get_userinfo(
        turnstile_enabled: boolean,
        turnstile_site_key: string,
    ) {
        const resp = await fetch("/api/user-info")
        let data: {
            success: boolean
            payload: { name: string; avatar: string }
        } | null = null
        try {
            data = await resp.json()
        } catch (e) {
            // 返回的不是 json 说明服务器没有启动
            const value = {
                ...context.value,
                loading: false,
                isLoggedIn: false,
            }
            context.setValue(value)
            toast.error(t("top_bar.service_unavailable"))
            console.error(e)
        }
        if (data?.success) {
            const value = {
                ...context.value,
                loading: false,
                isLoggedIn: true,
                name: data?.payload.name || "",
                avatar_url: data?.payload.avatar || "",
                turnstile_enabled,
                turnstile_site_key,
            }
            context.setValue(value)
            return
        } else if (localStorage.getItem("user")) {
            const user = JSON.parse(localStorage.getItem("user") || "{}")
            references.email.current = user.email
            references.password.current = user.password
            references.remember.current = true
            return login()
        }
        const value = {
            ...context.value,
            loading: false,
            isLoggedIn: false,
            turnstile_enabled,
            turnstile_site_key,
        }
        context.setValue(value)
    }

    useEffect(() => {
        fetch("/api/config")
            .then((resp) => resp.json())
            .catch((err) => {
                const value = {
                    ...context.value,
                    loading: false,
                    isLoggedIn: false,
                    turnstile_enabled: false,
                }
                context.setValue(value)
                toast.error(t("top_bar.service_unavailable"))
                console.error(err)
            })
            .then((data) =>
                get_userinfo(
                    data.payload.turnstile_enabled,
                    data.payload.turnstile_site_key,
                ),
            )
    }, [])

    const login = async () => {
        const value = {
            ...context.value,
            loading: true,
        }
        context.setValue(value)
        const resp = await fetch("/api/login", {
            body: JSON.stringify({
                email: references.email.current,
                password: references.password.current,
            }),
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        })
        const data = await resp.json()
        if (data.success) {
            const value = {
                ...context.value,
                loading: false,
                isLoggedIn: true,
                name: data.payload.name,
                avatar_url: data.payload.avatar,
            }
            context.setValue(value)
            if (references.remember.current) {
                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        email: references.email.current,
                        password: references.password.current,
                    }),
                )
            }
        } else {
            setLoginSuccess(false)
            const value = {
                ...context.value,
                loading: false,
                isLoggedIn: false,
            }
            context.setValue(value)
        }
    }
    const logout = async () => {
        const resp = await fetch("/api/logout", {
            method: "POST",
        })
        const data = await resp.json()
        if (data.success) {
            const value = {
                ...context.value,
                loading: false,
                isLoggedIn: false,
                name: "",
                avatar_url: "",
            }
            context.setValue(value)
            localStorage.removeItem("user")
        } else {
            // toast.error(`退出登录失败: ${resp.status} ${data?.payload || ""}`)
            toast.error(
                t("top_bar.logout_failed", {
                    reason: `${resp.status} ${data?.payload || ""}`,
                }),
            )
        }
    }
    return (
        <div
            className={
                "flex items-center p-10 px-15 bg-gradient-to-b from-background to-transparent from-70% to-100% sticky top-0 left-0 w-full z-50"
            }
        >
            <SpectraLogo className={"h-12 mr-4"} />
            <div className={"text-xl font-mono font-medium"}>Spectra</div>
            <div
                className={cn(
                    "flex flex-col items-end ml-auto mr-4 gap-1",
                    context.value.loading && " animate-pulse",
                )}
            >
                <div
                    className={cn(
                        "opacity-90",
                        context.value.loading &&
                            "h-2 bg-black/10 rounded text-black/0",
                    )}
                >
                    {context.value.loading
                        ? "username (loading)"
                        : context.value.isLoggedIn
                          ? t("top_bar.greeting.message", {
                                time: t(
                                    t(
                                        (() => {
                                            const h = new Date().getHours()
                                            if (h < 5)
                                                return "top_bar.greeting.late_night"
                                            else if (h < 11)
                                                return "top_bar.greeting.morning"
                                            else if (h < 12)
                                                return "top_bar.greeting.early_noon"
                                            else if (h < 14)
                                                return "top_bar.greeting.noon"
                                            else if (h < 18)
                                                return "top_bar.greeting.afternoon"
                                            else if (h < 23)
                                                return "top_bar.greeting.evening"
                                            else
                                                return "top_bar.greeting.late_night"
                                        })(),
                                    ),
                                ),
                                username: context.value.name || "user",
                            })
                          : t("top_bar.greeting.message_guest")}
                </div>
                <div
                    className={cn(
                        "opacity-50 text-xs flex gap-1.5 items-center",
                        context.value.loading &&
                            " h-2 bg-black/10 rounded text-black/0",
                    )}
                >
                    {context.value.isLoggedIn ? (
                        <>
                            <div className={"cursor-pointer"} onClick={logout}>
                                {t("top_bar.logout")}
                            </div>
                        </>
                    ) : (
                        <div
                            className={context.value.isLoggedIn ? "hidden" : ""}
                        >
                            <Popover>
                                <PopoverTrigger>
                                    <div className={"cursor-pointer"}>
                                        {t("top_bar.login")}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-90 mr-10 mt-1">
                                    <div className={"flex flex-col p-3"}>
                                        <div className={"flex items-center"}>
                                            <span
                                                id="dark-mode-icon"
                                                className={
                                                    "material-symbols-outlined"
                                                }
                                            >
                                                login
                                            </span>
                                            <span className={"text-md ml-2"}>
                                                {t("top_bar.login_msg")}
                                            </span>
                                        </div>
                                        <div
                                            className={
                                                "text-sm opacity-75 mt-6"
                                            }
                                        >
                                            {t("top_bar.email")}
                                        </div>
                                        <Input
                                            className={"mt-2"}
                                            onChange={(e) => {
                                                references.email.current =
                                                    (
                                                        e.target as HTMLInputElement
                                                    )?.value || ""
                                            }}
                                        ></Input>
                                        <div
                                            className={
                                                "text-sm opacity-75 mt-4"
                                            }
                                        >
                                            {t("top_bar.password")}
                                        </div>
                                        <Input
                                            className={"mt-2"}
                                            type={"password"}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault()
                                                    login()
                                                }
                                            }}
                                            onInput={(e) => {
                                                references.password.current =
                                                    (
                                                        e.target as HTMLInputElement
                                                    )?.value || ""
                                            }}
                                        ></Input>
                                        <div
                                            className={
                                                "flex-row flex gap-2 mt-7"
                                            }
                                        >
                                            <Checkbox
                                                id={"remember-password"}
                                                defaultChecked
                                                onCheckedChange={(e) => {
                                                    references.remember.current =
                                                        !!e
                                                }}
                                            />
                                            <Label
                                                className="text-nowrap"
                                                htmlFor={"remember-password"}
                                            >
                                                {t("top_bar.remember_me")}
                                            </Label>
                                        </div>
                                        <Button
                                            className={"mt-4"}
                                            onClick={login}
                                        >
                                            {t("top_bar.login_action")}
                                        </Button>
                                        <div
                                            className={cn(
                                                "mt-6 text-red-700 text-sm text-center",
                                                loginSuccess && " hidden",
                                            )}
                                        >
                                            {t("top_bar.invalid_login")}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                    <ThemeSwitcher></ThemeSwitcher>
                    <LanguageSwitcher></LanguageSwitcher>
                </div>
            </div>
            <div
                className={cn(
                    "w-12 h-12 rounded-full bg-foreground/5",
                    context.value.loading && " animate-pulse",
                )}
            >
                <img
                    alt={"avatar"}
                    className={cn("rounded-full", {
                        hidden:
                            context.value.loading ||
                            !context.value.isLoggedIn ||
                            !context.value.avatar_url,
                    })}
                    src={context.value.avatar_url}
                />
            </div>
        </div>
    )
}
