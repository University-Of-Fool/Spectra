import "../public/style.css"
import { render, Suspense } from "react"
import { ThemeProvider } from "@/components/ThemeProvider.tsx"
import {
    TopBarDiv,
    TopBarLogo,
    TopBarRightAvatar,
    TopBarRightButtons,
    TopBarRightCol,
    TopBarRightDiv,
    TopBarRightSharedBy,
} from "../components/TopBar.tsx"
import { AuthCard } from "./components/AuthCard"
import "../components/i18n"

const root = document.getElementById("app")
if (!root) throw new Error("Launch failed: Root element not found")
const backendDataElement = document.getElementById("spectra-data")
if (!backendDataElement)
    throw new Error("Launch failed: spectra-data element not found")
const backendData: {
    error: boolean
    path_name: string
    creator_name: string
    creator_avatar: string | null
} = JSON.parse(backendDataElement.innerText)
export function PasswordInput() {
    return (
        <ThemeProvider>
            <div className={"h-screen"}>
                <TopBarDiv className={"fixed"}>
                    <TopBarLogo pageName="Auth"></TopBarLogo>
                    <TopBarRightDiv>
                        <TopBarRightCol>
                            <TopBarRightSharedBy
                                name={backendData.creator_name}
                            ></TopBarRightSharedBy>
                            <TopBarRightButtons></TopBarRightButtons>
                        </TopBarRightCol>
                        <TopBarRightAvatar
                            avatar={backendData.creator_avatar}
                        ></TopBarRightAvatar>
                    </TopBarRightDiv>
                </TopBarDiv>
                <AuthCard error={backendData.error} />
            </div>
        </ThemeProvider>
    )
}

render(
    <Suspense fallback={<div></div>}>
        <PasswordInput />
    </Suspense>,
    root,
)
