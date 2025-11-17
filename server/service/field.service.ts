import { FormFieldImpl, FormFieldRadioImpl } from "../../shared/impl";
import { FormFieldEntity } from "../../shared/types/FormField";
import { FormFieldRadioEntity } from "../../shared/types/FormFieldRadio";
import Repository from "../lib/repository";

const FieldRepository = Repository.instance(FormFieldEntity);
const RadioRepository = Repository.instance(FormFieldRadioEntity);

export async function getFormList(): Promise<string[]> {
    const fields = await FieldRepository.find();
    const formSet = new Set(fields.map((item) => item.form_name));
    return Array.from(formSet);
}

export async function getFormNameByField(field_id: string): Promise<string> {
    const field = await FieldRepository.findOne({ id: field_id });
    if (field) {
        return field.form_name;
    } else {
        return "";
    }
}

export async function getFieldList(form_name: string): Promise<FormFieldImpl[]> {
    const fieldsData = await FieldRepository.find({ form_name });
    const radiosData = await RadioRepository.find();
    const fields = fieldsData.map((fieldData) => {
        if (
            fieldData.field_type == "select" ||
            fieldData.field_type == "mulselect" ||
            fieldData.field_type == "checkbox"
        ) {
            const radios = radiosData
                .filter((radioData) => radioData.field_id === fieldData.id)
                .map((radioData) => new FormFieldRadioImpl(radioData));
            return new FormFieldImpl(fieldData, radios);
        } else {
            return new FormFieldImpl(fieldData);
        }
    });
    return fields;
}

export async function createField(field: Omit<FormFieldImpl, "id" | "comment" | "placeholder">): Promise<boolean> {
    const { form_name, field_name } = field;
    const exist = await FieldRepository.findOne({ form_name, field_name });
    if (exist) {
        return false;
    }
    const result = await FieldRepository.insert({
        ...field,
        placeholder: "",
    });
    return result;
}

export async function updateSingleField(id: string, key: string, value: string): Promise<boolean> {
    const exist = await FieldRepository.findOne({ id });
    if (!exist) {
        return false;
    }
    const result = await FieldRepository.update({ id }, { [key]: value });
    return result;
}

export async function updateFormName(origin_name: string, new_name: string): Promise<boolean> {
    const exist = await FieldRepository.findOne({ form_name: origin_name });
    if (!exist) {
        return false;
    }
    const result = await FieldRepository.update({ form_name: origin_name }, { form_name: new_name });
    return result;
}
