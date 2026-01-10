import { type JSX, useEffect, useLayoutEffect, useRef, useState } from "react"

interface TransitionTabsProps {
    activeKey: string
    tabs: { key: string; node: preact.ComponentChildren }[]
}

export function TransitionTabs({ activeKey, tabs }: TransitionTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [rendered, setRendered] = useState<
        { key: string; node: preact.ComponentChildren }[]
    >([])

    // 当 activeKey 改变时，把旧的和新的都放进来
    useEffect(() => {
        const activeChild = tabs.find((c) => c.key === activeKey)
        if (!activeChild) return
        setRendered((prev) => {
            // 如果已经包含新tab，就不用重复加
            if (prev.some((c) => c.key === activeKey)) return prev
            return [...prev, activeChild]
        })
    }, [activeKey, tabs])

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return

        const activeEl = el.querySelector<HTMLElement>("[data-active='true']")
        if (!activeEl) return

        const ro = new ResizeObserver(() => {
            const targetHeight = activeEl.scrollHeight + 8
            el.style.height = `${targetHeight}px`
        })

        ro.observe(activeEl)

        return () => ro.disconnect()
    }, [activeKey, rendered])

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return

        // 动态调整容器高度
        const activeEl = el.querySelector<HTMLElement>("[data-active='true']")
        if (activeEl) {
            const targetHeight =
                activeEl.scrollHeight + 8 /* 给shadow预留余量 */
            el.style.height = `${targetHeight}px`
        }
    }, [activeKey, rendered])

    const handleAnimationEnd = (key: string) => {
        // 动画结束后移除旧tab
        if (key !== activeKey) {
            setRendered((prev) => prev.filter((c) => c.key === activeKey))
        }
    }

    return (
        <div
            ref={containerRef}
            style={{
                height: "auto",
                transition: "height 0.35s ease",
                overflow: "hidden",
            }}
        >
            {rendered.map(({ key, node }) => (
                <div
                    key={key}
                    data-active={key === activeKey}
                    onAnimationEnd={() => handleAnimationEnd(key)}
                    style={{
                        animation:
                            key === activeKey
                                ? "fadeIn 0.35s ease forwards"
                                : "fadeOut 0.25s ease forwards",
                        position: key === activeKey ? "relative" : "absolute",
                        width: "100%",
                    }}
                >
                    {/* 内层包裹，避免shadow被裁掉 */}
                    <div style={{ paddingBottom: "12px" }}>{node}</div>
                </div>
            ))}

            <style>
                {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}
            </style>
        </div>
    )
}

interface TransitionHeightProps {
    children: preact.ComponentChildren
    duration?: number
    className?: string
    style?: JSX.CSSProperties
}

export function TransitionHeight({
    children,
    duration = 300,
    className,
    style,
}: TransitionHeightProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState<number>(0)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return

        // 初始设置高度
        setHeight(el.scrollHeight)

        // 使用 ResizeObserver 监听内容变化
        const observer = new ResizeObserver(() => {
            setHeight(el.scrollHeight)
        })
        observer.observe(el)

        return () => observer.disconnect()
    }, [children])

    return (
        <div
            style={{
                height: `${height}px`,
                overflow: "hidden",
                transition: `height ${duration}ms ease`,
                ...style,
            }}
        >
            <div ref={ref} className={className}>
                {children}
            </div>
        </div>
    )
}
