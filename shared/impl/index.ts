import { FormFieldEntity } from "../types/FormField";
import { FormFieldRadioEntity } from "../types/FormFieldRadio";

export interface FormFieldImpl extends Pick<FormFieldEntity, "id" | "field_name" | "field_type"> { }
export interface FormFieldRadioImpl extends Pick<FormFieldRadioEntity, "id" | "field_id" | "radio_name" | "radio_value"> { }