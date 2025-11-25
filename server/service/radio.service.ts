import { FormFieldRadioImpl } from "../../shared/impl";
import { FormFieldRadioEntity } from "../../shared/types/FormFieldRadio";
import Repository from "../lib/repository";

const RadioRepository = Repository.instance(FormFieldRadioEntity);

export async function createRadio(radio: Omit<FormFieldRadioImpl, "id">): Promise<string | null> {
    const { field_id, radio_name, useful } = radio;
    const exist = await RadioRepository.findOne({ field_id, radio_name });
    if (exist) {
        return null;
    }
    const result = await RadioRepository.insert({ radio_name, field_id, useful });
    return result;
}

export async function updateRadio(id: string, key: string, value: boolean | string): Promise<boolean> {
    const exist = await RadioRepository.findOne({ id });
    if (!exist) {
        return false;
    }
    const result = await RadioRepository.update({ id }, { [key]: value });
    return result;
}
