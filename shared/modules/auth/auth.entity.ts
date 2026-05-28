import { BaseEntity } from "../../lib/default/base.entity";

export interface AccountEntity extends BaseEntity {
    name: string;
    email: string;
    password: string;
    is_admin: number;
    api_key: string;
    balance: number;
    last_daily_time: number | null;
}
