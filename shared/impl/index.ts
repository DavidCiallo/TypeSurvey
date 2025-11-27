import { FormFieldEntity } from "../types/FormField";
import { FormFieldRadioEntity } from "../types/FormFieldRadio";
import { RecordEntity } from "../types/Record";
import { FieldType } from "./field";

export class FormFieldImpl implements Omit<FormFieldEntity, "create_time" | "update_time" | "delete_time"> {
    id: string;
    form_name: string;
    field_name: string;
    field_type: FieldType;
    required: boolean;
    disabled: boolean;
    radios?: FormFieldRadioImpl[];
    comment: string;
    placeholder: string;
    position: number;

    constructor(field: FormFieldEntity, radios?: FormFieldRadioImpl[]) {
        this.id = field.id;
        this.field_name = field.field_name;
        this.field_type = field.field_type;
        if (field.field_type === "select" || field.field_type === "mulselect" || field.field_type === "checkbox") {
            this.radios = radios;
        }
        this.comment = field.comment;
        this.placeholder = field.placeholder;
        this.position = field.position;
        this.required = field.required || false;
        this.disabled = field.disabled || false;
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

export class RecordImpl
    implements Pick<RecordEntity, "id" | "item_id" | "field_id" | "field_value" | "create_time" | "update_time">
{
    id: string;
    item_id: string;
    field_id: string;
    field_value: number | string | boolean;
    create_time: number;
    update_time: number | null;
    constructor(record: RecordEntity) {
        this.id = record.id;
        this.item_id = record.item_id;
        this.field_id = record.field_id;
        this.field_value = record.field_value;
        this.create_time = record.create_time;
        this.update_time = record.update_time;
    }
}
