import { useState } from "react"
import { Building2 } from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select"
import { getCurrentTeamId, getTeams, setCurrentTeamId } from "@/client/methods/team"
import { Locale } from "@/client/methods/locale"

/**
 * Which team the app is acting in.
 *
 * Switching reloads the page on purpose. The team decides what every form name
 * means and what every list contains, so letting each page keep the state it
 * already fetched would briefly show one team's data under another team's name —
 * and the two can share a form name, so it would look plausible rather than
 * broken.
 */
export function TeamSwitcher() {
    const locale = Locale("Team")
    const [teams] = useState(getTeams)
    const [current, setCurrent] = useState(getCurrentTeamId)

    if (teams.length === 0) return null

    return (
        <Select
            value={current}
            onValueChange={(id) => {
                if (id === current) return
                setCurrentTeamId(id)
                setCurrent(id)
                window.location.reload()
            }}
        >
            <SelectTrigger size="sm" className="w-40" aria-label={locale.SwitchTeam}>
                <Building2 className="size-4 opacity-60" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                        {team.deleted ? `${team.name} (${locale.Deleted})` : team.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
