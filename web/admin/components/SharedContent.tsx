import "../../components/i18n"
import "../../public/style.css"
import { useTranslation } from "react-i18next"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"

export function SharedContent() {
    const { t } = useTranslation("admin")
    return (
        <div className="ml-8 w-full px-4 mt-4">
            <div className="text-xl font-medium mb-2">
                {t("shared_content.title")}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {t("shared_content.description")}
            </div>
            <div className={"flex items-center mb-2 gap-2"}>
                <InputGroup className="w-60">
                    <InputGroupInput
                        placeholder={t("shared_content.search_placeholder")}
                    />
                    <InputGroupAddon>
                        <span
                            className={
                                "material-symbols-outlined text-[1.5em]!"
                            }
                        >
                            search
                        </span>
                    </InputGroupAddon>
                </InputGroup>
                {/* <Button variant="outline">
                    <span
                        className={
                            "material-symbols-outlined text-[1.6em]!"
                        }
                    >
                        filter_list
                    </span>
                    {t("shared_content.button_filter_user")}
                </Button> */}
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("shared_content.table.owner")}</TableHead>
                        <TableHead>{t("shared_content.table.type")}</TableHead>
                        <TableHead>{t("shared_content.table.link")}</TableHead>
                        <TableHead>
                            {t("shared_content.table.status")}
                        </TableHead>
                        <TableHead>
                            {t("shared_content.table.visits")}
                        </TableHead>
                        <TableHead>{t("shared_content.table.time")}</TableHead>
                        <TableHead>
                            {t("shared_content.table.operations")}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Alice</TableCell>
                        <TableCell>短链接</TableCell>
                        <TableCell>s.enita.cn/foobar</TableCell>
                        <TableCell>有效</TableCell>
                        <TableCell>114</TableCell>
                        <TableCell>2023-10-01 12:00:00</TableCell>
                        <TableCell>
                            <button
                                type="button"
                                onClick={() => alert("potato!!")}
                                class={"button-icon"}
                            >
                                <span
                                    className={
                                        "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                    }
                                >
                                    delete
                                </span>
                            </button>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Alice</TableCell>
                        <TableCell>短链接</TableCell>
                        <TableCell>s.enita.cn/foobar</TableCell>
                        <TableCell>有效</TableCell>
                        <TableCell>114</TableCell>
                        <TableCell>2023-10-01 12:00:00</TableCell>
                        <TableCell>
                            <button
                                type="button"
                                onClick={() => alert("potato!!")}
                                class={"button-icon"}
                            >
                                <span
                                    className={
                                        "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                    }
                                >
                                    delete
                                </span>
                            </button>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Alice</TableCell>
                        <TableCell>短链接</TableCell>
                        <TableCell>s.enita.cn/foobar</TableCell>
                        <TableCell>有效</TableCell>
                        <TableCell>114</TableCell>
                        <TableCell>2023-10-01 12:00:00</TableCell>
                        <TableCell>
                            <button
                                type="button"
                                onClick={() => alert("potato!!")}
                                class={"button-icon"}
                            >
                                <span
                                    className={
                                        "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                    }
                                >
                                    delete
                                </span>
                            </button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    )
}
