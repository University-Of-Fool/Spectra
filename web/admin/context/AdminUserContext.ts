import { createContext } from "react"

export type ApiUser = {
    id: string
    name: string
    email: string
    avatar: string | null
    created_at: string
    descriptor: ("Manage" | "Code" | "Link" | "File")[]
}

export const AdminUserContext = createContext<{
    currentUser: ApiUser | null
    setCurrentUser: (_: ApiUser | null) => void
}>({
    currentUser: null,
    setCurrentUser: (_: ApiUser | null) => {},
})
