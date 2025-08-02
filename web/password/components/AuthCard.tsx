export function AuthCard() {
    return <div className={"h-full flex items-center justify-center"}>
        <div className={"card p-8 flex flex-col items-start gap-4"}>
            <div className={"text-sm opacity-75 mb-1"}>
                该内容需要验证密码。
            </div>
            <div className={"flex gap-2"}>
                <input type={"password"} className={"w-60 mr-1"} />
                <button type={"submit"}>
                    验证
                </button>
            </div>
        </div>
    </div>
}