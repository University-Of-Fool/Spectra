import "../../components/i18n"
import "../../public/style.css"
import { useTranslation } from "react-i18next"

export function DebugInfo() {
    const { t } = useTranslation("admin")

    return (
        <div className="ml-8 w-full px-4 mt-4">
            <div className="text-xl font-medium mb-2">
                {t("debug_info.title")}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {t("debug_info.description")}
            </div>
        </div>
    )
}
