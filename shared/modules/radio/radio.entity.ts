import { BaseEntity } from "../../lib/default/base.entity";

export interface FormFieldRadioEntity extends BaseEntity {
    field_id: string;
    radio_name: string;
    useful: boolean;
}
