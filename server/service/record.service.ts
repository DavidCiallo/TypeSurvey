import { RecordImpl } from "../../shared/impl";
import { RecordEntity } from "../../shared/types/Record";
import Repository from "../lib/repository";

const RecordRepository = Repository.instance(RecordEntity);

export async function getRecords(item_id: string): Promise<Array<RecordImpl>> {
    const recordsData = await RecordRepository.find({ item_id });
    const records = recordsData.map((record) => {
        return new RecordImpl(record);
    });
    return records;
}

export async function submitRecord(record: Omit<RecordImpl, "id">): Promise<boolean> {
    const { item_id, field_id, field_value } = record;
    const exist = await RecordRepository.findOne({ item_id, field_id });
    if (exist) {
        const result = await RecordRepository.update({ id: exist.id }, { field_value });
        return result;
    }
    const result = await RecordRepository.insert({ item_id, field_id, field_value });
    return result;
}
