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

    const mainItems: NavItem[] = [
        { title: locale.FormList, href: "/form", icon: FileText, menuKey: "form" },
        { title: locale.FieldManage, href: "/field", icon: ListChecks, menuKey: "field" },
        { title: locale.Feedback, href: "/record", icon: Database, menuKey: "record" },
    ]

    const secondaryItems: NavItem[] = [
        { title: locale.Settings, href: "/settings", icon: Settings, menuKey: "settings" },
    ]

    const filterByPermission = (items: NavItem[]) =>
        isAdmin() ? items : items.filter((item) => hasPermission(item.menuKey, "menu"))

    const visibleMain = filterByPermission(mainItems)
    const visibleSecondary = filterByPermission(secondaryItems)

    return (
        <>
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <svg className="size-8 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="8" fill="currentColor" />
                    <rect x="8" y="8" width="10" height="3" rx="1.5" style={{ fill: "var(--sidebar)" }} />
                    <rect x="8" y="14.5" width="16" height="3" rx="1.5" style={{ fill: "var(--sidebar)" }} opacity="0.8" />
                    <rect x="8" y="21" width="13" height="3" rx="1.5" style={{ fill: "var(--sidebar)" }} opacity="0.6" />
                </svg>
                <span className="text-lg font-semibold tracking-tight">简表</span>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                <p className="text-muted-foreground px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider">
                    {locale.Workspace}
                </p>
                {visibleMain.map((item) => (
                    <SidebarItem key={item.href} item={item} onNavigate={onNavigate} />
                ))}

                <p className="text-muted-foreground px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider">
                    {locale.General}
                </p>
                {visibleSecondary.map((item) => (
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
