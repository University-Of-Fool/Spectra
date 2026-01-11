import { useTranslation } from "react-i18next"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ className }: { className?: string }) {
    const { i18n } = useTranslation()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <span className={cn("cursor-pointer", className)}>
                    <span className={"material-symbols-outlined text-[1.6em]!"}>
                        language
                    </span>
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("zh")}>
                    简体中文
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
                    English
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
