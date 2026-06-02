import { RecordEntity } from "../../../shared/modules/record/record.entity";
import { FormFieldEntity } from "../../../shared/modules/form/form.entity";
import Repository from "../../lib/repository";
import { codeGenerate } from "../../methods/crypto";

const FieldRepository = Repository.instance<FormFieldEntity>("field");
const RecordRepository = Repository.instance<RecordEntity>("record");

export async function getRecords(item_id?: string): Promise<RecordEntity[]> {
    if (item_id) {
        return await RecordRepository.find({ item_id } as any);
    }
    return await RecordRepository.find({} as any);
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

export type GroupedRecord = { item_id: string; code: string; data: RecordEntity[] };

export async function getAllRecord(
    form_name: string,
    config?: { page?: number; pageSize?: number; search?: string },
): Promise<{ records: GroupedRecord[]; total: number }> {
    const page = config?.page || 1;
    const pageSize = config?.pageSize || 10;
    const search = config?.search;

    const fieldIds = new Set<string>();
    await FieldRepository.findEach({ form_name } as any, (field) => {
        fieldIds.add(field.id);
    });

    if (fieldIds.size === 0) {
        return { records: [], total: 0 };
    }

    const groups = new Map<string, RecordEntity[]>();
    await RecordRepository.findEach({}, (record) => {
        if (!fieldIds.has(record.field_id)) return;
        const arr = groups.get(record.item_id);
        if (arr) {
            arr.push(record as RecordEntity);
        } else {
            groups.set(record.item_id, [record as RecordEntity]);
        }
    });

    const sortedGroups = Array.from(groups.entries())
        .map(([item_id, data]) => {
            data.sort((a, b) => {
                const tA = new Date(a.update_time || a.create_time || 0).getTime();
                const tB = new Date(b.update_time || b.create_time || 0).getTime();
                return tB - tA;
            });
            return { item_id, data };
        })
        .sort((a, b) => {
            const tA = new Date(a.data[0]?.update_time || a.data[0]?.create_time || 0).getTime();
            const tB = new Date(b.data[0]?.update_time || b.data[0]?.create_time || 0).getTime();
            return tB - tA;
        });

    let filtered = sortedGroups;
    if (search) {
        filtered = sortedGroups.filter((g) =>
            g.data.some((r) => String(r.field_value).includes(search)),
        );
    }

    const total = filtered.length;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize).map((g) => ({
        item_id: g.item_id,
        code: codeGenerate(g.item_id),
        data: g.data,
    }));

    return { records: paged, total };
}

export async function insertRecords(
    records: Omit<RecordEntity, "id" | "create_time" | "update_time" | "delete_time">[],
): Promise<boolean> {
    await RecordRepository.batchInsert(records as any);
    return true;
}
