import { NavLink } from "react-router-dom"
import {
    FileText,
    ListChecks,
    Database,
    Settings,
    type LucideIcon,
} from "lucide-react"

import { cn } from "@/client/lib/utils"
import { Locale } from "@/client/methods/locale"
import { useAuth } from "@/client/methods/auth-context"

type NavItem = {
    title: string
    href: string
    icon: LucideIcon
    menuKey: string
}

const ALL_MENUS = ["form", "field", "record", "settings"] as const

export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
    const locale = Locale("Menu")
    const { isAdmin, hasPermission } = useAuth()

    const allItems: NavItem[] = [
        { title: locale.FormList, href: "/form", icon: FileText, menuKey: "form" },
        { title: locale.FieldManage, href: "/field", icon: ListChecks, menuKey: "field" },
        { title: locale.Feedback, href: "/record", icon: Database, menuKey: "record" },
        { title: locale.Settings, href: "/settings", icon: Settings, menuKey: "settings" },
    ]

    const visibleItems = isAdmin()
        ? allItems
        : allItems.filter((item) => hasPermission(item.menuKey, "menu"))

    return (
        <>
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <span className="text-lg font-semibold tracking-tight">简表</span>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                <p className="text-muted-foreground px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider">
                    Workspace
                </p>
                {visibleItems.map((item) => (
                    <SidebarItem key={item.href} item={item} onNavigate={onNavigate} />
                ))}
            </nav>

            <div className="border-t p-3">
                <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded-lg p-3 text-xs">
                    <p className="font-medium">TypeForm Admin</p>
                </div>
            </div>
        </>
    )
}

export function DesktopSidebar() {
    return (
        <aside className="bg-sidebar text-sidebar-foreground hidden h-screen w-60 shrink-0 flex-col border-r md:flex">
            <SidebarBody />
        </aside>
    )
}

function SidebarItem({
    item,
    onNavigate,
}: {
    item: NavItem
    onNavigate?: () => void
}) {
    const Icon = item.icon
    return (
        <NavLink
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
                cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                )
            }
        >
            <Icon className="size-4" />
            <span className="flex-1">{item.title}</span>
        </NavLink>
    )
}
