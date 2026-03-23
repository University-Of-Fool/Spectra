import { ThemeProvider, ThemeSwitcher } from "@/components/ThemeProvider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { render, Suspense, useEffect, useState } from "react"
import { LanguageSwitcher } from "../components/LanguageSwitcher"
import { SpectraLogo } from "../components/Logo"
import "../components/i18n"
import "../public/style.css"
import type { AdminSetupPayload, SetupConfigPayload } from "./interface"

import { SetupStep1 } from "./components/SetupStep1"
import { SetupStep2 } from "./components/SetupStep2"

function StepTransition(props: {
    step: number
    durationMs?: number
    children: (step: number) => preact.ComponentChildren
}) {
    const duration = props.durationMs ?? 220
    const [displayStep, setDisplayStep] = useState(props.step)
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (props.step === displayStep) {
            return
        }

        setVisible(false)
        const switchTimer = window.setTimeout(() => {
            setDisplayStep(props.step)
            setVisible(true)
        }, duration)

        return () => {
            window.clearTimeout(switchTimer)
        }
    }, [props.step, displayStep, duration])

    return (
        <div
            className={cn(
                "transition-opacity",
                visible ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: `${duration}ms` }}
        >
            {props.children(displayStep)}
        </div>
    )
}

export function App() {
    const [step, setStep] = useState(1)
    const [setupConfig, setSetupConfig] = useState<SetupConfigPayload>({
        refresh_time: "0 0 4 * * ?",
        domain: window.location.origin,
        turnstile_enabled: false,
        turnstile_site_key: "1x00000000000000000000AA",
        turnstile_secret_key: "1x0000000000000000000000000000000AA",
    })
    const [adminPayload, setAdminPayload] = useState<AdminSetupPayload>({
        name: "",
        email: "",
        password: "",
        avatar: null,
    })

    return (
        <ThemeProvider>
            <Toaster richColors />
            <div className="h-screen">
                <div
                    className={
                        "fixed flex items-center p-10 px-15 bg-linear-to-b from-background to-transparent from-25% top-0 left-0 w-full z-50"
                    }
                >
                    <SpectraLogo className="h-12 mr-4" />
                    <div
                        className={"text-sm text-muted-foreground ml-auto flex"}
                    >
                        <ThemeSwitcher></ThemeSwitcher>
                        <LanguageSwitcher></LanguageSwitcher>
                    </div>
                </div>
                <StepTransition step={step}>
                    {(displayStep) =>
                        displayStep === 1 ? (
                            <SetupStep1
                                setStep={setStep}
                                setupConfig={setupConfig}
                                setSetupConfig={setSetupConfig}
                            />
                        ) : (
                            <SetupStep2
                                setStep={setStep}
                                setupConfig={setupConfig}
                                adminPayload={adminPayload}
                                setAdminPayload={setAdminPayload}
                            />
                        )
                    }
                </StepTransition>
            </div>
        </ThemeProvider>
    )
}

const appElement = document.getElementById("app")
if (appElement) {
    render(
        <Suspense fallback={<div />}>
            <App />
        </Suspense>,
        appElement,
    )
}
