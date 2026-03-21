import { useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import "../../components/i18n"
import { wfetch } from "../../dashboard/fetch"
import "../../public/style.css"
import { AdminUserContext, type ApiUser } from "../context/AdminUserContext"

const ALLOWED_AVATAR_EXTENSIONS = new Set([
    "gif",
    "bmp",
    "jpg",
    "jpeg",
    "png",
    "webp",
])

type ApiUserUpdate = {
    name?: string
    email?: string
    avatar?: string | null
    password?: string
}

async function parseApiPayload<T>(response: Response): Promise<T> {
    const data = await response.json()
    if (!data.success) {
        throw new Error(data.message || "API request failed")
    }
    return data.payload
}

async function uploadAvatarFileForUser(file: File) {
    const createResp = await wfetch("/api/item/__RANDOM__", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            item_type: "File",
            data: "none",
            extra_data: file.name,
        }),
    })

    const created = await parseApiPayload<{ short_path: string }>(createResp)
    const formData = new FormData()
    formData.append("file", file)

    const uploadResp = await wfetch(
        `/api/file/${encodeURIComponent(created.short_path)}`,
        {
            method: "POST",
            body: formData,
        },
    )
    await parseApiPayload<unknown>(uploadResp)

    return {
        shortPath: created.short_path,
        url: `/${created.short_path}`,
    }
}

async function cleanupUploadedAvatarItem(shortPath: string) {
    try {
        await wfetch(`/api/item/${encodeURIComponent(shortPath)}`, {
            method: "DELETE",
        })
    } catch (error) {
        console.error("Failed to cleanup uploaded avatar:", error)
    }
}

export function UserProfile() {
    const { t } = useTranslation("admin")
    const { currentUser, setCurrentUser } = useContext(AdminUserContext)
    const [name, setName] = useState(currentUser?.name || "")
    const [email, setEmail] = useState(currentUser?.email || "")
    const [password, setPassword] = useState("")
    const [updating, setUpdating] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [removeAvatar, setRemoveAvatar] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name)
            setEmail(currentUser.email)
        }
    }, [currentUser])

    function pickAvatar(files: FileList | null) {
        if (!files || files.length === 0) return

        const file = files[0]
        const ext = file.name.split(".").pop()?.toLowerCase()

        if (!ext || !ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
            toast.error(
                t("user_profile.avatar_invalid_type", {
                    defaultValue:
                        "Only gif, bmp, jpg, jpeg, png, webp are supported",
                }),
            )
            return
        }

        setAvatarFile(file)
        setRemoveAvatar(false)
    }

    async function handleUpdateProfile() {
        if (updating || !currentUser) {
            return
        }

        const trimmedName = name.trim()
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()
        let uploadedAvatarPath: string | null = null

        if (!trimmedName || !trimmedEmail) {
            toast.error(
                t("user_profile.validation_required", {
                    defaultValue: "Name and email are required",
                }),
            )
            return
        }

        const payload: ApiUserUpdate = {}
        if (trimmedName !== currentUser.name) {
            payload.name = trimmedName
        }
        if (trimmedEmail !== currentUser.email) {
            payload.email = trimmedEmail
        }
        if (trimmedPassword) {
            payload.password = trimmedPassword
        }

        setUpdating(true)
        try {
            if (avatarFile) {
                const uploaded = await uploadAvatarFileForUser(avatarFile)
                uploadedAvatarPath = uploaded.shortPath
                payload.avatar = uploaded.url
            } else if (removeAvatar) {
                payload.avatar = null
            }

            if (Object.keys(payload).length === 0) {
                toast.error(
                    t("user_profile.no_changes", {
                        defaultValue: "No changes to save",
                    }),
                )
                return
            }

            const resp = await wfetch(
                `/api/user/${encodeURIComponent(currentUser.id)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            )
            const updatedUser = await parseApiPayload<ApiUser>(resp)
            setCurrentUser(updatedUser)
            setAvatarFile(null)
            setRemoveAvatar(false)
            setPassword("")
            toast.success(
                t("user_profile.update_success", {
                    defaultValue: "Profile updated successfully",
                }),
            )
        } catch (error) {
            if (uploadedAvatarPath) {
                await cleanupUploadedAvatarItem(uploadedAvatarPath)
            }
            console.error(error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : t("user_profile.update_failed", {
                          defaultValue: "Failed to update profile",
                      }),
            )
        } finally {
            setUpdating(false)
        }
    }

    if (!currentUser) {
        return (
            <div className="ml-8 w-full px-4 mt-4">
                <div className="text-sm opacity-50">
                    {t("user_profile.loading", {
                        defaultValue: "Loading...",
                    })}
                </div>
            </div>
        )
    }

    const previewAvatar = avatarFile
        ? URL.createObjectURL(avatarFile)
        : removeAvatar
          ? null
          : currentUser.avatar

    return (
        <div className="ml-8 w-full max-w-2xl px-4 mt-4 mb-20">
            <div className="text-xl font-medium mb-2">
                {t("user_profile.title", {
                    defaultValue: "User Profile",
                })}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {t("user_profile.description", {
                    defaultValue: "View and update your user information",
                })}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    void handleUpdateProfile()
                }}
                className="space-y-8"
            >
                <FieldSet>
                    <FieldGroup className="gap-4">
                        <Field orientation="horizontal">
                            <div className="flex-1 flex items-end">
                                <Avatar
                                    className="size-20 cursor-pointer"
                                    onClick={() =>
                                        avatarInputRef.current?.click()
                                    }
                                >
                                    <AvatarImage
                                        src={previewAvatar || undefined}
                                    />
                                    <AvatarFallback>
                                        {currentUser.name[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div
                                    data-updating={updating}
                                    className={
                                        "-ml-6 bg-muted size-[1.8em] p-[0.2em] border-muted rounded-full z-10 cursor-pointer data-[updating=true]:cursor-not-allowed data-[updating=true]:text-muted-foreground"
                                    }
                                    onClick={() =>
                                        avatarInputRef.current?.click()
                                    }
                                >
                                    <span className="material-symbols-outlined text-[1.4em]!">
                                        upload
                                    </span>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={(e) =>
                                        pickAvatar(
                                            (e.target as HTMLInputElement)
                                                .files,
                                        )
                                    }
                                />
                            </div>
                        </Field>
                    </FieldGroup>
                </FieldSet>

                <FieldSet>
                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="profile_name">
                                {t("user_profile.name", {
                                    defaultValue: "Name",
                                })}
                            </FieldLabel>
                            <Input
                                id="profile_name"
                                value={name}
                                onInput={(e) =>
                                    setName(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }
                                placeholder={t(
                                    "user_profile.name_placeholder",
                                    {
                                        defaultValue: "Your name",
                                    },
                                )}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="profile_email">
                                {t("user_profile.email", {
                                    defaultValue: "Email",
                                })}
                            </FieldLabel>
                            <Input
                                id="profile_email"
                                type="email"
                                value={email}
                                onInput={(e) =>
                                    setEmail(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }
                                placeholder={t(
                                    "user_profile.email_placeholder",
                                    {
                                        defaultValue: "your@email.com",
                                    },
                                )}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="profile_created">
                                {t("user_profile.created_at", {
                                    defaultValue: "Created At",
                                })}
                            </FieldLabel>
                            <Input
                                id="profile_created"
                                type="text"
                                value={new Date(
                                    currentUser.created_at,
                                ).toLocaleString()}
                                disabled
                            />
                        </Field>
                    </FieldGroup>

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="profile_password">
                                {t("user_profile.password", {
                                    defaultValue: "Password",
                                })}
                            </FieldLabel>
                            <Input
                                id="profile_password"
                                type="password"
                                value={password}
                                onInput={(e) =>
                                    setPassword(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }
                                placeholder={t(
                                    "user_profile.password_placeholder",
                                    {
                                        defaultValue:
                                            "Leave blank to keep unchanged",
                                    },
                                )}
                            />
                            <FieldDescription>
                                {t("user_profile.password_description", {
                                    defaultValue:
                                        "Leave blank if you don't want to change your password",
                                })}
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                </FieldSet>

                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={updating}
                        className="min-w-24"
                    >
                        {updating ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-[1.4rem]! mr-2">
                                    autorenew
                                </span>
                                {t("user_profile.saving", {
                                    defaultValue: "Saving...",
                                })}
                            </>
                        ) : (
                            <>
                                {t("user_profile.save", {
                                    defaultValue: "Save",
                                })}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
