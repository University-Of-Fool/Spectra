import { useContext, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card.tsx"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { wfetch } from "../fetch.ts"
import { AccountCtx } from "../main.tsx"
import { FinishedCard } from "./FinishedCard.tsx"
import { Turnstile } from "./Turnstile.tsx"

function isValidURI(input: string) {
    try {
        void new URL(input)
        return true
    } catch {
        return false
    }
}

export function AreaShortUrl() {
    const [path, setPath] = useState("")
    const [random, setRandom] = useState(true)
    const [target, setTarget] = useState("")
    const [expires, setExpires] = useState("604800")
    const [maxvisit, setMaxvisit] = useState(0)
    const [password, setPassword] = useState("")
    const [finalUrl, setFinalUrl] = useState("")
    const [urlValid, setUrlValid] = useState(true)
    const [failedMessage, setFailedMessage] = useState("")
    const [turnstileToken, setTurnstileToken] = useState("")

    const context = useContext(AccountCtx)

    const uploadDisabled = () => {
        return (
            target === "" ||
            context.value.loading ||
            (!context.value.isLoggedIn &&
                (!context.value.turnstile_enabled || turnstileToken === ""))
        )
    }

    async function handleUpload(e: React.MouseEvent<HTMLButtonElement>) {
        if (uploadDisabled()) return
        else {
            if (!urlValid && !e.shiftKey) return
        }
        const body = {
            item_type: "Link",
            data: target,
            expires_at:
                expires === "permanent"
                    ? undefined
                    : new Date(
                          Date.now() + parseInt(expires, 10) * 1000,
                      ).toISOString(),
            max_visits: maxvisit || undefined,
            password: password || undefined,
        }
        const uploadPath = `/api/item/${random ? "__RANDOM__" : path}`
        let query = ""

        if (context.value.turnstile_enabled && !context.value.isLoggedIn) {
            query = `?turnstile-token=${turnstileToken}`
        }
        const resp = await wfetch(uploadPath + query, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        })
        const data = await resp.json()
        if (resp.status === 200 && data.success) {
            context.sharedListUpdTrigger(context.sharedListUpd + 1)
            const url = `${window.location.origin}/${data.payload.short_path}`
            setFinalUrl(url)
            setFailedMessage("")
            return
        }
        if (resp.status === 409) {
            setFailedMessage("指定的路径已存在")
            return
        }
        setFailedMessage(`未知错误：${resp.status} ${data.payload}`)
    }

    return (
        <div className={"flex flex-col items-center"}>
            <div className="font-thin text-2xl mt-6 mb-12">短链接</div>

            {finalUrl === "" && (
                <>
                    <div className="flex gap-2 items-center">
                        <div className="opacity-50">https://s.akyuu.cn/</div>
                        <Input
                            disabled={random}
                            value={random ? "[随机]" : path}
                            onChange={(e) => setPath(e.currentTarget.value)}
                        />
                        <div className="flex items-center gap-2 ml-2">
                            <Checkbox
                                checked={random}
                                onCheckedChange={(checked) =>
                                    setRandom(!!checked)
                                }
                                id="terms"
                            />
                            <Label className="text-nowrap" htmlFor="terms">
                                随机生成
                            </Label>
                        </div>
                    </div>
                    <div className="w-150 mt-4">
                        <div className="mt-4">
                            <div className="mb-2 text-sm">目标链接</div>
                            <Input
                                value={target}
                                onChange={(e) => {
                                    setTarget(e.currentTarget.value)
                                    setUrlValid(
                                        isValidURI(e.currentTarget.value),
                                    )
                                }}
                            />{" "}
                            <div
                                className={`mb-2 mt-2 text-sm text-red-700${urlValid ? " hidden" : ""}`}
                            >
                                这似乎不是链接，请检查你的输入。
                            </div>
                        </div>

                        <div className="flex items-center justify-center mt-4 gap-4">
                            <div className="flex-1">
                                <div className="mb-2 text-sm">有效时长</div>
                                <Select
                                    value={expires}
                                    onValueChange={setExpires}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="有效时长" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="3600">
                                                1 小时
                                            </SelectItem>
                                            <SelectItem value="28800">
                                                8 小时
                                            </SelectItem>
                                            <SelectItem value="86400">
                                                1 天
                                            </SelectItem>
                                            <SelectItem value="604800">
                                                7 天
                                            </SelectItem>
                                            <SelectItem value="1209600">
                                                14 天
                                            </SelectItem>
                                            <SelectItem value="permanent">
                                                永久
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <div className="mb-2 text-sm">访问人数限制</div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={maxvisit || ""}
                                    onChange={(e) =>
                                        setMaxvisit(
                                            Number(e.currentTarget.value) || 0,
                                        )
                                    }
                                    placeholder="无限制"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="mb-2 text-sm">密码</div>
                            <Input
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.currentTarget.value)
                                }
                                placeholder={"无密码"}
                            />
                        </div>
                        <Turnstile onVerify={setTurnstileToken} />

                        <div className="flex gap-4 mt-8">
                            <Button
                                className="flex-1"
                                variant="outline"
                                onClick={() =>
                                    context.handleTabClick("operation")
                                }
                            >
                                取消
                            </Button>
                            <HoverCard openDelay={1200}>
                                <HoverCardTrigger asChild>
                                    <Button
                                        className={
                                            "flex-5" +
                                            (uploadDisabled() || !urlValid
                                                ? " opacity-50 cursor-default hover:bg-primary/100"
                                                : "")
                                        }
                                        onClick={handleUpload}
                                    >
                                        创建
                                    </Button>
                                </HoverCardTrigger>
                                {urlValid || (
                                    <HoverCardContent>
                                        <div className="text-sm">
                                            按住 Shift 以强制创建
                                        </div>
                                    </HoverCardContent>
                                )}
                            </HoverCard>
                        </div>

                        {failedMessage !== "" && (
                            <div
                                className={
                                    "text-red-700 mt-4 text-sm text-center"
                                }
                            >
                                {failedMessage}
                            </div>
                        )}
                    </div>
                </>
            )}
            <FinishedCard
                className={"mt-8 w-150 flex flex-col items-center"}
                finalUrl={finalUrl}
            />
        </div>
    )
}
