import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import "../../components/i18n"
import type { AdminSetupPayload, SetupConfigPayload } from "../interface"

import { apiRequest } from "../utils"

export function SetupStep2({
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
        <div className={"pt-8 flex justify-center"}>
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
