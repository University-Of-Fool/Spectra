import { useTranslation } from "react-i18next"
import "../../components/i18n"
import "../../public/style.css"
import type { Dispatch, SetStateAction } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { wfetch } from "../../dashboard/fetch"

const ROOT_USER_ID = "00000000-0000-0000-0000-000000000000"
const USER_DESCRIPTORS = ["Link", "File", "Code", "Manage"] as const
const ALLOWED_AVATAR_EXTENSIONS = new Set([
    "gif",
    "bmp",
    "jpg",
    "jpeg",
    "png",
    "webp",
])

type UserPermission = (typeof USER_DESCRIPTORS)[number]

export function UserManagement() {
    const { t } = useTranslation("admin")
    const [users, setUsers] = useState<ApiUser[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [newUserDialogOpen, setNewUserDialogOpen] = useState(false)
    const [successDialogOpen, setSuccessDialogOpen] = useState(false)
    const [createdCredential, setCreatedCredential] =
        useState<CreatedCredential | null>(null)
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

    useEffect(() => {
        void loadUsers()
    }, [])

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase()
        if (!keyword) {
            return users
        }

        return users.filter((user) => {
            const descriptorText = formatDescriptorList(user.descriptor, t)
            return [user.name, user.email, descriptorText]
                .join(" ")
                .toLowerCase()
                .includes(keyword)
        })
    }, [search, t, users])

    async function loadUsers() {
        setLoading(true)
        try {
            const resp = await wfetch("/api/users")
            const payload = await parseApiPayload<ApiListPayload<ApiUser>>(resp)
            setUsers(payload.items)
        } catch (error) {
            console.error(error)
            toast.error(
                getErrorMessage(
                    error,
                    t("user_management.load_failed", {
                        defaultValue: "Failed to load users",
                    }),
                ),
            )
        } finally {
            setLoading(false)
        }
    }

    async function handleDeleteUser(user: ApiUser) {
        if (user.id === ROOT_USER_ID) {
            toast.error(
                t("user_management.delete_root_forbidden", {
                    defaultValue: "Root user cannot be deleted",
                }),
            )
            return
        }

        setDeletingUserId(user.id)
        try {
            const resp = await wfetch(
                `/api/user/${encodeURIComponent(user.id)}`,
                {
                    method: "DELETE",
                },
            )
            await parseApiPayload<ApiUser>(resp)
            setUsers((current) => current.filter((item) => item.id !== user.id))
            toast.success(
                t("user_management.delete_success", {
                    defaultValue: "User deleted",
                }),
            )
        } catch (error) {
            console.error(error)
            toast.error(
                getErrorMessage(
                    error,
                    t("user_management.delete_failed", {
                        defaultValue: "Failed to delete user",
                    }),
                ),
            )
        } finally {
            setDeletingUserId(null)
        }
    }

    function handleUserCreated(user: ApiUser, password: string) {
        setUsers((current) => [user, ...current])
        setCreatedCredential({
            email: user.email,
            password,
        })
        setSuccessDialogOpen(true)
    }

    function handleUserUpdated(user: ApiUser) {
        setUsers((current) =>
            current.map((item) => (item.id === user.id ? user : item)),
        )
    }

    return (
        <div className="ml-8 w-full px-4 mt-4">
            <div className="text-xl font-medium mb-2">
                {t("user_management.title")}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {t("user_management.description")}
            </div>
            <div className="flex items-center mb-2 gap-2">
                <InputGroup className="w-60">
                    <InputGroupInput
                        placeholder={t("user_management.search_placeholder")}
                        value={search}
                        onInput={(e) => {
                            setSearch((e.target as HTMLInputElement).value)
                        }}
                    />
                    <InputGroupAddon>
                        <span className="material-symbols-outlined text-[1.5em]!">
                            search
                        </span>
                    </InputGroupAddon>
                </InputGroup>
                <NewUserDialog
                    open={newUserDialogOpen}
                    setOpen={setNewUserDialogOpen}
                    onCreated={handleUserCreated}
                />
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            {t("user_management.table.avatar")}
                        </TableHead>
                        <TableHead>{t("user_management.table.name")}</TableHead>
                        <TableHead>
                            {t("user_management.table.email")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.descriptor")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.shared_content_number")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.created_at")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.operations")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="text-center opacity-70"
                            >
                                {t("user_management.loading", {
                                    defaultValue: "Loading...",
                                })}
                            </TableCell>
                        </TableRow>
                    ) : filteredUsers.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="text-center opacity-70"
                            >
                                {t("user_management.empty", {
                                    defaultValue: "No users",
                                })}
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredUsers.map((user) => {
                            const deleting = deletingUserId === user.id
                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <Avatar className="size-8">
                                            <AvatarImage
                                                src={user.avatar || undefined}
                                            />
                                            <AvatarFallback>
                                                {user.name[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <div
                                            className={
                                                "flex flex-row flex-wrap gap-1"
                                            }
                                        >
                                            {user.descriptor.map((d) => (
                                                <Badge
                                                    key={d}
                                                    variant="outline"
                                                    className={cn("", {
                                                        "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300":
                                                            d !== "Manage",
                                                        "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300":
                                                            d === "Manage",
                                                    })}
                                                >
                                                    {t(
                                                        `user_management.descriptor_short.${d.toLowerCase()}`,
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.item_count}</TableCell>
                                    <TableCell>
                                        {new Date(
                                            user.created_at,
                                        ).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <div className="flex flex-row items-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleDeleteUser(user)
                                                }}
                                                disabled={deleting}
                                                // 不知道为什么 disabled 对它不起作用，
                                                // 用更显式的弹 toaster 的方式来提示

                                                // disabled={user.id === ROOT_USER_ID}
                                                className={cn(
                                                    "button-icon",
                                                    deleting && "opacity-50",
                                                )}
                                            >
                                                <span className="material-symbols-outlined point cursor-pointer text-[1.4rem]!">
                                                    delete
                                                </span>
                                            </button>
                                            <EditUserDialog
                                                user={user}
                                                onUpdated={handleUserUpdated}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
            <CreationSuccessfulDialog
                open={successDialogOpen}
                onOpenChange={setSuccessDialogOpen}
                credential={createdCredential}
            />
        </div>
    )
}

type ApiUserUpdate = {
    name?: string
    email?: string
    avatar?: string | null
    password?: string
}

type ApiUserCreate = {
    name: string
    email: string
    password: string
    descriptor: UserPermission[]
    avatar: string | null
}

type ApiUser = {
    id: string
    name: string
    email: string
    avatar: string | null
    created_at: string
    descriptor: UserPermission[]
    item_count: number
}

type ApiListPayload<T> = {
    total: number
    items: T[]
}

type ApiResponse<T> = {
    success: boolean
    payload: T
}

type CreatedCredential = {
    email: string
    password: string
}

function NewUserDialog({
    open,
    setOpen,
    onCreated,
}: {
    open: boolean
    setOpen: (open: boolean) => void
    onCreated: (user: ApiUser, password: string) => void
}) {
    const { t } = useTranslation("admin")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [generatePassword, setGeneratePassword] = useState(false)
    const [creating, setCreating] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [isAvatarDragging, setIsAvatarDragging] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)
    const [descriptors, setDescriptors] = useState<
        Record<UserPermission, boolean>
    >({
        Link: true,
        File: true,
        Code: true,
        Manage: false,
    })

    function resetForm() {
        setName("")
        setEmail("")
        setPassword("")
        setAvatarFile(null)
        setIsAvatarDragging(false)
        setGeneratePassword(false)
        if (avatarInputRef.current) {
            avatarInputRef.current.value = ""
        }
        setDescriptors({
            Link: true,
            File: true,
            Code: true,
            Manage: false,
        })
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && !creating) {
            resetForm()
        }
        setOpen(nextOpen)
    }

    function pickAvatar(files: FileList | null) {
        if (!files || files.length === 0) {
            return
        }
        const file = files[0]
        if (!isAllowedAvatarFile(file)) {
            toast.error(
                t("user_management.new_user_dialog.avatar_invalid_type", {
                    defaultValue:
                        "Only gif, bmp, jpg, png and webp image files are allowed",
                }),
            )
            return
        }
        setAvatarFile(file)
    }

    async function handleCreateUser() {
        if (creating) {
            return
        }

        const trimmedName = name.trim()
        const trimmedEmail = email.trim()
        const nextPassword = generatePassword
            ? createRandomPassword()
            : password.trim()
        let uploadedAvatarPath: string | null = null

        if (!trimmedName || !trimmedEmail || !nextPassword) {
            toast.error(
                t("user_management.new_user_dialog.validation_required", {
                    defaultValue: "Name, email, and password are required",
                }),
            )
            return
        }

        const payload: ApiUserCreate = {
            name: trimmedName,
            email: trimmedEmail,
            password: nextPassword,
            descriptor: USER_DESCRIPTORS.filter(
                (descriptor) => descriptors[descriptor],
            ),
            avatar: null,
        }

        setCreating(true)
        try {
            let avatarUrl: string | null = null
            if (avatarFile) {
                const uploaded = await uploadAvatarFileForUser(avatarFile)
                uploadedAvatarPath = `/${uploaded.shortPath}`
                avatarUrl = uploaded.url
            }

            const resp = await wfetch("/api/user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...payload,
                    avatar: avatarUrl,
                }),
            })
            const createdUser = await parseApiPayload<ApiUser>(resp)
            toast.success(
                t("user_management.create_success", {
                    defaultValue: "User created",
                }),
            )
            onCreated(createdUser, nextPassword)
            resetForm()
            setOpen(false)
        } catch (error) {
            if (uploadedAvatarPath) {
                await cleanupUploadedAvatarItem(uploadedAvatarPath)
            }
            console.error(error)
            toast.error(
                getErrorMessage(
                    error,
                    t("user_management.create_failed", {
                        defaultValue: "Failed to create user",
                    }),
                ),
            )
        } finally {
            setCreating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <span className="material-symbols-outlined text-[1.6em]!">
                        add
                    </span>
                    {t("user_management.button_new_user")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        void handleCreateUser()
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {t("user_management.new_user_dialog.title")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("user_management.new_user_dialog.description")}
                        </DialogDescription>
                    </DialogHeader>

                    {!avatarFile ? (
                        <div
                            className={cn(
                                "text-xs w-full border-2 rounded-lg mt-4 pt-2 pb-2 text-muted-foreground flex justify-center items-center cursor-pointer",
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
                            {t(
                                "user_management.new_user_dialog.upload_avatar_instruction",
                            )}
                        </div>
                    ) : (
                        <div className="mt-4 border-2 rounded-lg p-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate pr-2">
                                <img
                                    src={URL.createObjectURL(avatarFile)}
                                    alt="Avatar"
                                    className="size-6 rounded-full mr-2 inline"
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

                    <FieldGroup className="gap-3 mt-2 pb-4">
                        <Field>
                            <Input
                                id="dlg_name"
                                value={name}
                                onInput={(e) => {
                                    setName(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }}
                                placeholder={t(
                                    "user_management.new_user_dialog.name",
                                )}
                            />
                        </Field>
                        <Field>
                            <Input
                                id="dlg_email"
                                value={email}
                                onInput={(e) => {
                                    setEmail(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }}
                                placeholder={t(
                                    "user_management.new_user_dialog.email",
                                )}
                            />
                        </Field>
                        <Field>
                            <Input
                                id="dlg_password"
                                type="password"
                                value={password}
                                disabled={generatePassword}
                                onInput={(e) => {
                                    setPassword(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }}
                                placeholder={t(
                                    "user_management.new_user_dialog.password",
                                )}
                            />
                        </Field>
                        <Field orientation="horizontal">
                            <Checkbox
                                id="dlg_generate_password"
                                checked={generatePassword}
                                onCheckedChange={(checked) => {
                                    setGeneratePassword(!!checked)
                                }}
                            ></Checkbox>
                            <FieldLabel htmlFor="dlg_generate_password">
                                {t(
                                    "user_management.new_user_dialog.generate_password",
                                )}
                            </FieldLabel>
                        </Field>
                        <Separator></Separator>
                        <DescriptorSelection
                            descriptors={descriptors}
                            setDescriptors={setDescriptors}
                        />
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={creating}>
                                {t("user_management.new_user_dialog.cancel")}
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={creating}>
                            {t("user_management.new_user_dialog.create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditUserDialog({
    user,
    onUpdated,
}: {
    user: ApiUser
    onUpdated: (user: ApiUser) => void
}) {
    const { t } = useTranslation("admin")
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(user.name)
    const [email, setEmail] = useState(user.email)
    const [password, setPassword] = useState("")
    const [updating, setUpdating] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [removeAvatar, setRemoveAvatar] = useState(false)
    const [isAvatarDragging, setIsAvatarDragging] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    function resetForm() {
        setName(user.name)
        setEmail(user.email)
        setPassword("")
        setAvatarFile(null)
        setRemoveAvatar(false)
        setIsAvatarDragging(false)
        if (avatarInputRef.current) {
            avatarInputRef.current.value = ""
        }
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && !updating) {
            resetForm()
        }
        setOpen(nextOpen)
    }

    function pickAvatar(files: FileList | null) {
        if (!files || files.length === 0) {
            return
        }
        const file = files[0]
        if (!isAllowedAvatarFile(file)) {
            toast.error(
                t("user_management.edit_user_dialog.avatar_invalid_type", {
                    defaultValue:
                        "Only gif, bmp, jpg, png and webp image files are allowed",
                }),
            )
            return
        }
        setAvatarFile(file)
        setRemoveAvatar(false)
    }

    async function handleUpdateUser() {
        if (updating) {
            return
        }

        const trimmedName = name.trim()
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()
        let uploadedAvatarPath: string | null = null

        if (!trimmedName || !trimmedEmail) {
            toast.error(
                t("user_management.edit_user_dialog.validation_required", {
                    defaultValue: "Name and email are required",
                }),
            )
            return
        }

        const payload: ApiUserUpdate = {}
        if (trimmedName !== user.name) {
            payload.name = trimmedName
        }
        if (trimmedEmail !== user.email) {
            payload.email = trimmedEmail
        }
        if (trimmedPassword) {
            payload.password = trimmedPassword
        }

        setUpdating(true)
        try {
            if (avatarFile) {
                const uploaded = await uploadAvatarFileForUser(avatarFile)
                uploadedAvatarPath = `/${uploaded.shortPath}`
                payload.avatar = uploaded.url
            } else if (removeAvatar) {
                payload.avatar = null
            }

            if (Object.keys(payload).length === 0) {
                toast.error(
                    t("user_management.edit_user_dialog.no_changes", {
                        defaultValue: "No changes to save",
                    }),
                )
                return
            }

            const resp = await wfetch(
                `/api/user/${encodeURIComponent(user.id)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            )
            const updatedUser = await parseApiPayload<ApiUser>(resp)
            toast.success(
                t("user_management.update_success", {
                    defaultValue: "User updated",
                }),
            )
            onUpdated(updatedUser)
            setOpen(false)
            resetForm()
        } catch (error) {
            if (uploadedAvatarPath) {
                await cleanupUploadedAvatarItem(uploadedAvatarPath)
            }
            console.error(error)
            toast.error(
                getErrorMessage(
                    error,
                    t("user_management.update_failed", {
                        defaultValue: "Failed to update user",
                    }),
                ),
            )
        } finally {
            setUpdating(false)
        }
    }

    const previewAvatar = avatarFile
        ? URL.createObjectURL(avatarFile)
        : removeAvatar
          ? null
          : user.avatar
    const hasExistingAvatar = Boolean(user.avatar) && !removeAvatar

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="button-icon"
                    title={t("user_management.edit_user_dialog.open", {
                        defaultValue: "Edit user",
                    })}
                >
                    <span className="material-symbols-outlined point cursor-pointer text-[1.4rem]!">
                        edit
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        void handleUpdateUser()
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {t("user_management.edit_user_dialog.title")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("user_management.edit_user_dialog.description")}
                        </DialogDescription>
                    </DialogHeader>

                    {!avatarFile ? (
                        <div
                            className={cn(
                                "text-xs w-full border-2 rounded-lg mt-4 pt-2 pb-2 text-muted-foreground flex justify-center items-center cursor-pointer",
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
                            {t(
                                "user_management.edit_user_dialog.upload_avatar_instruction",
                            )}
                        </div>
                    ) : null}

                    <div className="mt-2 border-2 rounded-lg p-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate pr-2">
                            {previewAvatar ? (
                                <img
                                    src={previewAvatar}
                                    alt="Avatar"
                                    className="size-6 rounded-full mr-2 inline"
                                />
                            ) : (
                                <span className="inline-block size-6 rounded-full mr-2 bg-muted align-middle"></span>
                            )}
                            {avatarFile
                                ? avatarFile.name
                                : previewAvatar
                                  ? t(
                                        "user_management.edit_user_dialog.current_avatar",
                                    )
                                  : t(
                                        "user_management.edit_user_dialog.no_avatar",
                                    )}
                        </span>
                        {avatarFile ? (
                            <span
                                className="material-symbols-outlined cursor-pointer text-[1.5em]! opacity-70"
                                onClick={() => {
                                    setAvatarFile(null)
                                    if (avatarInputRef.current) {
                                        avatarInputRef.current.value = ""
                                    }
                                }}
                                title={t(
                                    "user_management.edit_user_dialog.clear_selected_avatar",
                                )}
                            >
                                close
                            </span>
                        ) : null}
                    </div>

                    {hasExistingAvatar ? (
                        <div className="mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRemoveAvatar(true)
                                    setAvatarFile(null)
                                    if (avatarInputRef.current) {
                                        avatarInputRef.current.value = ""
                                    }
                                }}
                            >
                                {t(
                                    "user_management.edit_user_dialog.remove_avatar",
                                )}
                            </Button>
                        </div>
                    ) : null}

                    <input
                        ref={avatarInputRef}
                        type="file"
                        className="hidden"
                        accept=".gif,.bmp,.jpg,.jpeg,.png,.webp,image/gif,image/bmp,image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                            pickAvatar((e.target as HTMLInputElement).files)
                        }}
                    />

                    <FieldGroup className="gap-3 mt-2 pb-4">
                        <Field>
                            <Input
                                id={`edit_name_${user.id}`}
                                value={name}
                                onInput={(e) => {
                                    setName(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }}
                                placeholder={t(
                                    "user_management.new_user_dialog.name",
                                )}
                            />
                        </Field>
                        <Field>
                            <Input
                                id={`edit_email_${user.id}`}
                                value={email}
                                onInput={(e) => {
                                    setEmail(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }}
                                placeholder={t(
                                    "user_management.new_user_dialog.email",
                                )}
                            />
                        </Field>
                        <Field>
                            <Input
                                id={`edit_password_${user.id}`}
                                type="password"
                                value={password}
                                onInput={(e) => {
                                    setPassword(
                                        (e.target as HTMLInputElement).value,
                                    )
                                }}
                                placeholder={t(
                                    "user_management.edit_user_dialog.password_placeholder",
                                )}
                            />
                        </Field>
                    </FieldGroup>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={updating}>
                                {t("user_management.new_user_dialog.cancel")}
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={updating}>
                            {t("user_management.edit_user_dialog.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DescriptorSelection({
    descriptors,
    setDescriptors,
}: {
    descriptors: Record<UserPermission, boolean>
    setDescriptors: Dispatch<SetStateAction<Record<UserPermission, boolean>>>
}) {
    const { t } = useTranslation("admin")
    return (
        <FieldSet>
            <FieldLegend variant="label">
                {t(
                    "user_management.new_user_dialog.descriptor_selection_title",
                )}
            </FieldLegend>
            <FieldGroup className="gap-3">
                {USER_DESCRIPTORS.map((descriptor) => (
                    <Field orientation="horizontal" key={descriptor}>
                        <Checkbox
                            id={`dlg-checkbox-${descriptor}`}
                            checked={descriptors[descriptor]}
                            onCheckedChange={(checked) => {
                                setDescriptors((current) => ({
                                    ...current,
                                    [descriptor]: !!checked,
                                }))
                            }}
                        />
                        <FieldLabel
                            htmlFor={`dlg-checkbox-${descriptor}`}
                            className="font-normal"
                        >
                            {`${t(`user_management.descriptor.${descriptor.toLowerCase()}`)} (${descriptor})`}
                        </FieldLabel>
                    </Field>
                ))}
            </FieldGroup>
        </FieldSet>
    )
}

function CreationSuccessfulDialog({
    open,
    onOpenChange,
    credential,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    credential: CreatedCredential | null
}) {
    const { t } = useTranslation("admin")
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {t("user_management.successful_dialog.title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("user_management.successful_dialog.description")}
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    <Field>
                        <Label htmlFor="s_dlg_email">
                            {t("user_management.new_user_dialog.email")}
                        </Label>
                        <Input
                            id="s_dlg_email"
                            value={credential?.email || ""}
                            disabled
                        />
                    </Field>
                    <Field>
                        <Label htmlFor="s_dlg_password">
                            {t("user_management.new_user_dialog.password")}
                        </Label>
                        <Input
                            id="s_dlg_password"
                            value={credential?.password || ""}
                            readOnly
                        />
                    </Field>
                </FieldGroup>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>
                            {t("user_management.successful_dialog.ok")}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

async function parseApiPayload<T>(resp: Response): Promise<T> {
    const data: ApiResponse<T | string> = await resp.json()
    if (!resp.ok || !data.success) {
        throw new Error(
            typeof data.payload === "string"
                ? data.payload
                : "Unexpected API response",
        )
    }
    return data.payload as T
}

function formatDescriptorList(
    descriptors: ApiUser["descriptor"],
    t: ReturnType<typeof useTranslation>["t"],
) {
    return descriptors
        .map((descriptor) => getDescriptorLabel(descriptor, t))
        .join(", ")
}

function getDescriptorLabel(
    descriptor: UserPermission,
    t: ReturnType<typeof useTranslation>["t"],
) {
    return t(`user_management.descriptor.${descriptor.toLowerCase()}`)
}

function isAllowedAvatarFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    return ALLOWED_AVATAR_EXTENSIONS.has(extension)
}

function buildSharedUrl(path: string) {
    const normalized = path.replace(/^\/+/, "")
    return `${window.location.origin}/${normalized}`
}

function createRandomPassword(length = 16) {
    const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*().-"
    const values = crypto.getRandomValues(new Uint32Array(length))
    return Array.from(values, (value) => charset[value % charset.length]).join(
        "",
    )
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message
    }
    return fallback
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
        url: buildSharedUrl(created.short_path),
    }
}

async function cleanupUploadedAvatarItem(shortPath: string) {
    try {
        const pathOnly = shortPath.replace(/^\/+/, "")
        const resp = await wfetch(`/api/item/${encodeURIComponent(pathOnly)}`, {
            method: "DELETE",
        })
        await parseApiPayload<unknown>(resp)
    } catch (error) {
        console.error(error)
    }
}
