import { Input } from "@/components/ui/input"

export function AreaShortUrl() {
    return <div className={"flex flex-col items-center"}>
        <div className={"font-thin text-2xl mt-6 mb-12"}>
            短链接
        </div>
        <div className={"flex gap-2"}>
            <div>
                https://s.akyuu.cn/
            </div>
            <Input>

            </Input>
        </div>
        <div className={"flex gap-8"}>

        </div>
    </div>
}