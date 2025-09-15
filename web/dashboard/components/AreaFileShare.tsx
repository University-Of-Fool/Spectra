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
import Uppy from '@uppy/core'
import { UppyContextProvider, UppyContext, Dropzone } from '@uppy/react'
import { useContext, useState } from 'react'
import Dashboard from "@uppy/dashboard"
import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'


export function AreaFileShare() {
    const [uppy] = useState(() => new Uppy())
    return <div className={"flex flex-col items-center"}>
        <div className={"font-thin text-2xl mt-6 mb-12"}>
            文件快传
        </div>
        <div className={"flex gap-2 items-center"}>
            <div className={"opacity-50"}>
                https://s.akyuu.cn/
            </div>
            <Input>
            </Input>
            <div className={"flex items-center gap-2 ml-2"}>
                <Checkbox id="terms" defaultChecked />
                <Label className={"text-nowrap"} htmlFor="terms">随机生成</Label>
            </div>
        </div>
        <div className={"w-150 mt-4"}>
            <div className={"mb-2 text-sm"}>
                文件选择
            </div>
            <UppyContextProvider uppy={uppy}>
                <Dashboard></Dashboard>
                <Dropzone></Dropzone>
            </UppyContextProvider>
            <div className={"flex items-center justify-center mt-6"}>
                <div className={"flex-1"}>
                    <div className={"mb-2 text-sm"}>
                        有效时长
                    </div>
                    <Select>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a fruit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Fruits</SelectLabel>
                                <SelectItem value="apple">Apple</SelectItem>
                                <SelectItem value="banana">Banana</SelectItem>
                                <SelectItem value="blueberry">Blueberry</SelectItem>
                                <SelectItem value="grapes">Grapes</SelectItem>
                                <SelectItem value="pineapple">Pineapple</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div className={"flex-1"}>
                    <div className={"mb-2 text-sm"}>
                        访问人数限制
                    </div>
                </div>
            </div>
        </div>
    </div>
}