import {AccountCtx} from "../main.tsx";
import {useContext} from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useRef, useEffect, useState} from "react";

export function TopBar() {
    const context = useContext(AccountCtx);
    const references = {
        email: useRef(""),
        password: useRef(""),
        remember: useRef(true),
    }
    const [loginSuccess, setLoginSuccess] = useState(true);

    async function get_userinfo(turnstile_enabled: boolean, turnstile_site_key: string) {

        let resp = await fetch("/api/user-info");
        let data = await resp.json();
        console.log(data);
        if (data.success) {
            let value = {
                ...context.value,
                loading: false,
                isLoggedIn: true,
                name: data.payload.name,
                avatar_url: data.payload.avatar,
                turnstile_enabled,
                turnstile_site_key,
            }
            context.setValue(value)
            return;
        } else if (localStorage.getItem("user")) {
            let user = JSON.parse(localStorage.getItem("user") || "{}");
            references.email.current = user.email;
            references.password.current = user.password;
            references.remember.current = true;
            return login();
        }
        let value = {
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
            .then(resp => resp.json())
            .then(data => get_userinfo(data.payload.turnstile_enabled, data.payload.turnstile_site_key))
            .catch(err => {
                console.error(err);
            })

    }, []);


    const login = async () => {
        let value = {
            ...context.value,
            loading: true,
        }
        context.setValue(value)
        let resp = await fetch("/api/login", {
            body: JSON.stringify({
                email: references.email.current,
                password: references.password.current,
            }),
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            }
        });
        let data = await resp.json();
        if (data.success) {
            let value = {
                ...context.value,
                loading: false,
                isLoggedIn: true,
                name: data.payload.name,
                avatar_url: data.payload.avatar,
            }
            context.setValue(value)
            if (references.remember.current) {
                localStorage.setItem("user", JSON.stringify({
                    email: references.email.current,
                    password: references.password.current,
                }))
            }
        } else {
            setLoginSuccess(false);
            let value = {
                ...context.value,
                loading: false,
                isLoggedIn: false,
            }
            context.setValue(value)
        }
    }
    const logout = async () => {
        let resp = await fetch("/api/logout", {
            method: "POST",
        });
        let data = await resp.json();
        if (data.success) {
            let value = {
                ...context.value,
                loading: false,
                isLoggedIn: false,
                name: "",
                avatar_url: "",
            }
            context.setValue(value)
        }
    }
    return (
        <div
            className={"flex items-center p-10 px-15 bg-gradient-to-b from-neutral-100/100 to-neutral-100/0 from-70% to-100% sticky top-0 left-0 w-full z-50"}>
            <img alt={"logo"} src="/logo_demo.svg" className={"h-12 mr-4"}></img>
            <div className={"text-xl font-mono font-medium"}>Spectra</div>
            <div
                className={"flex flex-col items-end ml-auto mr-4 gap-1" + (context.value.loading ? " animate-pulse" : "")}>
                <div
                    className={"opacity-90" + (context.value.loading ? " h-2 bg-black/10 rounded text-black/0" : "")}>
                    {context.value.loading ? "username (loading)" : (context.value.isLoggedIn ? "下午好，" + context.value.name + "。" : "欢迎来到 Spectra。")}
                </div>
                <div
                    className={"opacity-50 text-xs flex gap-1.5 items-center" + (context.value.loading ? " h-2 bg-black/10 rounded text-black/0" : "")}>
                    {context.value.isLoggedIn ? <>
                        <div className={"cursor-pointer"} onClick={logout}>
                            登出
                        </div>
                        {/*<div className={"cursor-pointer"}>*/}
                        {/*    切换账号*/}
                        {/*</div>*/}
                    </> : <div className={(context.value.isLoggedIn ? "hidden" : "")}>
                        <Popover>
                            <PopoverTrigger>
                                <div className={"cursor-pointer"}>
                                    登录
                                </div>
                            </PopoverTrigger>
                            <PopoverContent>
                                <div className={"gap-4 flex flex-col"}>
                                    <span className={"text-sm"}>登录到 Spectra</span>
                                    <Input placeholder={"邮箱地址"}
                                           onChange={(e) => references.email.current = (e.target as HTMLInputElement)?.value || ""}></Input>
                                    <Input placeholder={"密码"} type={"password"}
                                           onInput={(e) => references.password.current = (e.target as HTMLInputElement)?.value || ""}></Input>
                                    <div className={"flex-row flex gap-2"}>
                                        <Checkbox id={"remember-password"} defaultChecked
                                                  onCheckedChange={(e) => references.remember.current = !!e}/>
                                        <Label className="text-nowrap" htmlFor={"remember-password"}>自动登录</Label>
                                    </div>
                                    <Button onClick={login}>登录</Button>
                                    <div
                                        className={`text-red-700 text-sm ${loginSuccess ? " hidden" : ""}`}>用户名或密码不正确
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>}

                    <span id="dark-mode-icon"
                          className={"material-symbols-outlined point cursor-pointer text-[1.25rem]!"}
                    >dark_mode</span>
                </div>
            </div>
            <div className={"w-12 h-12 rounded-full bg-black/10" + (context.value.loading ? " animate-pulse" : "")}>
                <img alt={"avatar"}
                     className={(context.value.loading || !context.value.isLoggedIn || !context.value.avatar_url) ? " hidden" : "rounded-full"}
                     src={context.value.avatar_url}/>
            </div>
        </div>
    )
}