import { useLocation } from "react-router-dom"
import { Menu } from "lucide-react"

import { Button } from "@/client/components/ui/button"
import { Separator } from "@/client/components/ui/separator"
import { LanguageToggle } from "@/client/components/language-toggle"
import { ThemeToggle } from "@/client/components/theme-toggle"
import { UserMenu } from "@/client/components/admin/user-menu"
import { Locale } from "@/client/methods/locale"

const titleMap: Record<string, string> = {
    "/form": "FormList",
    "/field": "FieldManage",
    "/record": "Feedback",
    "/settings": "Settings",
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
    const { pathname } = useLocation()
    const locale = Locale("Menu")
    const key = titleMap[pathname] || ""
    const title = key ? locale[key] : Locale("Common").AppName

    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur sm:gap-4 sm:px-6">
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onOpenMobileNav}
                aria-label="Open navigation"
            >
                <Menu className="size-5" />
            </Button>

            <h1 className="hidden text-lg font-semibold tracking-tight sm:block">
                {title}
            </h1>
            <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
                <LanguageToggle variant="ghost" />
                <ThemeToggle />
                <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
                <UserMenu />
            </div>
        </header>
    )
}
