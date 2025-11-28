import { FieldType } from "../impl/field";
import { BaseEntity } from "./Base";

export class FormFieldEntity extends BaseEntity {
    form_name: string;
    field_name: string;
    field_type: FieldType;
    comment: string;
    placeholder: string;
    position: number;
    required: boolean;
    disabled: boolean;
}
