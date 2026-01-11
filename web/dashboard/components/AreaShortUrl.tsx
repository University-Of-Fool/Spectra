import { useContext, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
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
import { cn } from "@/lib/utils.ts"
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
    const [shiftDown, setShiftDown] = useState(false)

    const context = useContext(AccountCtx)
    const { t } = useTranslation("dashboard")

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
            setFailedMessage(t("common.failed_msg.conflict"))
            return
        }
        setFailedMessage(
            t("common.failed_msg.unknown", {
                reason: `${resp.status} ${data.payload}`,
            }),
        )
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                setShiftDown(true)
            }
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                setShiftDown(false)
            }
        }
        addEventListener("keydown", handleKeyDown)
        addEventListener("keyup", handleKeyUp)
        return () => {
            removeEventListener("keydown", handleKeyDown)
            removeEventListener("keyup", handleKeyUp)
        }
    }, [target])

    return (
        <div className={"flex flex-col items-center"}>
            <div className="font-thin dark:font-light text-2xl mt-6 mb-12">
                {t("short_url.title")}
            </div>

            {finalUrl === "" && (
                <>
                    <div className="flex gap-2 items-center">
                        <div className="opacity-50">
                            {window.location.origin}/
                        </div>
                        <Input
                            disabled={random}
                            value={random ? t("common.[random]") : path}
                            onChange={(e) => setPath(e.currentTarget.value)}
                        />
                        <div className="flex items-center gap-2 ml-2">
                            <Checkbox
                                checked={random}
                                onCheckedChange={(checked) => {
                                    if (context.value.loading) return
                                    if (
                                        !context.value.isLoggedIn &&
                                        context.value.turnstile_enabled
                                    ) {
                                        toast.error(
                                            t(
                                                "common.failed_msg.guest_avoid_random",
                                            ),
                                        )
                                        return
                                    }

                                    // checked: boolean|"indeterminate"
                                    setRandom(!!checked)
                                }}
                                id="terms"
                            />
                            <Label className="text-nowrap" htmlFor="terms">
                                {t("common.random")}
                            </Label>
                        </div>
                    </div>
                    <div className="w-150 mt-4">
                        <div className="mt-4">
                            <div className="mb-2 text-sm">
                                {t("short_url.target_url")}
                            </div>
                            <Input
                                value={target}
                                placeholder={"https://"}
                                onChange={(e) => {
                                    setTarget(e.currentTarget.value)
                                    setUrlValid(
                                        isValidURI(e.currentTarget.value),
                                    )
                                }}
                            />{" "}
                            <div
                                className={cn(
                                    "mb-2 mt-2 text-sm text-red-700",
                                    urlValid && "hidden",
                                )}
                            >
                                {t("short_url.invalid_url_warning")}
                            </div>
                        </div>

                        <div className="flex items-center justify-center mt-4 gap-4">
                            <div className="flex-1">
                                <div className="mb-2 text-sm">
                                    {t("common.invalid_after")}
                                </div>
                                <Select
                                    value={expires}
                                    onValueChange={setExpires}
                                >
                                    <SelectTrigger className={"w-full"}>
                                        <SelectValue placeholder="有效时长" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="3600">
                                                {t("common.hour", {
                                                    count: 1,
                                                })}
                                            </SelectItem>
                                            <SelectItem value="28800">
                                                {t("common.hour", {
                                                    count: 8,
                                                })}
                                            </SelectItem>
                                            <SelectItem value="86400">
                                                {t("common.day", {
                                                    count: 1,
                                                })}
                                            </SelectItem>
                                            <SelectItem value="604800">
                                                {t("common.day", {
                                                    count: 7,
                                                })}
                                            </SelectItem>
                                            <SelectItem value="1209600">
                                                {t("common.day", {
                                                    count: 14,
                                                })}
                                            </SelectItem>
                                            <SelectItem value="permanent">
                                                {t("common.never")}
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <div className="mb-2 text-sm">
                                    {t("common.max_visits")}
                                </div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={maxvisit || ""}
                                    onChange={(e) =>
                                        setMaxvisit(
                                            Number(e.currentTarget.value) || 0,
                                        )
                                    }
                                    placeholder={t(
                                        "common.max_visits_placeholder",
                                    )}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="mb-2 text-sm">
                                {t("common.password")}
                            </div>
                            <Input
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.currentTarget.value)
                                }
                                placeholder={t("common.password_placeholder")}
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
                                {t("common.cancel")}
                            </Button>
                            <HoverCard openDelay={200}>
                                <HoverCardTrigger asChild>
                                    <Button
                                        className={cn(
                                            "flex-5",
                                            (uploadDisabled() || !urlValid) &&
                                                !shiftDown &&
                                                " opacity-50 cursor-default hover:bg-primary/100",
                                        )}
                                        onClick={handleUpload}
                                    >
                                        {t("common.create")}
                                    </Button>
                                </HoverCardTrigger>
                                {urlValid || (
                                    <HoverCardContent className={"w-auto"}>
                                        <div className="text-sm">
                                            {t("short_url.force_create_hint")}
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
