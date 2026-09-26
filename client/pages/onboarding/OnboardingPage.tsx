import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"

import { Button } from "@/client/components/ui/button"
import { Input } from "@/client/components/ui/input"
import { Label } from "@/client/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card"
import { BrandIcon } from "@/client/components/logo"
import { LanguageToggle } from "@/client/components/language-toggle"
import { ThemeToggle } from "@/client/components/theme-toggle"
import { TeamRouter } from "../../api/instance"
import { toast } from "../../methods/notify"
import { clearAuthData } from "../../methods/auth"
import { getTeams, setCurrentTeamId, setTeams } from "../../methods/team"
import { Locale } from "../../methods/locale"

/**
 * Shown when the account has no team yet. A team is what owns forms, so without
 * one there is nothing to show — the account has to create a team or redeem an
 * invite before the app is usable.
 */
export default function Component() {
    const locale = Locale("Team")
    const common = Locale("Common")
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [code, setCode] = useState("")
    const [busy, setBusy] = useState(false)

    async function reloadTeams() {
        const { success, data } = await TeamRouter.list({})
        const list = success && data ? data.list : []
        setTeams(list)
        return list
    }

    async function createTeam() {
        if (!name.trim()) return toast({ title: common.ToastParamError, color: "danger" })
        setBusy(true)
        const { success, data, message } = await TeamRouter.create({ name: name.trim() })
        setBusy(false)
        if (!success || !data) {
            return toast({ title: message || locale.CreateFailed, color: "danger" })
        }
        await reloadTeams()
        setCurrentTeamId(data.id)
        toast({ title: locale.CreateSuccess, color: "success" })
        navigate("/form", { replace: true })
    }

    async function joinTeam() {
        if (!code.trim()) return toast({ title: common.ToastParamError, color: "danger" })
        setBusy(true)
        const { success, data, message } = await TeamRouter.join({ code: code.trim() })
        setBusy(false)
        if (!success || !data) {
            return toast({ title: message || locale.JoinFailed, color: "danger" })
        }
        await reloadTeams()
        setCurrentTeamId(data.team_id)
        toast({ title: locale.JoinSuccess, color: "success" })
        navigate("/form", { replace: true })
    }

    // Already in a team: this page has nothing to offer.
    if (getTeams().length > 0) {
        return <Navigate to="/form" replace />
    }

    return (
        <div className="bg-background relative flex min-h-screen items-center justify-center px-4 py-10">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <LanguageToggle variant="ghost" />
                <ThemeToggle />
            </div>
            <div className="flex w-full max-w-md flex-col gap-6">
                <div className="flex items-center gap-3">
                    <BrandIcon className="size-9" />
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">{locale.OnboardingTitle}</h1>
                        <p className="text-muted-foreground text-sm">{locale.OnboardingDescription}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{locale.CreateTitle}</CardTitle>
                        <CardDescription>{locale.CreateDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="team-name">{locale.NameLabel}</Label>
                            <Input
                                id="team-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={locale.NamePlaceholder}
                                maxLength={40}
                            />
                        </div>
                        <Button onClick={createTeam} disabled={busy}>
                            {locale.CreateButton}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{locale.JoinTitle}</CardTitle>
                        <CardDescription>{locale.JoinDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="invite-code">{locale.InviteCodeLabel}</Label>
                            <Input
                                id="invite-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder={locale.InviteCodePlaceholder}
                            />
                        </div>
                        <Button variant="outline" onClick={joinTeam} disabled={busy}>
                            {locale.JoinButton}
                        </Button>
                    </CardContent>
                </Card>

                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-center text-sm transition-colors"
                    onClick={() => {
                        clearAuthData()
                        navigate("/auth", { replace: true })
                    }}
                >
                    {Locale("Menu").Logout}
                </button>
            </div>
        </div>
    )
}
