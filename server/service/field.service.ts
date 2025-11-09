import { FormFieldImpl, FormFieldRadioImpl } from "../../shared/impl";
import { FormFieldEntity } from "../../shared/types/FormField";
import { FormFieldRadioEntity } from "../../shared/types/FormFieldRadio";
import Repository from "../lib/repository";

const FieldRepository = Repository.instance(FormFieldEntity);
const RadioRepository = Repository.instance(FormFieldRadioEntity);

export async function getFormList(): Promise<string[]> {
    const fields = await FieldRepository.find();
    const formSet = new Set(fields.map(item => item.form_name));
    return Array.from(formSet);
}

export async function getFieldList(form_name: string): Promise<FormFieldImpl[]> {
    const fieldsData = await FieldRepository.find({ form_name });
    const radiosData = await RadioRepository.find();
    const fields = fieldsData.map(fieldData => {
        if (fieldData.field_type == "select") {
            const radios = radiosData
                .filter(radioData => radioData.field_id === fieldData.id)
                .map(radioData => new FormFieldRadioImpl(radioData));
            return new FormFieldImpl(fieldData, radios);
        } else {
            return new FormFieldImpl(fieldData);
        }
    })
    return fields;
}

export async function createField(field: Omit<FormFieldImpl, "id">): Promise<boolean> {
    const result = await FieldRepository.insert(field);
    return result;
}

export async function updateSingleField(field: FormFieldImpl): Promise<boolean> {
    const result = await FieldRepository.update({ id: field.id }, field);
    return result;
}

export async function updateFormName(origin_name: string, new_name: string): Promise<boolean> {
    const result = await FieldRepository.update({ form_name: origin_name }, { form_name: new_name });
    return result;
}