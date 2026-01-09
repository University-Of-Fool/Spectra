import { X } from "lucide-react"
import { useContext, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button.tsx"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils.ts"
import { wfetch } from "../fetch.ts"
import { AccountCtx } from "../main.tsx"
import { FinishedCard } from "./FinishedCard.tsx"
import { Turnstile } from "./Turnstile.tsx"

export function AreaFileShare() {
    const context = useContext(AccountCtx)
    const [turnstileToken, setTurnstileToken] = useState("")
    const [progress, setProgress] = useState(0)
    const [finalUrl, setFinalUrl] = useState("")
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [failedMessage, setFailedMessage] = useState("")
    const xhrStates = {
        aborted: useState(false),
        url: useRef(""),
        xhr: useRef<XMLHttpRequest>(null),
    }

    const references = {
        path: useRef(""),
        random: useState(true),
        expires: useRef("604800"),
        maxvisit: useRef(""),
        password: useRef(""),
        no_filename: useRef(false),
    }

    // 添加文件选择相关状态

    // 处理文件选择
    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return

        // 只保留第一个文件（限制单个文件上传）
        const newFile = files[0]

        // 检查是否已选择相同文件
        const isDuplicate = selectedFiles.some(
            (selected) =>
                selected.name === newFile.name &&
                selected.size === newFile.size &&
                selected.lastModified === newFile.lastModified,
        )

        if (!isDuplicate) {
            setSelectedFiles([newFile]) // 替换现有文件而不是添加
        }
    }
    // 处理点击选择文件
    const handleClickSelect = () => {
        fileInputRef.current?.click()
    }
    // 处理拖拽事件
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer) handleFileSelect(e.dataTransfer.files)
    }
    // 移除选中的文件
    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    }
    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // 处理上传
    const handleUpload = async () => {
        if (selectedFiles.length === 0) return
        const body = {
            item_type: "File",
            data: "none",
            expires_at:
                references.expires.current === "permanent"
                    ? undefined
                    : new Date(
                          Date.now() +
                              parseInt(references.expires.current, 10) * 1000,
                      ).toISOString(),
            max_visits: parseInt(references.maxvisit.current, 10) || undefined,
            password: references.password.current || undefined,
            extra_data: references.no_filename.current
                ? undefined
                : selectedFiles[0].name,
        }

        let path = `/api/item/${references.random[0] || !context.value.isLoggedIn ? "__RANDOM__" : references.path.current}`
        if (context.value.turnstile_enabled && !context.value.isLoggedIn) {
            path += `?turnstile-token=${turnstileToken}`
        }
        const resp = await wfetch(path, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        })

        const data = await resp.json()

        if (resp.status !== 200) {
            if (resp.status === 409) {
                setFailedMessage("指定的路径已存在")
            } else {
                setFailedMessage(`未知错误：${resp.status} ${data.payload}`)
            }
            return
        }
        setFailedMessage("")

        setProgress(10)
        const formData = new FormData()
        formData.append("file", selectedFiles[0])
        try {
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhrStates.xhr.current = xhr
                xhrStates.url.current = `/api/item/${encodeURIComponent(data.payload.short_path)}`
                // 监听上传进度事件
                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        // 计算上传进度百分比（从10%到95%）
                        const uploadPercent =
                            10 + (event.loaded / event.total) * 75
                        setProgress(Math.min(Math.round(uploadPercent), 95))
                    }
                })

                // 监听完成事件
                xhr.addEventListener("load", () => {
                    setProgress(100)
                    if (xhr.status === 200) {
                        resolve()
                    } else {
                        reject(
                            new Error(
                                `Upload failed with status: ${xhr.status}`,
                            ),
                        )
                    }
                })

                // 监听错误事件
                xhr.addEventListener("error", () => {
                    reject(new Error("Network error occurred"))
                })

                // 初始化请求
                xhr.open(
                    "POST",
                    `/api/file/${encodeURIComponent(data.payload.short_path)}`,
                )
                xhr.withCredentials = true // 包含凭证
                xhr.send(formData)
            })
        } catch (e) {
            toast.error(`未知错误: ${e}`)
            console.error(e)
            return
        }
        const url = `${window.location.origin}/${data.payload.short_path}`
        context.sharedListUpdTrigger(context.sharedListUpd + 1)
        setFinalUrl(url)
    }

    return (
        <div className="flex flex-col items-center">
            <div className="font-thin dark:font-light text-2xl mt-6 mb-12">
                文件快传
            </div>

            {progress === 0 && (
                <div className="flex gap-2 items-center">
                    <div className="opacity-50">{window.location.origin}/</div>

                    <Input
                        onInput={(e) => {
                            references.path.current =
                                (e.target as HTMLInputElement)?.value || ""
                        }}
                        disabled={references.random[0]}
                        value={
                            references.random[0]
                                ? "[随机]"
                                : references.path.current
                        }
                    />
                    <div className="flex items-center gap-2 ml-2">
                        <Checkbox
                            checked={references.random[0]}
                            onCheckedChange={(checked) => {
                                if (context.value.loading) return
                                if (
                                    !context.value.isLoggedIn &&
                                    context.value.turnstile_enabled
                                ) {
                                    toast.error("未登录时只能使用随机路径")
                                    return
                                }

                                // checked: boolean|"indeterminate"
                                references.random[1](!!checked)
                            }}
                            id="terms"
                            defaultChecked
                        />
                        <Label className="text-nowrap" htmlFor="terms">
                            随机生成
                        </Label>
                    </div>
                </div>
            )}

            <div className="w-150 mt-4">
                {progress === 0 && (
                    <>
                        <div className="mt-4 mb-2 text-sm">文件选择</div>

                        {/* 文件选择区域 - 只在没有选择文件时显示 */}
                        {selectedFiles.length === 0 && (
                            <div
                                className={cn(
                                    "w-full h-40 border-2 border-border flex items-center justify-center transition-colors rounded-md",
                                    isDragging &&
                                        "border-foreground bg-foreground/30",
                                )}
                                onClick={handleClickSelect}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                <div className="flex items-center justify-center opacity-50 text-sm">
                                    <span className="material-symbols-outlined mr-1">
                                        upload
                                    </span>
                                    <span className="text-center">
                                        点击上传或拖拽文件至此
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 隐藏的文件输入 - 移除multiple属性 */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) =>
                                handleFileSelect(
                                    (e.target as HTMLInputElement).files,
                                )
                            }
                        />

                        {selectedFiles.length > 0 && (
                            <div className="mt-4">
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    <div className="flex items-center justify-between p-2 border rounded-md">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center">
                                                <span className="text-xs">
                                                    {selectedFiles[0].name
                                                        .split(".")
                                                        .pop()
                                                        ?.toUpperCase() ||
                                                        "FILE"}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm truncate max-w-[200px]">
                                                    {selectedFiles[0].name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatFileSize(
                                                        selectedFiles[0].size,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(0)}
                                            className="h-8 w-8"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-center mt-4 gap-4">
                            <div className="flex-1">
                                <div className="mb-2 text-sm">有效时长</div>
                                <Select
                                    defaultValue="604800"
                                    onValueChange={(value) => {
                                        references.expires.current = value
                                    }}
                                >
                                    <SelectTrigger className={"w-full"}>
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
                                    onInput={(e) => {
                                        references.maxvisit.current =
                                            (e.target as HTMLInputElement)
                                                .value || ""
                                    }}
                                    type={"number"}
                                    min={0}
                                    placeholder={"无限制"}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="mb-2 text-sm">密码</div>
                            <Input
                                onInput={(e) => {
                                    references.password.current =
                                        (e.target as HTMLInputElement).value ||
                                        ""
                                }}
                                placeholder={"无密码"}
                            />
                        </div>

                        <div className="mt-8 flex items-center border-1 border-border rounded-md p-4 shadow-sm">
                            <div>
                                <Label htmlFor="airplane-mode">图床模式</Label>
                                <div className={"mt-1.5 opacity-50 text-xs"}>
                                    开启后，上传图片生成的 URL 可以直接用作 HTML
                                    中的 &lt;img&gt; 标签的 src 属性。
                                </div>
                            </div>
                            <Switch
                                className={"ml-auto"}
                                id="airplane-mode"
                                onCheckedChange={(checked) => {
                                    references.no_filename.current = checked
                                }}
                            />
                        </div>
                        <Turnstile
                            onVerify={(token) => setTurnstileToken(token)}
                        />

                        <div className={"flex gap-4 mt-8"}>
                            <Button
                                className={"flex-1 cursor-pointer"}
                                variant={"outline"}
                                onClick={() =>
                                    context.handleTabClick("operation")
                                }
                            >
                                取消
                            </Button>
                            <Button
                                className={"flex-5 cursor-pointer"}
                                onClick={handleUpload}
                                disabled={
                                    selectedFiles.length === 0 ||
                                    context.value.loading ||
                                    (!context.value.isLoggedIn &&
                                        (!context.value.turnstile_enabled ||
                                            turnstileToken === ""))
                                }
                            >
                                上传
                            </Button>
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
                    </>
                )}

                {progress !== 0 && finalUrl === "" && (
                    <div
                        className={
                            "flex items-center justify-center flex-col mt-8"
                        }
                    >
                        <div className={"mb-2 opacity-75"}>
                            {xhrStates.aborted[0]
                                ? "上传已终止"
                                : "正在上传文件..."}
                        </div>
                        <div
                            className={
                                "flex flex-row w-full mt-4 items-center justify-center"
                            }
                        >
                            <Progress
                                value={progress}
                                className="w-full h-2 mr-4"
                            />
                            <span className={"text-center text-sm mr-2"}>
                                {progress}%
                            </span>
                        </div>
                        {xhrStates.aborted[0] ? (
                            <Button
                                className={"mt-8 w-full"}
                                variant={"outline"}
                                onClick={() => {
                                    context.handleTabClick("operation")
                                }}
                            >
                                返回
                            </Button>
                        ) : (
                            <Button
                                className={"mt-8 w-full"}
                                variant={"outline"}
                                onClick={async () => {
                                    xhrStates.xhr.current?.abort()
                                    xhrStates.aborted[1](true)
                                    try {
                                        const resp = await fetch(
                                            xhrStates.url.current,
                                            {
                                                method: "DELETE",
                                                credentials: "include",
                                            },
                                        )
                                        const data = await resp.json()
                                        if (!data.success) {
                                            toast.error("取消失败")
                                        }
                                    } catch (e) {
                                        console.error(e)
                                        toast.error("取消失败：未知错误")
                                    }
                                }}
                            >
                                取消
                            </Button>
                        )}
                    </div>
                )}

                <FinishedCard finalUrl={finalUrl} filePage />
            </div>
        </div>
    )
}
