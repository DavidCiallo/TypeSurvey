import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { BrandIcon } from "@/client/components/logo"
import { LanguageToggle } from "@/client/components/language-toggle"
import { ThemeToggle } from "@/client/components/theme-toggle"
import { TeamRouter } from "../../api/instance"
import { AuthStatus, getAuthStatus } from "../../methods/auth"
import { PENDING_INVITE_KEY, setCurrentTeamId, setTeams } from "../../methods/team"
import { Locale } from "../../methods/locale"

/**
 * Redeems /join?c=<code>. Unlike the rest of the app this must be reachable
 * while the account still has no team — joining is how it gets one.
 *
 * An invite link usually arrives while the recipient is logged out, so the code
 * is stashed before sending them to the login page and picked up again
 * afterwards. Without that the link would silently do nothing.
 */
export default function Component() {
    const locale = Locale("Team")
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const code = params.get("c") || ""
    const [message, setMessage] = useState(locale.JoinWorking)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (getAuthStatus() !== AuthStatus.AUTH) {
            if (code) localStorage.setItem(PENDING_INVITE_KEY, code)
            navigate("/auth", { replace: true })
            return
        }
        if (!code) {
            setFailed(true)
            setMessage(locale.JoinInvalid)
            return
        }
        let cancelled = false
        ;(async () => {
            const { success, data, message: msg } = await TeamRouter.join({ code })
            if (cancelled) return
            if (!success || !data) {
                setFailed(true)
                setMessage(msg || locale.JoinFailed)
                return
            }
            localStorage.removeItem(PENDING_INVITE_KEY)
            const list = await TeamRouter.list({})
            if (list.success && list.data) setTeams(list.data.list)
            setCurrentTeamId(data.team_id)
            setMessage(locale.JoinSuccess)
            setTimeout(() => navigate("/form", { replace: true }), 700)
        })()
        return () => {
            cancelled = true
        }
    }, [code, navigate, locale])

    return (
        <div className="bg-background relative flex min-h-screen items-center justify-center px-4">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <LanguageToggle variant="ghost" />
                <ThemeToggle />
            </div>
            <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
                <BrandIcon className="size-10" />
                <p className={failed ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
                    {message}
                </p>
            </div>
        </div>
    )
}
