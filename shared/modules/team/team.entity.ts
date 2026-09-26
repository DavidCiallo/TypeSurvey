import { BaseEntity } from "../../lib/default/base.entity";

export type TeamRole = "owner" | "member";

export interface TeamEntity extends BaseEntity {
    name: string;
    creator_id: string;
}

export interface TeamMemberEntity extends BaseEntity {
    team_id: string;
    account_id: string;
    role: TeamRole;
}

export interface TeamInviteEntity extends BaseEntity {
    team_id: string;
    code: string;
    created_by: string;
    expire_time: number;
    used_by: string;
    used_time: number;
}

/**
 * What the client keeps in localStorage to know which team it is acting in.
 *
 * A type alias rather than an interface on purpose: TypeScript only infers an
 * implicit index signature for object literal types, and BaseResponse's `data`
 * is an index-signature type. As an interface this would not satisfy it.
 */
export type TeamBrief = {
    id: string;
    name: string;
    deleted?: boolean;
};
