import { BaseEntity } from "../../lib/default/base.entity";

export interface RecordEntity extends BaseEntity {
    /** Always populated by the Go server; see FormFieldEntity.team_id. */
    team_id?: string;
    item_id: string;
    field_id: string;
    field_value: number | string | boolean;
}
