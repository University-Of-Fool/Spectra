import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { wfetch } from "../fetch"

type About = {
    build_date: string
    clean: boolean
    code: Array<{ language: string; lines: number }>
    commit: string
    debug: boolean
    version: string
}

export function AboutDialog() {
    const { t } = useTranslation("dashboard")
    const [about, setAbout] = useState<About | null>(null)
    const [loading, setLoading] = useState(true)

    // 按需请求 API，仅在用户触发对话框后请求
    const [clicked, setClicked] = useState(false)

    useEffect(() => {
        if (clicked) {
            wfetch("/api/about").then(async (res) => {
                if (res.ok) {
                    setAbout((await res.json()).payload)
                    console.log(about)
                    setLoading(false)
                } else {
                    toast.error(t("top_bar.service_unavailable"))
                }
            })
        }
    }, [clicked])

    function buildLocText(code: Array<{ language: string; lines: number }>) {
        let str = ""
        const ent = code.filter((c) => c.language !== "Total")
        const total = code.filter((c) => c.language === "Total")[0]
        ent.forEach((code, index) => {
            str += t("about.loc", { lines: code.lines, lang: code.language })
            if (index + 2 === ent.length) {
                str += t("about.and")
                str += " "
            } else if (index + 1 !== ent.length) {
                str += t("about.comma")
            }
        })

        return t("about.code_hero", { loc: str, total_lines: total.lines })
    }

    return (
        <Dialog
            onOpenChange={(_) => {
                setClicked(true)
            }}
        >
            <DialogTrigger asChild>
                <div className="text-center text-sm opacity-25 mt-20 mb-20 cursor-pointer">
                    {t("dashboard.footer_button_about")}
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("about.dialog_title")}</DialogTitle>
                    <DialogDescription>
                        {t("about.description")}
                        {loading && <p>Loading...</p>}
                        {about && (
                            <div className="mt-4 space-y-2">
                                <p>
                                    <strong>{t("about.version")}</strong>{" "}
                                    {about.version} (
                                    <a
                                        className={
                                            "text-foreground hover:underline"
                                        }
                                        href={`https://github.com/University-Of-Fool/Spectra/commit/${about.commit}`}
                                    >
                                        {about.commit}
                                    </a>
                                    )
                                    {!about.clean && (
                                        <Badge
                                            variant="outline"
                                            className={
                                                "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 cursor-help ml-2"
                                            }
                                            title={t("about.dirty_tooltip")}
                                        >
                                            Dirty
                                        </Badge>
                                    )}
                                </p>
                                <p>
                                    <strong>{t("about.build_date")}</strong>{" "}
                                    {new Date(
                                        about.build_date,
                                    ).toLocaleString()}
                                </p>

                                <p>
                                    <strong>{t("about.debug_mode")}</strong>{" "}
                                    {about.debug
                                        ? t("about.debug_mode_enabled")
                                        : t("about.debug_mode_disabled")}
                                </p>

                                <p>{buildLocText(about.code)}</p>

                                <p>
                                    <a
                                        href="https://github.com/University-Of-Fool/Spectra"
                                        className="text-foreground hover:underline"
                                    >
                                        GitHub
                                    </a>
                                    {" · "}
                                    <a
                                        href="https://uof.edu.kg"
                                        className="text-foreground hover:underline"
                                    >
                                        University of Fool
                                    </a>
                                </p>
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}
