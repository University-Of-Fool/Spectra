import { CronExpressionParser } from "cron-parser"
import { render, Suspense, useEffect, useRef, useState } from "react"
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
import { TransitionHeight } from "../../components/HeightTransition"
import type { SetupConfigPayload } from "../interface"
import { apiRequest } from "../utils"
import { Switch } from "@/components/ui/switch"

export function SetupStep1({
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
        <div className={"pt-8 flex justify-center"}>
            <div className={"w-lg"}>
                <div className={"mb-12"}>
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

                    <div className={"border rounded-xl"}>
                        <TransitionHeight className="p-4">
                            <FieldGroup>
                                <Field orientation={"horizontal"} className={"flex items-center!"}>
                                    <FieldContent>
                                        <FieldTitle>
                                            {t("step1.turnstile_title")}
                                        </FieldTitle>
                                        <FieldDescription>
                                            {t("step1.turnstile_description")}
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        className={"ml-auto"}
                                        id="turnstile_enabled"
                                        checked={setupConfig.turnstile_enabled}
                                        onCheckedChange={(checked) => {
                                            setSetupConfig({
                                                ...setupConfig,
                                                turnstile_enabled: !!checked,
                                            })
                                        }}
                                    />
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

                <Collapsible className={"mt-8"}>
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
