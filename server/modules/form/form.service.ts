import { FormFieldEntity } from "../../../shared/modules/form/form.entity";
import { FormFieldRadioEntity } from "../../../shared/modules/radio/radio.entity";
import { RecordEntity } from "../../../shared/modules/record/record.entity";
import Repository from "../../lib/repository";

const FieldRepository = Repository.instance<FormFieldEntity>("field");
const RadioRepository = Repository.instance<FormFieldRadioEntity>("radio");
const RecordRepository = Repository.instance<RecordEntity>("record");

export async function getFormList(): Promise<string[]> {
    const fields = await FieldRepository.find();
    const formSet = new Set(fields.map((item) => item.form_name));
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
    const fieldIdsList = await Promise.all(
        formlist.map(async (form_name) => {
            const fields = await FieldRepository.find({ form_name } as any);
            return fields.map((f) => f.id);
        }),
    );
    const allRecords = (await RecordRepository.find()).sort((a, b) => {
        const tA = new Date(a.update_time || a.create_time || 0);
        const tB = new Date(b.update_time || b.create_time || 0);
        return tB.getTime() - tA.getTime();
    });
    const result = formlist.map((form_name, index) => {
        const fieldIds = fieldIdsList[index];
        const records = allRecords.filter((r) => fieldIds.includes(r.field_id));
        const records_num = new Set(records.map((i) => i.item_id)).size;
        const last_submit = records[0]?.update_time || records[0]?.create_time || 0;
        return { form_name, records_num, last_submit };
    });
    return result;
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
    const fieldsData = await FieldRepository.find({ form_name } as any);
    const radiosData = await RadioRepository.find();
    const fields = fieldsData
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((fieldData) => {
            if (
                fieldData.field_type == "select" ||
                fieldData.field_type == "mulselect" ||
                fieldData.field_type == "checkbox"
            ) {
                const radios = radiosData
                    .filter((radioData) => radioData.field_id === fieldData.id);
                return { ...fieldData, radios };
            } else {
                return { ...fieldData };
            }
        });
    return fields;
}

export async function createField(
    field: Omit<FormFieldEntity, "id" | "create_time" | "update_time" | "delete_time" | "comment" | "placeholder" | "position">,
): Promise<string | null> {
    const { form_name, field_name } = field;
    const exist = await FieldRepository.findOne({ form_name, field_name } as any);
    const position = (await FieldRepository.count()) + 1;
    if (exist) {
        return null;
    }
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
