import { BaseRequest, BaseResponse } from "../../lib/default/decorator";
import { TeamBrief, TeamRole } from "./team.entity";

export interface TeamMemberView {
    account_id: string;
    name: string;
    email: string;
    role: TeamRole;
    is_self: boolean;
}

export interface TeamInviteView {
    id: string;
    code: string;
    expire_time: number;
    create_time: number;
}

/**
 * Most team routes act on a single team. TeamScopedRequest holds the shared
 * auth/team_id pair so the eleven of them do not repeat the same constructor.
 *
 * Callers rarely pass team_id: createClient injects the team the user picked in
 * the switcher, which keeps a page from having to thread it through every call.
 */
abstract class TeamScopedRequest implements BaseRequest {
    public auth?: string;
    public team_id?: string;

    protected constructor(origin: Partial<TeamScopedRequest>) {
        origin.auth && (this.auth = origin.auth);
        origin.team_id && (this.team_id = origin.team_id);
    }
}

// ---------- list ----------

export class TeamListRequest implements BaseRequest {
    public auth?: string;
    constructor(origin: Partial<TeamListRequest>) {
        origin.auth && (this.auth = origin.auth);
    }
}

export class TeamListResponse implements BaseResponse<TeamBrief> {
    public success: boolean;
    public message?: string;
    public data?: { list: TeamBrief[] };
    constructor(origin: TeamListResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// ---------- create ----------

export class TeamCreateRequest implements BaseRequest {
    public auth?: string;
    public name: string;
    constructor(origin: Partial<TeamCreateRequest>) {
        if (!origin.name) throw new Error("Team name is required");
        origin.auth && (this.auth = origin.auth);
        this.name = origin.name;
    }
}

export class TeamCreateResponse implements BaseResponse<TeamBrief> {
    public success: boolean;
    public message?: string;
    public data?: TeamBrief;
    constructor(origin: TeamCreateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// ---------- update ----------

export class TeamUpdateRequest extends TeamScopedRequest {
    public name: string;
    constructor(origin: Partial<TeamUpdateRequest>) {
        super(origin);
        if (!origin.name) throw new Error("Team name is required");
        this.name = origin.name;
    }
}

export class TeamUpdateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: TeamUpdateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// ---------- del / restore ----------

export class TeamDeleteRequest extends TeamScopedRequest {
    constructor(origin: Partial<TeamDeleteRequest>) {
        super(origin);
    }
}

export class TeamDeleteResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: TeamDeleteResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class TeamRestoreRequest extends TeamScopedRequest {
    constructor(origin: Partial<TeamRestoreRequest>) {
        super(origin);
    }
}

export class TeamRestoreResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: TeamRestoreResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// ---------- members ----------

export class TeamMemberListRequest extends TeamScopedRequest {
    constructor(origin: Partial<TeamMemberListRequest>) {
        super(origin);
    }
}

export class TeamMemberListResponse implements BaseResponse<TeamMemberView> {
    public success: boolean;
    public message?: string;
    public data?: { list: TeamMemberView[] };
    constructor(origin: TeamMemberListResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class TeamMemberRemoveRequest extends TeamScopedRequest {
    public account_id: string;
    constructor(origin: Partial<TeamMemberRemoveRequest>) {
        super(origin);
        if (!origin.account_id) throw new Error("Account id is required");
        this.account_id = origin.account_id;
    }
}

export class TeamMemberRemoveResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: TeamMemberRemoveResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class TeamLeaveRequest extends TeamScopedRequest {
    constructor(origin: Partial<TeamLeaveRequest>) {
        super(origin);
    }
}

export class TeamLeaveResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: TeamLeaveResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// ---------- invites ----------

export class TeamInviteCreateRequest extends TeamScopedRequest {
    constructor(origin: Partial<TeamInviteCreateRequest>) {
        super(origin);
    }
}

export class TeamInviteCreateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: { id: string; code: string; expire_time: number; url: string };
    constructor(origin: TeamInviteCreateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class TeamInviteListRequest extends TeamScopedRequest {
    constructor(origin: Partial<TeamInviteListRequest>) {
        super(origin);
    }
}

export class TeamInviteListResponse implements BaseResponse<TeamInviteView> {
    public success: boolean;
    public message?: string;
    public data?: { list: TeamInviteView[] };
    constructor(origin: TeamInviteListResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class TeamInviteRevokeRequest extends TeamScopedRequest {
    public invite_id: string;
    constructor(origin: Partial<TeamInviteRevokeRequest>) {
        super(origin);
        if (!origin.invite_id) throw new Error("Invite id is required");
        this.invite_id = origin.invite_id;
    }
}

export class TeamInviteRevokeResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: TeamInviteRevokeResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// ---------- join ----------

/** Redeems an invite link. Reachable while the account still has no team. */
export class TeamJoinRequest implements BaseRequest {
    public auth?: string;
    public code: string;
    constructor(origin: Partial<TeamJoinRequest>) {
        if (!origin.code) throw new Error("Invite code is required");
        origin.auth && (this.auth = origin.auth);
        this.code = origin.code;
    }
}

export class TeamJoinResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: { team_id: string };
    constructor(origin: TeamJoinResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
