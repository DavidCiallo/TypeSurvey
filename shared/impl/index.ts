import { FormFieldEntity } from "../types/FormField";
import { FormFieldRadioEntity } from "../types/FormFieldRadio";
import { FieldType } from "./field";

export class FormFieldImpl implements Pick<FormFieldEntity, "id" | "form_name" | "field_name" | "field_type"> {
    id: string;
    form_name: string;
    field_name: string;
    field_type: FieldType;
    radios?: FormFieldRadioImpl[];
    constructor(field: FormFieldEntity, radios?: FormFieldRadioImpl[]) {
        this.id = field.id;
        this.field_name = field.field_name;
        this.field_type = field.field_type;
        if (field.field_type === "select") {
            this.radios = radios
        }
    }
}
export class FormFieldRadioImpl implements Pick<FormFieldRadioEntity, "id" | "field_id" | "radio_name" | "radio_value"> {
    id: string;
    field_id: string;
    radio_name: string;
    radio_value: string;
    constructor(radio: FormFieldRadioEntity) {
        this.id = radio.id;
        this.field_id = radio.field_id;
        this.radio_name = radio.radio_name;
        this.radio_value = radio.radio_value;
    }
}