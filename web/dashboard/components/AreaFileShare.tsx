import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

import {useEffect, useRef, useState} from 'react'

import Turnstile,{useTurnstile} from "react-turnstile";
import {Button} from "@/components/ui/button.tsx";
// 添加需要的图标
import { X } from "lucide-react"

export function AreaFileShare() {
    const turnstile=useTurnstile();
    const turnstileToken = useRef("");
    const [dialogOpen, setDialogOpen]=useState(false);
    const [progress, setProgress] = useState(0)
    const [finalUrl, setFinalUrl] = useState("");
    const references={
        path:useRef(""),
        random:useRef(true),
        expires:useRef(""),
        maxvisit:useRef(""),
        password:useRef(""),
        filename:useRef("")
    }

    // 添加文件选择相关状态
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 处理文件选择
    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        // 只保留第一个文件（限制单个文件上传）
        const newFile = files[0];

        // 检查是否已选择相同文件
        const isDuplicate = selectedFiles.some(
            selected => selected.name === newFile.name &&
                       selected.size === newFile.size &&
                       selected.lastModified === newFile.lastModified
        );

        if (!isDuplicate) {
            setSelectedFiles([newFile]); // 替换现有文件而不是添加
        }
    };
    // 处理点击选择文件
    const handleClickSelect = () => {
        fileInputRef.current?.click();
    };
    // 处理拖拽事件
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer!.files);
    };
    // 移除选中的文件
    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };
    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // 处理上传
    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        let body={
            item_type:"File",
            data:"none",
            expires_at: references.expires.current==="permanent"?undefined:(
                new Date(Date.now() + parseInt(references.expires.current) * 1000).toISOString()
            ),
            max_visit:references.maxvisit.current||undefined,
            password:references.password.current||undefined,
            extra_data:references.filename.current||undefined,
        }

        let resp=await fetch("/api/item/__RANDOM__?turnstile-token="+turnstileToken.current,{
            method:"POST",
            body:JSON.stringify(body),
            headers:{
                "Content-Type": "application/json"
            },
            credentials: "include"
        })

        if (resp.status!==200){
            return;
        }

        setProgress(30);
        let data=await resp.json();
        let formData=new FormData();
        formData.append("file",selectedFiles[0]);
        try{
            resp = await fetch(`/api/file/${encodeURIComponent(data.payload.short_path)}`, {
                method: "POST",
                body: formData,
                credentials: "include"
            })
            if (resp.status!==200){
                return;
            }
            setProgress(100);
            setFinalUrl(`https://s.akyuu.cn/${data.payload.short_path}`);

        }catch(e){
            console.error(e);
            return;
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="font-thin text-2xl mt-6 mb-12">
                文件快传
            </div>
            <div className="flex gap-2 items-center">
                <div className="opacity-50">
                    https://s.akyuu.cn/
                </div>
                <Input onInput={e=>references.path.current=e.data||""}/>
                <div className="flex items-center gap-2 ml-2">
                    <Checkbox onCheckedChange={checked=>references.random.current=!!checked} id="terms" defaultChecked />
                    {/* 上面事件处理函数的参数的类型：boolean|"indeterminate" */}
                    <Label className="text-nowrap" htmlFor="terms">随机生成</Label>
                </div>
            </div>

            <div className="w-150 mt-4">
                <div className="flex items-center justify-center mt-6 gap-4">
                    <div className="flex-1">
                        <div className="mb-2 text-sm">
                            有效时长
                        </div>
                        <Select onValueChange={value=>references.expires.current=value}>
                            <SelectTrigger >
                                <SelectValue placeholder="有效时长" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="3600">1 小时</SelectItem>
                                    <SelectItem value="28800">8 小时</SelectItem>
                                    <SelectItem value="86400">1 天</SelectItem>
                                    <SelectItem value="604800">7 天</SelectItem>
                                    <SelectItem value="1209600">14 天</SelectItem>
                                    <SelectItem value="permanent">永久</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1">
                        <div className="mb-2 text-sm">
                            访问人数限制
                        </div>
                        <Input onInput={e=>references.maxvisit.current=e.data||""} />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="mb-2 text-sm">
                        密码
                    </div>
                    <Input onInput={e=>references.password.current=e.data||""} type={"password"} placeholder={"留空则不设密码"} />
                </div>
                <div className="mt-4 gap-4">
                    <Turnstile
                        sitekey="1x00000000000000000000AA"
                        onVerify={token => {
                            turnstileToken.current=token;
                        }}
                    />
                    <div>
                        <Button onClick={()=>setDialogOpen(true)}>选择文件</Button>
                    </div>
                </div>
            </div>
            <Dialog open={dialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>选择上传的文件</DialogTitle>
                    </DialogHeader>

                    {/* 文件选择区域 - 只在没有选择文件时显示 */}
                    {selectedFiles.length === 0 && (
                        <div
                            className={`w-full h-40 mt-4 border-2 flex items-center justify-center transition-colors rounded-md ${
                                isDragging ? 'border-primary bg-primary/5' : 'border-accent hover:border-primary/50'
                            }`}
                            onClick={handleClickSelect}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <span className="text-center">点击或拖拽文件到此处</span>
                        </div>
                    )}

                    {/* 隐藏的文件输入 - 移除multiple属性 */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => handleFileSelect((e.target as HTMLInputElement).files)}
                    />

                    {selectedFiles.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">已选择文件</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center">
                                                <span className="text-xs">{file.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm truncate max-w-[200px]">{file.name}</div>
                                                <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(index)}
                                            className="h-8 w-8"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <Label>文件名</Label>
                        <Input onInput={e=>references.filename.current=e.data||""} />
                    </div>

                    <Progress value={progress} className="w-full h-2 mt-4" />

                    <Label>{finalUrl}</Label>

                    <DialogFooter>
                        <Button variant={"outline"} onClick={()=>setDialogOpen(false)}>取消</Button>
                        <Button onClick={handleUpload} disabled={selectedFiles.length === 0}>
                            上传
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}