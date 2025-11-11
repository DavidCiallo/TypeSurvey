import { BaseEntity } from "./Base";

export class FormFieldRadioEntity extends BaseEntity {
    field_id: string;
    radio_name: string;
    useful: boolean;
}