import { useEffect, useState } from "react"
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
import { cn } from "@/lib/utils"
import "../../components/i18n"
import { wfetch } from "../../dashboard/fetch"
import "../../public/style.css"

type AdminConfig = {
    setup: boolean
    cookie_key: string
    refresh_time: string
    domain: string
    turnstile_enabled: boolean
    turnstile_site_key: string
    turnstile_secret_key: string
}

export function Settings() {
    const { t: tAdmin } = useTranslation("admin")
    const { t: tSetup } = useTranslation("setup")
    const [config, setConfig] = useState<AdminConfig | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        void loadConfig()
    }, [])

    async function loadConfig() {
        setLoading(true)
        try {
            const resp = await wfetch("/api/config/admin")
            const data = await resp.json()
            if (data.success) {
                setConfig(data.payload)
            } else {
                toast.error(data.message || tAdmin("settings.load_failed"))
            }
        } catch (error) {
            console.error(error)
            toast.error(tAdmin("settings.load_failed"))
        } finally {
            setLoading(false)
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!config) return
        setSaving(true)
        try {
            const resp = await wfetch("/api/config/admin", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            })
            const data = await resp.json()
            if (data.success) {
                toast.success(tAdmin("settings.save_success"))
            } else {
                toast.error(data.message || tAdmin("settings.save_failed"))
            }
        } catch (error) {
            console.error(error)
            toast.error(tAdmin("settings.save_failed"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="ml-8 w-full max-w-3xl px-4 mt-4 mb-20">
            <div className="text-xl font-medium mb-2">
                {tAdmin("settings.title")}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {tAdmin("settings.description")}
            </div>

            {loading ? (
                <div className="opacity-70">{tAdmin("settings.loading")}</div>
            ) : !config ? (
                <div className="opacity-70 text-red-500">
                    {tAdmin("settings.load_failed")}
                </div>
            ) : (
                <form
                    onSubmit={(e) => void handleSave(e)}
                    className="space-y-8"
                >
                    <FieldSet>
                        <FieldTitle className="text-lg font-semibold mb-4">
                            {tAdmin("settings.general_section")}
                        </FieldTitle>
                        <FieldGroup className="gap-4">
                            <Field>
                                <FieldLabel htmlFor="domain">
                                    {tSetup("step1.domain_label")}
                                </FieldLabel>
                                <Input
                                    id="domain"
                                    value={config.domain}
                                    onInput={(e) =>
                                        setConfig({
                                            ...config,
                                            domain: (
                                                e.target as HTMLInputElement
                                            ).value,
                                        })
                                    }
                                />
                                <FieldDescription>
                                    {tSetup("step1.domain_description")}
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldSet>

                    <div className="border-b" />

                    <FieldSet>
                        <FieldTitle className="text-lg font-semibold mb-4">
                            {tAdmin("settings.turnstile_section")}
                        </FieldTitle>
                        <FieldGroup className="gap-4">
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="turnstile_enabled"
                                    checked={config.turnstile_enabled}
                                    onCheckedChange={(checked) =>
                                        setConfig({
                                            ...config,
                                            turnstile_enabled: !!checked,
                                        })
                                    }
                                />
                                <FieldContent>
                                    <FieldTitle>
                                        {tSetup("step1.turnstile_title")}
                                    </FieldTitle>
                                    <FieldDescription>
                                        {tSetup("step1.turnstile_description")}
                                    </FieldDescription>
                                </FieldContent>
                            </Field>

                            {config.turnstile_enabled && (
                                <FieldGroup className="gap-4 mt-4">
                                    <Field>
                                        <FieldLabel htmlFor="turnstile_site_key">
                                            {tSetup(
                                                "step1.turnstile_site_key_label",
                                            )}
                                        </FieldLabel>
                                        <Input
                                            id="turnstile_site_key"
                                            value={config.turnstile_site_key}
                                            onInput={(e) =>
                                                setConfig({
                                                    ...config,
                                                    turnstile_site_key: (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                })
                                            }
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="turnstile_secret_key">
                                            {tSetup(
                                                "step1.turnstile_secret_key_label",
                                            )}
                                        </FieldLabel>
                                        <Input
                                            id="turnstile_secret_key"
                                            value={config.turnstile_secret_key}
                                            onInput={(e) =>
                                                setConfig({
                                                    ...config,
                                                    turnstile_secret_key: (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                })
                                            }
                                        />
                                    </Field>
                                    <div className="text-sm text-muted-foreground">
                                        {tAdmin("settings.turnstile_tip")}
                                        <a
                                            href="https://dash.cloudflare.com/?to=/:account/turnstile"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline"
                                        >
                                            https://dash.cloudflare.com/?to=/:account/turnstile
                                        </a>
                                    </div>
                                </FieldGroup>
                            )}
                        </FieldGroup>
                    </FieldSet>
                    <div className={"border-b"}></div>
                    <Collapsible className={"group"}>
                        <CollapsibleTrigger asChild>
                            <div className="w-full cursor-pointer mb-4">
                                <div
                                    className={
                                        "text-lg font-semibold mb-2 w-full flex items-center"
                                    }
                                >
                                    {tAdmin("settings.advanced_section")}
                                    <span
                                        className={
                                            "material-symbols-outlined ml-auto group-data-[state=open]:rotate-180 transition-transform"
                                        }
                                    >
                                        keyboard_arrow_down
                                    </span>
                                </div>
                                <span
                                    className={"text-sm text-muted-foreground"}
                                >
                                    {tAdmin(
                                        "settings.advanced_section_description",
                                    )}
                                </span>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                            <FieldSet>
                                <FieldGroup>
                                    <Field className={"mt-7"}>
                                        <FieldLabel htmlFor="refresh_time">
                                            {tSetup("step1.refresh_time_label")}
                                        </FieldLabel>
                                        <Input
                                            id="refresh_time"
                                            value={config.refresh_time}
                                            onInput={(e) =>
                                                setConfig({
                                                    ...config,
                                                    refresh_time: (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                })
                                            }
                                            placeholder={tSetup(
                                                "step1.refresh_time_placeholder",
                                            )}
                                            className="font-mono"
                                        />
                                        <FieldDescription>
                                            <b>
                                                {tSetup(
                                                    "step1.refresh_time_description_bold",
                                                )}
                                            </b>
                                            {tSetup(
                                                "step1.refresh_time_description",
                                            )}
                                        </FieldDescription>
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="cookie_key">
                                            {tAdmin(
                                                "settings.cookie_key_label",
                                            )}
                                        </FieldLabel>
                                        <Input
                                            id="cookie_key"
                                            value={config.cookie_key}
                                            onInput={(e) =>
                                                setConfig({
                                                    ...config,
                                                    cookie_key: (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                })
                                            }
                                        />
                                        <FieldDescription
                                            className={cn("text-red-400")}
                                        >
                                            {tAdmin(
                                                "settings.cookie_key_warning",
                                            )}
                                        </FieldDescription>
                                    </Field>
                                </FieldGroup>
                            </FieldSet>
                        </CollapsibleContent>
                    </Collapsible>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving
                                ? tAdmin("settings.saving")
                                : tAdmin("settings.save_button")}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    )
}
