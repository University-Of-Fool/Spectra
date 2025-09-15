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
import { Dashboard, Dropzone, UppyContextProvider } from '@uppy/react'
import { useEffect, useState } from 'react'
import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'


export function AreaFileShare() {
    const [uppy] = useState(() => new Uppy())

    return (
        <div className="flex flex-col items-center">
            <div className="font-thin text-2xl mt-6 mb-12">
                文件快传
            </div>
            <div className="flex gap-2 items-center">
                <div className="opacity-50">
                    https://s.akyuu.cn/
                </div>
                <Input />
                <div className="flex items-center gap-2 ml-2">
                    <Checkbox id="terms" defaultChecked />
                    <Label className="text-nowrap" htmlFor="terms">随机生成</Label>
                </div>
            </div>

            <div className="w-150 mt-4">
                <div className="mb-2 text-sm">
                    文件选择
                </div>
                <UppyContextProvider uppy={uppy}>
                    <Dashboard />
                    {/* <Dropzone /> */}
                    {/* and/or Uppy components */}
                </UppyContextProvider>

                <div className="flex items-center justify-center mt-6 gap-4">
                    <div className="flex-1">
                        <div className="mb-2 text-sm">
                            有效时长
                        </div>
                        <Select>
                            <SelectTrigger >
                                <SelectValue placeholder="有效时长" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="2h">1 小时</SelectItem>
                                    <SelectItem value="12h">8 小时</SelectItem>
                                    <SelectItem value="1d">1 天</SelectItem>
                                    <SelectItem value="7d">7 天</SelectItem>
                                    <SelectItem value="14d">14 天</SelectItem>
                                    <SelectItem value="permanent">永久</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1">
                        <div className="mb-2 text-sm">
                            访问人数限制
                        </div>
                        <Input />
                    </div>
                </div>
            </div>
        </div>
    )
}
