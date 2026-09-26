import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Copy, Plus, Trash2, UserMinus } from "lucide-react"

import { Badge } from "@/client/components/ui/badge"
import { Button } from "@/client/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card"
import { Input } from "@/client/components/ui/input"
import { Label } from "@/client/components/ui/label"
import { TeamRouter } from "../../api/instance"
import { toast } from "../../methods/notify"
import { copytext } from "../../methods/text"
import { getCurrentTeam, setTeams } from "../../methods/team"
import { Locale } from "../../methods/locale"
import type { TeamInviteView, TeamMemberView } from "../../../shared/modules/team/team.interface"

const formatDate = (ms: number) => (ms ? new Date(ms).toLocaleDateString() : "")

export default function Component() {
    const locale = Locale("Team")
    const common = Locale("Common")
    const navigate = useNavigate()
    const team = getCurrentTeam()

    const [name, setName] = useState(team?.name || "")
    const [members, setMembers] = useState<TeamMemberView[]>([])
    const [invites, setInvites] = useState<TeamInviteView[]>([])
    const [inviteUrl, setInviteUrl] = useState("")
    const [busy, setBusy] = useState(false)

    const myRole = members.find((m) => m.is_self)?.role
    const isOwner = myRole === "owner"

    useEffect(() => {
        ;(async () => {
            const m = await TeamRouter.memberList({})
            if (!m.success || !m.data) {
                return toast({ title: m.message || common.ToastNetworkError, color: "danger" })
            }
            setMembers(m.data.list)
            // Invites are owner-only on the server, so only ask when it applies.
            if (m.data.list.find((x) => x.is_self)?.role !== "owner") return
            const i = await TeamRouter.inviteList({})
            if (i.success && i.data) setInvites(i.data.list)
        })()
    }, [])

    // After leaving or deleting, the team list has to be re-read before the app
    // can decide where to send the user — they may have no team left at all.
    async function reloadTeams() {
        const { success, data } = await TeamRouter.list({})
        if (success && data) setTeams(data.list)
    }

    async function rename() {
        if (!name.trim()) return toast({ title: common.ToastParamError, color: "danger" })
        setBusy(true)
        const { success, message } = await TeamRouter.update({ name: name.trim() })
        setBusy(false)
        if (!success) return toast({ title: message || common.ToastFailed, color: "danger" })
        await reloadTeams()
        toast({ title: common.ToastSuccess, color: "success" })
    }

    async function removeMember(accountId: string) {
        const { success, message } = await TeamRouter.memberRemove({ account_id: accountId })
        if (!success) return toast({ title: message || common.ToastFailed, color: "danger" })
        setMembers(members.filter((m) => m.account_id !== accountId))
        toast({ title: common.ToastSuccess, color: "success" })
    }

    async function createInvite() {
        setBusy(true)
        const { success, data, message } = await TeamRouter.inviteCreate({})
        setBusy(false)
        if (!success || !data) return toast({ title: message || common.ToastFailed, color: "danger" })
        setInviteUrl(data.url)
        const i = await TeamRouter.inviteList({})
        if (i.success && i.data) setInvites(i.data.list)
    }

    async function revokeInvite(inviteId: string) {
        const { success, message } = await TeamRouter.inviteRevoke({ invite_id: inviteId })
        if (!success) return toast({ title: message || common.ToastFailed, color: "danger" })
        setInvites(invites.filter((i) => i.id !== inviteId))
    }

    async function leaveTeam() {
        const { success, message } = await TeamRouter.leave({})
        if (!success) return toast({ title: message || common.ToastFailed, color: "danger" })
        await reloadTeams()
        navigate("/form", { replace: true })
    }

    async function deleteTeam() {
        const { success, message } = await TeamRouter.del({})
        if (!success) return toast({ title: message || common.ToastFailed, color: "danger" })
        await reloadTeams()
        toast({ title: locale.DeleteSuccess, color: "success" })
        navigate("/form", { replace: true })
    }

    if (!team) {
        return <p className="text-muted-foreground text-sm">{locale.NoTeam}</p>
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">{locale.Title}</h2>
                <p className="text-muted-foreground text-sm">{locale.Description}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{locale.NameLabel}</CardTitle>
                    <CardDescription>{locale.RenameDescription}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-end gap-3">
                    <div className="flex flex-1 flex-col gap-2">
                        <Label htmlFor="team-name">{locale.NameLabel}</Label>
                        <Input
                            id="team-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={40}
                            disabled={!isOwner}
                        />
                    </div>
                    <Button onClick={rename} disabled={!isOwner || busy}>
                        {common.ButtonSave}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{locale.MembersTitle}</CardTitle>
                    <CardDescription>{locale.MembersDescription}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    {members.map((m) => (
                        <div
                            key={m.account_id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{m.name || m.email}</span>
                                <span className="text-muted-foreground text-xs">{m.email}</span>
                                {m.role === "owner" && (
                                    <Badge variant="secondary">{locale.RoleOwner}</Badge>
                                )}
                                {m.is_self && <Badge variant="outline">{locale.RoleSelf}</Badge>}
                            </div>
                            {isOwner && !m.is_self && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMember(m.account_id)}
                                >
                                    <UserMinus className="size-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {isOwner && (
                <Card>
                    <CardHeader>
                        <CardTitle>{locale.InvitesTitle}</CardTitle>
                        <CardDescription>{locale.InvitesDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {inviteUrl && (
                            <div className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2">
                                <code className="truncate text-xs">{inviteUrl}</code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        copytext(inviteUrl)
                                        toast({ title: locale.ToastCopySuccess, color: "success" })
                                    }}
                                >
                                    <Copy className="size-4" />
                                </Button>
                            </div>
                        )}
                        <div>
                            <Button size="sm" onClick={createInvite} disabled={busy}>
                                <Plus className="size-4" />
                                {locale.CreateInvite}
                            </Button>
                        </div>
                        {invites.map((i) => (
                            <div
                                key={i.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                                <div className="flex flex-col">
                                    <code className="text-xs">{i.code}</code>
                                    <span className="text-muted-foreground text-xs">
                                        {locale.ExpiresAt} {formatDate(i.expire_time)}
                                    </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => revokeInvite(i.id)}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{locale.DangerTitle}</CardTitle>
                    <CardDescription>{locale.DangerDescription}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={leaveTeam}>
                        {locale.LeaveButton}
                    </Button>
                    {isOwner && (
                        <Button variant="destructive" onClick={deleteTeam}>
                            {locale.DeleteButton}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
