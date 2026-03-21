import { ThemeProvider, ThemeSwitcher } from "@/components/ThemeProvider"
import "../public/style.css"
import { CronExpressionParser } from "cron-parser"
import { render } from "preact"
import { Suspense, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { TransitionHeight } from "../components/HeightTransition"
import { LanguageSwitcher } from "../components/LanguageSwitcher"
import { SpectraLogo } from "../components/Logo"
import "../components/i18n"

interface SetupConfigPayload {
    refresh_time: string
    domain: string
    turnstile_enabled: boolean
    turnstile_site_key: string
    turnstile_secret_key: string
}

interface AdminSetupPayload {
    name: string
    email: string
    password: string
    avatar: string | null
}

interface ApiResponse<T> {
    success: boolean
    payload: T
}

function StepTransition(props: {
    step: number
    durationMs?: number
    children: (step: number) => preact.ComponentChildren
}) {
    const duration = props.durationMs ?? 220
    const [displayStep, setDisplayStep] = useState(props.step)
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (props.step === displayStep) {
            return
        }

        setVisible(false)
        const switchTimer = window.setTimeout(() => {
            setDisplayStep(props.step)
            setVisible(true)
        }, duration)

        return () => {
            window.clearTimeout(switchTimer)
        }
    }, [props.step, displayStep, duration])

    return (
        <div
            className={cn(
                "transition-opacity",
                visible ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: `${duration}ms` }}
        >
            {props.children(displayStep)}
        </div>
    )
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
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

export function App() {
    const [step, setStep] = useState(1)
    const [setupConfig, setSetupConfig] = useState<SetupConfigPayload>({
        refresh_time: "0 0 4 * * ?",
        domain: window.location.origin,
        turnstile_enabled: false,
        turnstile_site_key: "1x00000000000000000000AA",
        turnstile_secret_key: "1x0000000000000000000000000000000AA",
    })
    const [adminPayload, setAdminPayload] = useState<AdminSetupPayload>({
        name: "",
        email: "",
        password: "",
        avatar: null,
    })

    return (
        <ThemeProvider>
            <Toaster richColors />
            <div className="h-screen">
                <div
                    className={
                        "fixed flex items-center p-10 px-15 bg-linear-to-b from-background to-transparent from-25% top-0 left-0 w-full z-50"
                    }
                >
                    <SpectraLogo className="h-12 mr-4" />
                    <div
                        className={"text-sm text-muted-foreground ml-auto flex"}
                    >
                        <ThemeSwitcher></ThemeSwitcher>
                        <LanguageSwitcher></LanguageSwitcher>
                    </div>
                </div>
                <StepTransition step={step}>
                    {(displayStep) =>
                        displayStep === 1 ? (
                            <SetupStep1
                                setStep={setStep}
                                setupConfig={setupConfig}
                                setSetupConfig={setSetupConfig}
                            />
                        ) : (
                            <SetupStep2
                                setStep={setStep}
                                setupConfig={setupConfig}
                                adminPayload={adminPayload}
                                setAdminPayload={setAdminPayload}
                            />
                        )
                    }
                </StepTransition>
            </div>
        </ThemeProvider>
    )
}

function SetupStep1({
    setStep,
    setupConfig,
    setSetupConfig,
}: {
    setStep: (n: number) => void
    setupConfig: SetupConfigPayload
    setSetupConfig: (v: SetupConfigPayload) => void
}) {
    const { t } = useTranslation("setup")
    const [legacyConfig, setLegacyConfig] = useState("")
    const [legacyLoading, setLegacyLoading] = useState(true)

    useEffect(() => {
        void (async () => {
            try {
                const config = await apiRequest<string>(
                    "/api/setup/get_existing_config",
                )
                setLegacyConfig(config)
            } catch (e) {
                const reason =
                    e instanceof Error ? e.message : t("errors.unknown")
                setLegacyConfig(
                    t("step1.previous_installation_failed", { reason }),
                )
            } finally {
                setLegacyLoading(false)
            }
        })()
    }, [t])

    function goNext() {
        try {
            new URL(setupConfig.domain)
        } catch {
            toast.error(t("errors.invalid_domain"))
            return
        }
        try {
            CronExpressionParser.parse(setupConfig.refresh_time)
        } catch {
            toast.error(t("errors.invalid_cron"))
            return
        }
        setStep(2)
    }

    return (
        <div className={"pt-36 flex justify-center"}>
            <div className={"w-lg"}>
                <div className={"mb-15"}>
                    <h1 className={"text-xl font-medium"}>
                        {t("step1.title")}
                    </h1>
                    <span className={"text-sm text-muted-foreground mb-8"}>
                        {t("step1.description")}
                    </span>
                </div>

                <FieldSet className="w-full">
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="domain">
                                {t("step1.domain_label")}
                            </FieldLabel>
                            <Input
                                id="domain"
                                type="text"
                                placeholder={t("step1.domain_placeholder")}
                                value={setupConfig.domain}
                                onInput={(e) => {
                                    setSetupConfig({
                                        ...setupConfig,
                                        domain: (e.target as HTMLInputElement)
                                            .value,
                                    })
                                }}
                            />
                            <FieldDescription>
                                {t("step1.domain_description")}
                            </FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="ref_time">
                                {t("step1.refresh_time_label")}
                            </FieldLabel>

                            <Input
                                id="ref_time"
                                placeholder={t(
                                    "step1.refresh_time_placeholder",
                                )}
                                value={setupConfig.refresh_time}
                                onInput={(e) => {
                                    setSetupConfig({
                                        ...setupConfig,
                                        refresh_time: (
                                            e.target as HTMLInputElement
                                        ).value,
                                    })
                                }}
                                className={"font-mono"}
                            />
                            <FieldDescription>
                                <b>
                                    {t("step1.refresh_time_description_bold")}
                                </b>
                                {t("step1.refresh_time_description")}
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                    <div className={"border-b"}></div>
                    <div className={"border p-4 rounded-xl"}>
                        <TransitionHeight>
                            <FieldGroup>
                                <Field orientation={"horizontal"}>
                                    <Checkbox
                                        checked={setupConfig.turnstile_enabled}
                                        onCheckedChange={(checked) => {
                                            setSetupConfig({
                                                ...setupConfig,
                                                turnstile_enabled: !!checked,
                                            })
                                        }}
                                        id="turnstile_enabled"
                                    ></Checkbox>
                                    <FieldContent>
                                        <FieldTitle>
                                            {t("step1.turnstile_title")}
                                        </FieldTitle>
                                        <FieldDescription>
                                            {t("step1.turnstile_description")}
                                        </FieldDescription>
                                    </FieldContent>
                                </Field>
                            </FieldGroup>
                            {setupConfig.turnstile_enabled && (
                                <>
                                    <FieldGroup className={"mt-7"}>
                                        <Field>
                                            <FieldLabel htmlFor="turnstile_site_key">
                                                {t(
                                                    "step1.turnstile_site_key_label",
                                                )}
                                            </FieldLabel>
                                            <Input
                                                id="turnstile_site_key"
                                                type="text"
                                                value={
                                                    setupConfig.turnstile_site_key
                                                }
                                                onInput={(e) => {
                                                    setSetupConfig({
                                                        ...setupConfig,
                                                        turnstile_site_key: (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    })
                                                }}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="turnstile_secret_key">
                                                {t(
                                                    "step1.turnstile_secret_key_label",
                                                )}
                                            </FieldLabel>
                                            <Input
                                                id="turnstile_secret_key"
                                                type="text"
                                                value={
                                                    setupConfig.turnstile_secret_key
                                                }
                                                onInput={(e) => {
                                                    setSetupConfig({
                                                        ...setupConfig,
                                                        turnstile_secret_key: (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    })
                                                }}
                                            />
                                        </Field>
                                    </FieldGroup>
                                    <div
                                        className={
                                            "text-sm text-muted-foreground mt-7"
                                        }
                                    >
                                        {t("step1.turnstile_hint_before")}&nbsp;
                                        <a
                                            className={
                                                "underline hover:text-primary"
                                            }
                                            href={
                                                "https://dash.cloudflare.com/?to=/:account/turnstile"
                                            }
                                        >
                                            {t("step1.turnstile_hint_link")}
                                        </a>
                                        &nbsp;{t("step1.turnstile_hint_after")}
                                    </div>
                                </>
                            )}
                        </TransitionHeight>
                    </div>
                    <FieldGroup>
                        <Button onClick={goNext}>
                            {t("common.next_step")}
                        </Button>
                    </FieldGroup>
                </FieldSet>

                <Collapsible className="rounded-md data-[state=open]:bg-muted">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="group w-full mt-4">
                            {t("step1.previous_installation_title")}
                            <span
                                className={
                                    "material-symbols-outlined ml-auto group-data-[state=open]:rotate-180 transition-transform"
                                }
                            >
                                keyboard_arrow_down
                            </span>
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="text-sm text-muted-foreground mt-4 mb-12">
                        <TransitionHeight>
                            <div className={"ml-4 mr-4"}>
                                {t("step1.previous_installation_description")}
                            </div>
                            <div
                                className={
                                    "rounded-lg border overflow-auto p-6 mt-4"
                                }
                            >
                                <pre>
                                    <code className={""}>
                                        {legacyLoading
                                            ? t("common.loading")
                                            : legacyConfig}
                                    </code>
                                </pre>
                            </div>
                        </TransitionHeight>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div>
    )
}

function SetupStep2({
    setStep,
    setupConfig,
    adminPayload,
    setAdminPayload,
}: {
    setStep: (n: number) => void
    setupConfig: SetupConfigPayload
    adminPayload: AdminSetupPayload
    setAdminPayload: (v: AdminSetupPayload) => void
}) {
    const { t } = useTranslation("setup")
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [isAvatarDragging, setIsAvatarDragging] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    const ALLOWED_AVATAR_EXTENSIONS = new Set([
        "gif",
        "bmp",
        "jpg",
        "jpeg",
        "png",
        "webp",
    ])
    function isAllowedAvatarFile(file: File) {
        const extension = file.name.split(".").pop()?.toLowerCase() || ""
        return ALLOWED_AVATAR_EXTENSIONS.has(extension)
    }
    function pickAvatar(files: FileList | null) {
        if (!files || files.length === 0) {
            return
        }
        const file = files[0]
        if (!isAllowedAvatarFile(file)) {
            toast.error(t("step2.avatar_invalid"))
            return
        }
        setAvatarFile(file)
    }

    async function handleSubmit() {
        if (submitting) {
            return
        }
        if (
            !adminPayload.name.trim() ||
            !adminPayload.email.trim() ||
            !adminPayload.password.trim()
        ) {
            toast.error(t("errors.admin_required"))
            return
        }

        setSubmitting(true)
        try {
            await apiRequest<null>("/api/setup/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(setupConfig),
            })

            let avatarPath: string | null = null
            if (avatarFile) {
                const formData = new FormData()
                formData.append("file", avatarFile)
                const avatarResp = await apiRequest<{ short_path: string }>(
                    "/api/setup/avatar",
                    {
                        method: "POST",
                        body: formData,
                    },
                )
                avatarPath = avatarResp.short_path
            }

            await apiRequest<null>("/api/setup/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...adminPayload,
                    password: adminPayload.password.trim(),
                    avatar: avatarPath,
                }),
            })

            await apiRequest<null>("/api/setup/finish")
            toast.success(t("step2.submit_success"))
            window.setTimeout(() => {
                window.location.href = "/dashboard/"
            }, 600)
        } catch (e) {
            const reason = e instanceof Error ? e.message : t("errors.unknown")
            toast.error(t("errors.submit_failed", { reason }))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={"pt-36 flex justify-center"}>
            <div className={"w-lg"}>
                <div className={"mb-15"}>
                    <h1 className={"text-xl font-medium"}>
                        {t("step2.title")}
                    </h1>
                    <span className={"text-sm text-muted-foreground mb-8"}>
                        {t("step2.description")}
                    </span>
                </div>

                <FieldSet className="w-full">
                    {!avatarFile ? (
                        <div
                            className={cn(
                                "text-xs w-full border-2 rounded-lg pt-4 pb-4 text-muted-foreground flex justify-center items-center cursor-pointer",
                                isAvatarDragging &&
                                    "border-foreground bg-foreground/10",
                            )}
                            onClick={() => {
                                avatarInputRef.current?.click()
                            }}
                            onDragEnter={(e) => {
                                e.preventDefault()
                                setIsAvatarDragging(true)
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault()
                                setIsAvatarDragging(false)
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                setIsAvatarDragging(true)
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                setIsAvatarDragging(false)
                                pickAvatar(e.dataTransfer?.files ?? null)
                            }}
                        >
                            <span className="material-symbols-outlined mr-1">
                                upload
                            </span>
                            {t("step2.avatar_pick")}
                        </div>
                    ) : (
                        <div className=" border-2 rounded-lg p-4 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate pr-2">
                                <img
                                    src={URL.createObjectURL(avatarFile)}
                                    alt="Avatar"
                                    className="size-10 rounded-full mr-2 inline"
                                />
                                {avatarFile.name}
                            </span>
                            <span
                                className="material-symbols-outlined cursor-pointer text-[1.5em]! opacity-70"
                                onClick={() => {
                                    setAvatarFile(null)
                                    if (avatarInputRef.current) {
                                        avatarInputRef.current.value = ""
                                    }
                                }}
                            >
                                close
                            </span>
                        </div>
                    )}
                    <input
                        ref={avatarInputRef}
                        type="file"
                        className="hidden"
                        accept=".gif,.bmp,.jpg,.jpeg,.png,.webp,image/gif,image/bmp,image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                            pickAvatar((e.target as HTMLInputElement).files)
                        }}
                    />
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">
                                {t("step2.name_label")}
                            </FieldLabel>
                            <Input
                                id="name"
                                type="text"
                                placeholder={t("step2.name_placeholder")}
                                value={adminPayload.name}
                                onInput={(e) => {
                                    setAdminPayload({
                                        ...adminPayload,
                                        name: (e.target as HTMLInputElement)
                                            .value,
                                    })
                                }}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="email">
                                {t("step2.email_label")}
                            </FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder={t("step2.email_placeholder")}
                                value={adminPayload.email}
                                onInput={(e) => {
                                    setAdminPayload({
                                        ...adminPayload,
                                        email: (e.target as HTMLInputElement)
                                            .value,
                                    })
                                }}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="password">
                                {t("step2.password_label")}
                            </FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                placeholder={t("step2.password_placeholder")}
                                value={adminPayload.password}
                                onInput={(e) => {
                                    setAdminPayload({
                                        ...adminPayload,
                                        password: (e.target as HTMLInputElement)
                                            .value,
                                    })
                                }}
                            />
                            <FieldDescription>
                                {t("step2.password_description")}
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                    <div className={"gap-2 flex flex-col"}>
                        <Button disabled={submitting} onClick={handleSubmit}>
                            {submitting
                                ? t("common.submitting")
                                : t("common.submit")}
                        </Button>
                        <Button variant={"outline"} onClick={() => setStep(1)}>
                            {t("common.back")}
                        </Button>
                    </div>
                </FieldSet>
            </div>
        </div>
    )
}

const appElement = document.getElementById("app")
if (appElement) {
    render(
        <Suspense fallback={<div />}>
            <App />
        </Suspense>,
        appElement,
    )
}
