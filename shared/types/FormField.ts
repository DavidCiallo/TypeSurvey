import { FieldType } from "../impl/field";
import { BaseEntity } from "./Base";

export class FormFieldEntity extends BaseEntity {
    form_name: string;
    field_name: string;
    field_type: FieldType;
}
