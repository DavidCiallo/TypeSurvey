import { BaseEntity } from "../../lib/default/base.entity";
import { FieldType } from "../../impl/field";

export interface FormFieldEntity extends BaseEntity {
    form_name: string;
    field_name: string;
    field_type: FieldType;
    comment: string;
    placeholder: string;
    position: number;
    required: boolean;
    disabled: boolean;
}
