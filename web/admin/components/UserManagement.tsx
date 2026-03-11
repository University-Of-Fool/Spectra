import { useTranslation } from "react-i18next"
import "../../components/i18n"
import "../../public/style.css"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"

export function UserManagement() {
    const { t } = useTranslation("admin")
    return (
        <div className="ml-8 w-full px-4 mt-4">
            <div className="text-xl font-medium mb-2">
                {t("user_management.title")}
            </div>
            <div className="text-sm opacity-50 mb-8">
                {t("user_management.description")}
            </div>
            <div className={"flex items-center mb-2 gap-2"}>
                <InputGroup className="w-60">
                    <InputGroupInput placeholder={t("user_management.search_placeholder")} />
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
                <Button variant="outline">
                    <span
                        className={
                            "material-symbols-outlined text-[1.6em]!"
                        }
                    >
                        add
                    </span>
                    {t("user_management.button_new_user")}
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            {t("user_management.table.avatar")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.name")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.email")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.descriptor")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.shared_content_number")}
                        </TableHead>
                        <TableHead>
                            {t("user_management.table.last_login")}
                        </TableHead>
                        <TableHead>
                            {t(
                                "user_management.table.operations",
                            )}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <img
                                src="https://cravatar.cn/avatar/1?d=identicon&r=pg"
                                alt="avatar"
                                className="w-8 h-8 rounded-full"
                            />
                        </TableCell>
                        <TableCell>Alice</TableCell>
                        <TableCell>alice@example.com</TableCell>
                        <TableCell>Code, File, Link</TableCell>
                        <TableCell>12</TableCell>
                        <TableCell>
                            2023-10-01 12:00:00
                        </TableCell>
                        <TableCell className={"flex"}>
                            <button
                                type="button"
                                onClick={() =>
                                    alert("potato!!")
                                }
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
                            <button
                                type="button"
                                onClick={() =>
                                    alert("potato2!!")
                                }
                                class={"button-icon"}
                            >
                                <span
                                    className={
                                        "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                    }
                                >
                                    edit
                                </span>
                            </button>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <img
                                src="https://cravatar.cn/avatar/2?d=identicon&r=pg"
                                alt="avatar"
                                className="w-8 h-8 rounded-full"
                            />
                        </TableCell>
                        <TableCell>Bob</TableCell>
                        <TableCell>bob@example.com</TableCell>
                        <TableCell>Code, File, Link</TableCell>
                        <TableCell>4</TableCell>
                        <TableCell>
                            2023-10-01 12:00:00
                        </TableCell>
                        <TableCell className={"flex"}>
                            <button
                                type="button"
                                onClick={() =>
                                    alert("potato!!")
                                }
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
                            <button
                                type="button"
                                onClick={() =>
                                    alert("potato2!!")
                                }
                                class={"button-icon"}
                            >
                                <span
                                    className={
                                        "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                    }
                                >
                                    edit
                                </span>
                            </button>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <img
                                src="https://cravatar.cn/avatar/3?d=identicon&r=pg"
                                alt="avatar"
                                className="w-8 h-8 rounded-full"
                            />
                        </TableCell>
                        <TableCell>Charlie</TableCell>
                        <TableCell>charlie@example.com</TableCell>
                        <TableCell>Code, File, Link</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell>
                            2023-10-01 12:00:00
                        </TableCell>
                        <TableCell className={"flex"}>
                            <button
                                type="button"
                                onClick={() =>
                                    alert("potato!!")
                                }
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
                            <button
                                type="button"
                                onClick={() =>
                                    alert("potato2!!")
                                }
                                class={"button-icon"}
                            >
                                <span
                                    className={
                                        "material-symbols-outlined point cursor-pointer text-[1.4rem]!"
                                    }
                                >
                                    edit
                                </span>
                            </button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

        </div>

    )
}