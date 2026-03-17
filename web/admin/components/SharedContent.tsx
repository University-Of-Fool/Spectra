import "../../components/i18n"
import "../../public/style.css"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
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

const PAGE_SIZE = 25

type SharedItem = {
    id: string
    short_path: string
    item_type: string
    visits: number
    created_at: string
    creator: string | null
    available: boolean
}

type ApiListPayload<T> = {
    total: number
    items: T[]
}

type ApiResponse<T> = {
    success: boolean
    payload: T
}

type ApiUser = {
    id: string
    name: string
    email: string
    avatar: string | null
    created_at: string
    descriptor: ("Manage" | "Code" | "Link" | "File")[]
}

export function SharedContent() {
    const { t } = useTranslation("admin")
    const [items, setItems] = useState<SharedItem[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [search, setSearch] = useState("")
    const [ownerMap, setOwnerMap] = useState<Record<string, string>>({})
    const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)

    const getTypeLabel = (itemType: string) => {
        switch (itemType) {
            case "Link":
                return t("shared_content.type.link", {
                    defaultValue: "Short URL",
                })
            case "File":
                return t("shared_content.type.file", { defaultValue: "File" })
            case "Code":
                return t("shared_content.type.code", { defaultValue: "Code" })
            default:
                return itemType
        }
    }

    const getStatusLabel = (available: boolean) =>
        available
            ? t("shared_content.status.valid", { defaultValue: "Valid" })
            : t("shared_content.status.invalid", { defaultValue: "Invalid" })

    async function loadOwners() {
        try {
            const resp = await wfetch("/api/users")
            if (!resp.ok) {
                return
            }
            const data: ApiResponse<ApiListPayload<ApiUser>> = await resp.json()
            if (!data.success) {
                return
            }
            const map: Record<string, string> = {}
            data.payload.items.forEach((user) => {
                map[user.id] = user.name
            })
            setOwnerMap(map)
        } catch (e) {
            console.error(e)
        }
    }

    async function loadItems(targetPage: number, userId?: string) {
        setLoading(true)
        try {
            const offset = targetPage * PAGE_SIZE
            const endpoint = userId
                ? `/api/items?user=${encodeURIComponent(userId)}&offset=${offset}&limit=${PAGE_SIZE}`
                : `/api/items/all?offset=${offset}&limit=${PAGE_SIZE}`
            const resp = await wfetch(endpoint)
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`)
            }
            const data: ApiResponse<ApiListPayload<SharedItem>> =
                await resp.json()
            if (!data.success) {
                throw new Error("api returned success=false")
            }
            setItems(data.payload.items)
            setTotal(Math.max(0, data.payload.total))
            setPage(targetPage)
        } catch (e) {
            console.error(e)
            toast.error(
                t("shared_content.error_loading", {
                    defaultValue: "Failed to load shared items",
                }),
            )
        } finally {
            setLoading(false)
        }
    }

    function buildItemUrl(path: string) {
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path
        }
        return `${window.location.origin}/${path}`
    }

    async function deleteItem(path: string) {
        try {
            const resp = await wfetch(`/api/item/${encodeURIComponent(path)}`, {
                method: "DELETE",
            })
            const data: ApiResponse<unknown> = await resp.json()
            if (!resp.ok || !data.success) {
                throw new Error("delete failed")
            }
            toast.success(
                t("shared_content.delete_success", {
                    defaultValue: "Deleted",
                }),
            )

            const targetPage = page > 0 && items.length === 1 ? page - 1 : page
            await loadItems(targetPage, selectedUser?.id)
        } catch (e) {
            console.error(e)
            toast.error(
                t("shared_content.delete_failed", {
                    defaultValue: "Failed to delete",
                }),
            )
        }
    }

    const filteredItems = useMemo(() => {
        const keyword = search.trim().toLowerCase()
        if (!keyword) return items

        return items.filter((item) => {
            const owner = item.creator
                ? (ownerMap[item.creator] ?? item.creator)
                : "-"
            const typeText = getTypeLabel(item.item_type)
            const link = buildItemUrl(item.short_path)
            const statusText = getStatusLabel(item.available)

            return [owner, typeText, link, statusText]
                .join(" ")
                .toLowerCase()
                .includes(keyword)
        })
    }, [items, ownerMap, search, t])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const hasPrev = page > 0
    const hasNext = page + 1 < totalPages

    type PaginationEntry =
        | { type: "page"; page: number }
        | { type: "ellipsis"; key: string }

    const paginationItems = useMemo<PaginationEntry[]>(() => {
        const currentPage = page + 1
        const pages = new Set([
            1,
            totalPages,
            currentPage,
            Math.max(1, currentPage - 1),
            Math.min(totalPages, currentPage + 1),
        ])
        if (currentPage <= 4) {
            for (let i = 1; i <= 5; i++) {
                if (i <= totalPages) pages.add(i)
            }
        }
        if (totalPages - currentPage < 4) {
            for (let i = totalPages - 4; i <= totalPages; i++) {
                if (i > 0) pages.add(i)
            }
        }
        const sorted = [...pages].sort((a, b) => a - b)
        const result: PaginationEntry[] = []
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0) {
                const gap = sorted[i] - sorted[i - 1]
                if (gap === 2) {
                    // 只差一页时直接展示，避免省略号反而更长
                    result.push({ type: "page", page: sorted[i - 1] + 1 })
                } else if (gap > 2) {
                    result.push({ type: "ellipsis", key: `ellipsis-${i}` })
                }
            }
            result.push({ type: "page", page: sorted[i] })
        }
        return result
    }, [page, totalPages])

    useEffect(() => {
        loadOwners()
    }, [])

    useEffect(() => {
        loadItems(0, selectedUser?.id)
    }, [selectedUser])

    return (
        <div className="ml-8 w-full px-4 mt-4">
            <div className="text-xl font-medium mb-2">
                {t("shared_content.title")}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {t("shared_content.description")}
            </div>
            <div className={"flex items-center mb-2 gap-2"}>
                <InputGroup className="w-60">
                    <InputGroupInput
                        placeholder={t("shared_content.search_placeholder")}
                        value={search}
                        onInput={(e) => {
                            setSearch((e.target as HTMLInputElement).value)
                        }}
                    />
                    <InputGroupAddon>
                        <span
                            className={
                                "material-symbols-outlined text-[1.5em]!"
                            }
                        >
                            search
                        </span>
                    </InputGroupAddon>
                </InputGroup>
                <UserSelector
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    t={t}
                />
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("shared_content.table.owner")}</TableHead>
                        <TableHead>{t("shared_content.table.type")}</TableHead>
                        <TableHead>{t("shared_content.table.link")}</TableHead>
                        <TableHead>
                            {t("shared_content.table.status")}
                        </TableHead>
                        <TableHead>
                            {t("shared_content.table.visits")}
                        </TableHead>
                        <TableHead>{t("shared_content.table.time")}</TableHead>
                        <TableHead>
                            {t("shared_content.table.operations")}
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
                                {t("shared_content.loading", {
                                    defaultValue: "Loading...",
                                })}
                            </TableCell>
                        </TableRow>
                    ) : filteredItems.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="text-center opacity-70"
                            >
                                {t("shared_content.empty", {
                                    defaultValue: "No shared items",
                                })}
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredItems.map((item) => {
                            const pathOnly = item.short_path.replace(/^\//, "")
                            const link = buildItemUrl(pathOnly)
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.creator
                                            ? (ownerMap[item.creator] ??
                                              item.creator)
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {getTypeLabel(item.item_type)}
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="hover:underline"
                                        >
                                            {link}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
                                                item.available &&
                                                    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
                                            )}
                                        >
                                            {getStatusLabel(item.available)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{item.visits}</TableCell>
                                    <TableCell>
                                        {new Date(
                                            item.created_at,
                                        ).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                deleteItem(pathOnly)
                                            }}
                                            class={"button-icon"}
                                        >
                                            <span
                                                className={
                                                    "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                                }
                                            >
                                                delete
                                            </span>
                                        </button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
            {totalPages > 1 ? (
                <div className="mt-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    className={
                                        !hasPrev || loading
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (!hasPrev || loading) return
                                        loadItems(page - 1, selectedUser?.id)
                                    }}
                                />
                            </PaginationItem>
                            {paginationItems.map((item) =>
                                item.type === "ellipsis" ? (
                                    <PaginationItem key={item.key}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={item.page}>
                                        <PaginationLink
                                            href="#"
                                            isActive={item.page === page + 1}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (loading) return
                                                loadItems(
                                                    item.page - 1,
                                                    selectedUser?.id,
                                                )
                                            }}
                                        >
                                            {item.page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ),
                            )}
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    className={
                                        !hasNext || loading
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (!hasNext || loading) return
                                        loadItems(page + 1, selectedUser?.id)
                                    }}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            ) : null}
        </div>
    )
}

function UserSelector({
    selectedUser,
    setSelectedUser,
    t,
}: {
    selectedUser: ApiUser | null
    setSelectedUser: React.Dispatch<React.SetStateAction<ApiUser | null>>
    t: ReturnType<typeof useTranslation>["t"]
}) {
    const [search, setSearch] = useState("")
    const [userList, setUserList] = useState<ApiListPayload<ApiUser> | null>(
        null,
    )

    useEffect(() => {
        wfetch("/api/users").then(async (resp) => {
            // 能触发这个函数的按理来说应该是有权限的用户，这里就不单独判断是否是 403 了
            if (!resp.ok) {
                toast.error(t("authorization.service_unavailable"))
                return
            }
            try {
                const data: ApiResponse<ApiListPayload<ApiUser>> =
                    await resp.json()
                setUserList(data.success ? data.payload : null)
            } catch (e) {
                toast.error(t("authorization.service_unavailable"))
                console.error(e)
                return
            }
        })
    }, [])

    const filteredUsers = useMemo(() => {
        if (userList === null) {
            return []
        }
        const keyword = search.trim().toLowerCase()
        if (!keyword) {
            return userList.items
        }
        return userList.items.filter((user) =>
            [user.name, user.email].join(" ").toLowerCase().includes(keyword),
        )
    }, [search, userList])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    {selectedUser !== null ? (
                        <>
                            <Avatar className="size-5">
                                <AvatarImage
                                    src={selectedUser.avatar || undefined}
                                />{" "}
                                <AvatarFallback>
                                    {selectedUser.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {selectedUser.name}
                        </>
                    ) : (
                        <>
                            <span
                                className={
                                    "material-symbols-outlined text-[1.6em]!"
                                }
                            >
                                filter_list
                            </span>
                            {t("shared_content.button_filter_user", {
                                defaultValue: "Filter",
                            })}
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className={
                    "max-h-(--radix-popover-content-available-height) overflow-x-hidden flex flex-col pr-0"
                }
                collisionPadding={20}
            >
                <div className={"mr-4"}>
                    <InputGroup>
                        <InputGroupInput
                            placeholder={t(
                                "shared_content.user_selector.search_placeholder",
                            )}
                            value={search}
                            onInput={(e) => {
                                setSearch((e.target as HTMLInputElement).value)
                            }}
                        />
                        <InputGroupAddon>
                            <span
                                className={
                                    "material-symbols-outlined text-[1.6em]!"
                                }
                            >
                                search
                            </span>
                        </InputGroupAddon>
                    </InputGroup>
                </div>

                {userList === null ? (
                    <div className={"mt-20 mb-20 flex flex-col items-center"}>
                        <Spinner className={"size-10"} />
                    </div>
                ) : (
                    <ScrollArea
                        className={"flex flex-col gap-1 pt-3 mt-2 pr-4"}
                    >
                        {filteredUsers.map((user) => (
                            <Item
                                key={user.id}
                                className="w-full p-1 cursor-pointer"
                                variant={
                                    selectedUser && selectedUser.id === user.id
                                        ? "muted"
                                        : "default"
                                }
                                size={"sm"}
                                asChild
                            >
                                <a
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (
                                            selectedUser &&
                                            selectedUser.id === user.id
                                        )
                                            setSelectedUser(null)
                                        else setSelectedUser(user)
                                    }}
                                >
                                    <ItemMedia>
                                        {selectedUser &&
                                        selectedUser.id === user.id ? (
                                            <Avatar className="size-7">
                                                <AvatarImage></AvatarImage>
                                                <AvatarFallback>
                                                    <span
                                                        className={
                                                            "material-symbols-outlined"
                                                        }
                                                    >
                                                        check_circle
                                                    </span>
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <Avatar className="size-7">
                                                <AvatarImage
                                                    src={
                                                        user.avatar || undefined
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </ItemMedia>
                                    <ItemContent className="gap-0 overflow-x-hidden text-ellipsis pr-1">
                                        <ItemTitle className="text-ellipsis">
                                            {user.name}
                                        </ItemTitle>
                                        <ItemDescription className="leading-none text-ellipsis">
                                            {user.email}
                                        </ItemDescription>
                                    </ItemContent>
                                </a>
                            </Item>
                        ))}
                    </ScrollArea>
                )}
            </PopoverContent>
        </Popover>
    )
}
