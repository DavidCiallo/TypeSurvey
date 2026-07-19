import { useLocation } from "react-router-dom"
import { Menu } from "lucide-react"

import { Button } from "@/client/components/ui/button"
import { Separator } from "@/client/components/ui/separator"
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
    const title = key ? locale[key] : "简表"

    function changeLan() {
        const lanList = ["cn", "en"];
        const current = localStorage.getItem("locale") || "cn";
        const index = lanList.indexOf(current);
        const nextIndex = (index + 1) % lanList.length;
        localStorage.setItem("locale", lanList[nextIndex]);
        window.location.reload();
    }

    const currentLan = localStorage.getItem("locale") || "cn";
    const lanLabel = currentLan === "cn" ? "中文" : "EN";

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
                <Button variant="ghost" size="sm" onClick={changeLan}>
                    {lanLabel}
                </Button>
                <ThemeToggle />
                <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
                <UserMenu />
            </div>
        </header>
    )
}
