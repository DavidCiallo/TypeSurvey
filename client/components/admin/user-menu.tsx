import { useNavigate } from "react-router-dom"
import { LogOut, LifeBuoy } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/client/components/ui/avatar"
import { Button } from "@/client/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu"
import { clearAuthData, getUserInfo } from "@/client/methods/auth"
import { useAuth } from "@/client/methods/auth-context"

const avatarUrl = (seed: string) =>
    `https://api.dicebear.com/7.x/glass/svg?seed=${encodeURIComponent(seed)}`

export function UserMenu() {
    const navigate = useNavigate()
    const { resetAuth } = useAuth()
    const info = getUserInfo()
    const email = info.email || "unknown@typeform.local"
    const isAdmin = info.is_admin === 1

    function onLogout() {
        clearAuthData()
        resetAuth()
        navigate("/auth", { replace: true })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="size-7">
                        <AvatarImage src={avatarUrl(email)} alt="avatar" />
                        <AvatarFallback className="text-xs">
                            {email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">
                        {email}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                        <Avatar className="size-9">
                            <AvatarImage src={avatarUrl(email)} alt="avatar" />
                            <AvatarFallback className="text-xs">
                                {email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">
                                {isAdmin ? "Admin" : "User"}
                            </span>
                            <span className="text-muted-foreground text-xs font-normal">
                                {email}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <LifeBuoy className="size-4" />
                    Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onLogout}>
                    <LogOut className="size-4" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
