import { FormFieldEntity } from "../types/FormField";
import { FormFieldRadioEntity } from "../types/FormFieldRadio";
import { FieldType } from "./field";

export class FormFieldImpl implements Pick<FormFieldEntity, "id" | "form_name" | "field_name" | "field_type" | "comment"> {
    id: string;
    form_name: string;
    field_name: string;
    field_type: FieldType;
    comment: string;    
    radios?: FormFieldRadioImpl[];
    constructor(field: FormFieldEntity, radios?: FormFieldRadioImpl[]) {
        this.id = field.id;
        this.field_name = field.field_name;
        this.field_type = field.field_type;
        if (field.field_type === "select" || field.field_type === "mulselect" || field.field_type === "checkbox") {
            this.radios = radios
        }
        this.comment = field.comment;
    }
}
export class FormFieldRadioImpl implements Pick<FormFieldRadioEntity, "id" | "field_id" | "radio_name" | "useful"> {
    id: string;
    field_id: string;
    radio_name: string;
    useful: boolean;
    constructor(radio: FormFieldRadioEntity) {
        this.id = radio.id;
        this.field_id = radio.field_id;
        this.radio_name = radio.radio_name;
        this.useful = radio.useful;
    }
}