import { BaseEntity } from "../../lib/default/base.entity";

export interface FormFieldRadioEntity extends BaseEntity {
    /** Always populated by the Go server; see FormFieldEntity.team_id. */
    team_id?: string;
    field_id: string;
    radio_name: string;
    useful: boolean;
}
