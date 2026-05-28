import { BaseEntity } from "../../lib/default/base.entity";

export interface SettingsEntity extends BaseEntity {
    key: string;
    value: string;
}
