import { FormFieldEntity } from "../../../shared/modules/form/form.entity";
import { FormFieldRadioEntity } from "../../../shared/modules/radio/radio.entity";
import { RecordEntity } from "../../../shared/modules/record/record.entity";
import Repository from "../../lib/repository";

const FieldRepository = Repository.instance<FormFieldEntity>("field");
const RadioRepository = Repository.instance<FormFieldRadioEntity>("radio");
const RecordRepository = Repository.instance<RecordEntity>("record");

export async function getFormList(): Promise<string[]> {
    const formSet = new Set<string>();
    await FieldRepository.findEach({}, (item) => {
        formSet.add(item.form_name);
    });
    return Array.from(formSet);
}

export async function getFormBriefList(): Promise<
    Array<{
        form_name: string;
        records_num: number;
        last_submit: number;
    }>
> {
    const formlist = await getFormList();
    const fieldToForm = new Map<string, string>();
    for (const form_name of formlist) {
        await FieldRepository.findEach({ form_name } as any, (field) => {
            fieldToForm.set(field.id, form_name);
        });
    }

    const itemIdsByForm = new Map<string, Set<string>>();
    const lastSubmitByForm = new Map<string, number>();
    for (const form_name of formlist) {
        itemIdsByForm.set(form_name, new Set());
        lastSubmitByForm.set(form_name, 0);
    }

    await RecordRepository.findEach({}, (record) => {
        const form_name = fieldToForm.get(record.field_id);
        if (!form_name) return;
        itemIdsByForm.get(form_name)!.add(record.item_id);
        const t = new Date(record.update_time || record.create_time || 0).getTime();
        if (t > lastSubmitByForm.get(form_name)!) {
            lastSubmitByForm.set(form_name, t);
        }
    });

    return formlist.map((form_name) => ({
        form_name,
        records_num: itemIdsByForm.get(form_name)?.size || 0,
        last_submit: lastSubmitByForm.get(form_name) || 0,
    }));
}

export async function getFormNameByField(field_id: string): Promise<string> {
    const field = await FieldRepository.findOne({ id: field_id } as any);
    if (field) {
        return field.form_name;
    } else {
        return "";
    }
}

export async function getFieldList(
    form_name: string,
): Promise<Array<FormFieldEntity & { radios?: FormFieldRadioEntity[] }>> {
    const fieldsData: FormFieldEntity[] = [];
    await FieldRepository.findEach({ form_name } as any, (field) => {
        fieldsData.push(field);
    });
    fieldsData.sort((a, b) => (a.position || 0) - (b.position || 0));

    const radioTypes = new Set(["select", "mulselect", "checkbox", "checkboxgroup"]);
    const fieldsNeedingRadios = fieldsData.filter((f) => radioTypes.has(f.field_type));
    if (fieldsNeedingRadios.length === 0) {
        return fieldsData.map((f) => ({ ...f }));
    }

    const radiosByField = new Map<string, FormFieldRadioEntity[]>();
    for (const f of fieldsNeedingRadios) {
        radiosByField.set(f.id, []);
    }
    await RadioRepository.findEach({}, (radio) => {
        const arr = radiosByField.get(radio.field_id);
        if (arr) arr.push(radio);
    });

    return fieldsData.map((fieldData) => {
        if (radioTypes.has(fieldData.field_type)) {
            const radios = radiosByField.get(fieldData.id) || [];
            return { ...fieldData, radios };
        }
        return { ...fieldData };
    });
}

export async function createField(
    field: Omit<FormFieldEntity, "id" | "create_time" | "update_time" | "delete_time" | "comment" | "placeholder" | "position">,
): Promise<string | null> {
    const { form_name, field_name } = field;
    const exist = await FieldRepository.findOne({ form_name, field_name } as any);
    if (exist) {
        return null;
    }
    const lastField = await FieldRepository.findOne({}, true);
    const position = (lastField?.position || 0) + 1;
    const result = await FieldRepository.insert({
        ...field,
        position,
        comment: "",
        placeholder: "",
    } as any);
    return result?.id || null;
}

export async function updateSingleField(id: string, key: string, value: number | string | boolean): Promise<boolean> {
    const exist = await FieldRepository.findOne({ id } as any);
    if (!exist) {
        return false;
    }
    const result = await FieldRepository.update({ id } as any, { [key]: value } as any);
    return result;
}

export async function updateFormName(form_name: string, new_name: string): Promise<boolean> {
    const exist = await FieldRepository.findOne({ form_name } as any);
    if (!exist) {
        return false;
    }
    const result = await FieldRepository.update({ form_name } as any, { form_name: new_name } as any);
    return result;
}

export async function deleteForm(form_name: string): Promise<void> {
    // Collect all field ids for this form
    const fieldIds: string[] = [];
    await FieldRepository.findEach({ form_name } as any, (field) => {
        fieldIds.push(field.id);
    });

    if (fieldIds.length > 0) {
        // Delete all records belonging to these fields in one pass
        await RecordRepository.hardDelete({ field_id: { $in: fieldIds } } as any);
        // Delete all radios for these fields in one pass
        await RadioRepository.hardDelete({ field_id: { $in: fieldIds } } as any);
    }

    // Delete all fields
    await FieldRepository.hardDelete({ form_name } as any);
}
