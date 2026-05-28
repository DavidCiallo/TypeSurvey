import { FormFieldRadioEntity } from "../../../shared/modules/radio/radio.entity";
import Repository from "../../lib/repository";

const RadioRepository = Repository.instance<FormFieldRadioEntity>("radio");

export async function createRadio(
    radio: Omit<FormFieldRadioEntity, "id" | "create_time" | "update_time" | "delete_time">,
): Promise<string | null> {
    const { field_id, radio_name } = radio;
    const exist = await RadioRepository.findOne({ field_id, radio_name } as any);
    if (exist) {
        return null;
    }
    const result = await RadioRepository.insert({ radio_name, field_id, useful: true } as any);
    return result?.id || null;
}

export async function updateRadio(id: string, key: string, value: boolean | string): Promise<boolean> {
    const exist = await RadioRepository.findOne({ id } as any);
    if (!exist) {
        return false;
    }
    const result = await RadioRepository.update({ id } as any, { [key]: value } as any);
    return result;
}
