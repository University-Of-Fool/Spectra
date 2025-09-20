import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function AreaPasteBin({ handleTabClick }: { handleTabClick: (tab: string) => void }) {
    return <div className={"flex flex-col items-center"}>
        <div className="font-thin text-2xl mt-6 mb-12">
            Pastebin
        </div>
        <div className="flex gap-2 items-center">
            <div className="opacity-50">
                https://s.akyuu.cn/
            </div>
            <Input onInput={e => references.path.current = e.data || ""} />
            <div className="flex items-center gap-2 ml-2">
                <Checkbox onCheckedChange={checked => references.random.current = !!checked} id="terms" defaultChecked />
                {/* 上面事件处理函数的参数的类型：boolean|"indeterminate" */}
                <Label className="text-nowrap" htmlFor="terms">随机生成</Label>
            </div>
        </div>
        <div className={"flex gap-8"}>

        </div>
    </div>
}