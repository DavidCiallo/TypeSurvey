import { RecordEntity } from "../../../shared/modules/record/record.entity";
import { FormFieldEntity } from "../../../shared/modules/form/form.entity";
import Repository from "../../lib/repository";
import { codeGenerate } from "../../methods/crypto";
import { pinyin } from "pinyin-pro";

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
        const query = search.trim().toLowerCase();
        filtered = sortedGroups.filter((g) =>
            g.data.some((r) => {
                const text = String(r.field_value);
                // 原文大小写不敏感匹配
                if (text.toLowerCase().includes(query)) return true;
                try {
                    // 拼音全拼匹配（如 "beijing" 匹配 "北京"）
                    const pinyinStr = pinyin(text, { toneType: "none", type: "array" }).join("");
                    if (pinyinStr.toLowerCase().includes(query)) return true;
                    // 拼音首字母匹配（如 "bj" 匹配 "北京"）
                    const firstLetters = pinyin(text, { pattern: "first", toneType: "none", type: "array" }).join("");
                    if (firstLetters.toLowerCase().includes(query)) return true;
                } catch {
                    // 非中文字符调用 pinyin 可能抛错，忽略
                }
                return false;
            }),
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

export async function deleteRecordByItem(item_id: string): Promise<void> {
    await RecordRepository.hardDelete({ item_id } as any);
}
