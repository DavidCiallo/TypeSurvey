import { FieldType } from "../../../shared/impl/field";
import { Locale } from "../../methods/locale";

const locale = Locale("FieldType");

export const FieldTypeList: Array<{
    name: string;
    type: FieldType;
}> = ["text", "email", "password", "checkbox", "checkboxgroup", "select", "mulselect", "textarea", "number", "file"].map((type) => ({
    name: locale[type] || "",
    type: type as FieldType,
}));
