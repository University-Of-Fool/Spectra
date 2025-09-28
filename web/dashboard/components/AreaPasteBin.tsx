import { useContext, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import { wfetch } from "../fetch.ts"
import { AccountCtx } from "../main.tsx"

export function AreaPasteBin({
    handleTabClick,
}: {
    handleTabClick: (tab: string) => void
}) {
    const [path, setPath] = useState("")
    const [random, setRandom] = useState(true)
    const [highlight, setHighlight] = useState("text")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [expires, setExpires] = useState("604800")
    const [maxvisit, setMaxvisit] = useState(0)
    const [password, setPassword] = useState("")
    const [finalUrl, setFinalUrl] = useState("")
    const context = useContext(AccountCtx)

    async function handleUpload() {
        const body = {
            item_type: "Code",
            data: content,
            expires_at:
                expires === "permanent"
                    ? undefined
                    : new Date(
                          Date.now() + parseInt(expires, 10) * 1000,
                      ).toISOString(),
            max_visits: maxvisit || undefined,
            password: password || undefined,
            extra_data: JSON.stringify({
                title,
                language: highlight,
            }),
        }
        const uploadPath = `/api/item/${random ? "__RANDOM__" : path}`

        if (!(context.value.turnstile_enabled && !context.value.isLoggedIn)) {
            const resp = await wfetch(uploadPath, {
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
                navigator.clipboard.writeText(url).then(() => {
                    toast.success("链接已复制到剪贴板")
                })
            }
        }
    }

    return (
        <div className="flex flex-col items-center">
            <div className="font-thin text-2xl mt-6 mb-12">Pastebin</div>

            {finalUrl === "" && (
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
                            onCheckedChange={(checked) => setRandom(!!checked)}
                            id="terms"
                        />
                        <Label className="text-nowrap" htmlFor="terms">
                            随机生成
                        </Label>
                    </div>
                </div>
            )}

            <div className="w-150 mt-4">
                {finalUrl === "" && (
                    <>
                        <div className="flex gap-4 mt-4">
                            <div className="flex-3">
                                <div className="mb-2 text-sm">标题</div>
                                <Input
                                    placeholder="无标题"
                                    value={title}
                                    onChange={(e) =>
                                        setTitle(e.currentTarget.value)
                                    }
                                />
                            </div>
                            <div className="flex-1">
                                <div className="mb-2 text-sm">语法高亮</div>
                                <Select
                                    value={highlight}
                                    onValueChange={setHighlight}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="语法高亮" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="text">
                                                文本
                                            </SelectItem>
                                            <SelectItem value="markdown">
                                                Markdown
                                            </SelectItem>
                                            <SelectItem value="html">
                                                HTML
                                            </SelectItem>
                                            <SelectItem value="css">
                                                CSS
                                            </SelectItem>
                                            <SelectItem value="javascript">
                                                JavaScript
                                            </SelectItem>
                                            <SelectItem value="typescript">
                                                TypeScript
                                            </SelectItem>
                                            <SelectItem value="json">
                                                JSON
                                            </SelectItem>
                                            <SelectItem value="yaml">
                                                YAML
                                            </SelectItem>
                                            <SelectItem value="xml">
                                                XML
                                            </SelectItem>
                                            <SelectItem value="sql">
                                                SQL
                                            </SelectItem>
                                            <SelectItem value="python">
                                                Python
                                            </SelectItem>
                                            <SelectItem value="java">
                                                Java
                                            </SelectItem>
                                            <SelectItem value="csharp">
                                                C#
                                            </SelectItem>
                                            <SelectItem value="php">
                                                PHP
                                            </SelectItem>
                                            <SelectItem value="go">
                                                Go
                                            </SelectItem>
                                            <SelectItem value="rust">
                                                Rust
                                            </SelectItem>
                                            <SelectItem value="swift">
                                                Swift
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="mb-2 text-sm">内容</div>
                            <Textarea
                                rows={10}
                                value={content}
                                onChange={(e) =>
                                    setContent(e.currentTarget.value)
                                }
                            />
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

                        <div className="flex gap-4 mt-8">
                            <Button
                                className="flex-1"
                                variant="outline"
                                onClick={() => handleTabClick("operation")}
                            >
                                取消
                            </Button>
                            <Button
                                className="flex-5"
                                onClick={() => handleUpload()}
                                disabled={content.length === 0}
                            >
                                上传
                            </Button>
                        </div>
                    </>
                )}

                {finalUrl !== "" && (
                    <div className={"mt-8 w-full flex flex-col items-center"}>
                        <div className={"mb-6 opacity-75"}>
                            上传完成，链接已复制。
                        </div>
                        <Input
                            className={"w-full"}
                            type="text"
                            value={finalUrl}
                            readOnly
                        />

                        <div
                            className={
                                "flex mt-8 gap-4 items-center justify-center w-full"
                            }
                        >
                            <Button
                                variant={"outline"}
                                className={"flex-1"}
                                onClick={() => handleTabClick("operation")}
                            >
                                返回
                            </Button>
                            <Button
                                className={"flex-4"}
                                onClick={() => {
                                    navigator.clipboard
                                        .writeText(finalUrl)
                                        .then(() => {
                                            toast.success("链接已复制到剪贴板")
                                        })
                                }}
                            >
                                再次复制
                            </Button>
                            <Button
                                variant={"outline"}
                                className={"flex-1"}
                                onClick={() => {
                                    window.open(finalUrl, "_blank")
                                }}
                            >
                                打开链接
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
