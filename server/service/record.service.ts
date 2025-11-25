import { RecordImpl } from "../../shared/impl";
import { FormFieldEntity } from "../../shared/types/FormField";
import { RecordEntity } from "../../shared/types/Record";
import Repository from "../lib/repository";

const FieldRepository = Repository.instance(FormFieldEntity);
const RecordRepository = Repository.instance(RecordEntity);

// User Used
export async function getRecords(item_id?: string): Promise<Array<RecordImpl>> {
    const recordsData = [];
    if (item_id) {
        recordsData.push(...(await RecordRepository.find({ item_id })));
    } else {
        recordsData.push(...(await RecordRepository.find({})));
    }
    const records = recordsData.map((record) => {
        return new RecordImpl(record);
    });
    return records;
}

export async function submitRecord(record: Omit<RecordImpl, "id" | "create_time" | "update_time">): Promise<boolean> {
    const { item_id, field_id, field_value } = record;
    const exist = await RecordRepository.findOne({ item_id, field_id });
    if (exist) {
        const result = await RecordRepository.update({ id: exist.id }, { field_value });
        return result;
    }
    const result = await RecordRepository.insert({ item_id, field_id, field_value });
    return !!result;
}

// Admin used
export async function getAllRecord(form_name: string) {
    const fields = await FieldRepository.find({ form_name });
    const recordData = await Promise.all(fields.map(({ id: field_id }) => RecordRepository.find({ field_id })));
    const records = recordData
        .flat()
        .sort((a, b) => {
            const tA = new Date(a.update_time || a.create_time || 0).getTime();
            const tB = new Date(b.update_time || b.create_time || 0).getTime();
            return tB - tA;
        })
        .map((r) => new RecordImpl(r));
    return records;
}

export async function insertRecords(
    records: Omit<RecordImpl, "id" | "create_time" | "update_time">[],
): Promise<boolean> {
    await RecordRepository.insertMany(records);
    return true;
}
