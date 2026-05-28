import { RecordEntity } from "../../../shared/modules/record/record.entity";
import { FormFieldEntity } from "../../../shared/modules/form/form.entity";
import Repository from "../../lib/repository";

const FieldRepository = Repository.instance<FormFieldEntity>("field");
const RecordRepository = Repository.instance<RecordEntity>("record");

export async function getRecords(item_id?: string): Promise<RecordEntity[]> {
    const recordsData: RecordEntity[] = [];
    if (item_id) {
        recordsData.push(...(await RecordRepository.find({ item_id } as any)));
    } else {
        recordsData.push(...(await RecordRepository.find({} as any)));
    }
    return recordsData;
}

export async function submitRecord(
    record: Omit<RecordEntity, "id" | "create_time" | "update_time" | "delete_time">,
): Promise<boolean> {
    const { item_id, field_id, field_value } = record;
    const exist = await RecordRepository.findOne({ item_id, field_id } as any);
    if (exist) {
        const result = await RecordRepository.update({ id: exist.id } as any, { field_value } as any);
        return result;
    }
    const result = await RecordRepository.insert({ item_id, field_id, field_value } as any);
    return !!result;
}

export async function getAllRecord(form_name: string) {
    const fields = await FieldRepository.find({ form_name } as any);
    const recordData = await Promise.all(
        fields.map(({ id: field_id }) => RecordRepository.find({ field_id } as any)),
    );
    const records = recordData
        .flat()
        .sort((a, b) => {
            const tA = new Date(a.update_time || a.create_time || 0).getTime();
            const tB = new Date(b.update_time || b.create_time || 0).getTime();
            return tB - tA;
        });
    return records;
}

export async function insertRecords(
    records: Omit<RecordEntity, "id" | "create_time" | "update_time" | "delete_time">[],
): Promise<boolean> {
    await RecordRepository.batchInsert(records as any);
    return true;
}
