import { SettingsEntity } from "../../../shared/modules/settings/settings.entity";
import Repository from "../../lib/repository";

const settingsRepository: Repository<SettingsEntity> = Repository.instance<SettingsEntity>("settings");

let cache: Record<string, string> | null = null;

async function refreshCache(): Promise<Record<string, string>> {
    cache = {};
    await settingsRepository.findEach({}, (row) => {
        if (row.key && !row.delete_time) {
            cache![row.key] = row.value;
        }
    });
    return cache;
}

export async function getSettings(): Promise<Record<string, any>> {
    if (!cache) await refreshCache();
    return { ...cache };
}

export async function saveSettings(entries: { key: string; value: string }[]): Promise<void> {
    for (const { key, value } of entries) {
        const existing = await settingsRepository.findOne({ key } as any);
        if (existing) {
            await settingsRepository.update({ key } as any, { value } as any);
        } else {
            await settingsRepository.insert({ key, value } as any);
        }
    }
    cache = null;
    await refreshCache();
}

export async function getAllData(): Promise<{ accounts: any[]; fields: any[]; radios: any[]; records: any[]; settings: any[] }> {
    const accountRepo: Repository<any> = Repository.instance<any>("account");
    const fieldRepo: Repository<any> = Repository.instance<any>("form_field");
    const radioRepo: Repository<any> = Repository.instance<any>("radio");
    const recordRepo: Repository<any> = Repository.instance<any>("record");

    const accounts: any[] = [];
    const fields: any[] = [];
    const radios: any[] = [];
    const records: any[] = [];
    const settings: any[] = [];

    for await (const batch of accountRepo.findAllIgnoreDeleteBatch(500)) {
        accounts.push(...batch);
    }
    for await (const batch of fieldRepo.findAllIgnoreDeleteBatch(500)) {
        fields.push(...batch);
    }
    for await (const batch of radioRepo.findAllIgnoreDeleteBatch(500)) {
        radios.push(...batch);
    }
    for await (const batch of recordRepo.findAllIgnoreDeleteBatch(500)) {
        records.push(...batch);
    }
    for await (const batch of settingsRepository.findAllIgnoreDeleteBatch(500)) {
        settings.push(...batch);
    }

    return { accounts, fields, radios, records, settings };
}

export async function importAllData(data: {
    accounts?: any[];
    fields?: any[];
    radios?: any[];
    records?: any[];
    settings?: any[];
}): Promise<Record<string, number>> {
    const imported: Record<string, number> = {};

    const accountRepo: Repository<any> = Repository.instance<any>("account");
    const fieldRepo: Repository<any> = Repository.instance<any>("form_field");
    const radioRepo: Repository<any> = Repository.instance<any>("radio");
    const recordRepo: Repository<any> = Repository.instance<any>("record");

    const repos: Record<string, { repo: Repository<any>; rows: any[] }> = {
        accounts: { repo: accountRepo, rows: data.accounts || [] },
        fields: { repo: fieldRepo, rows: data.fields || [] },
        radios: { repo: radioRepo, rows: data.radios || [] },
        records: { repo: recordRepo, rows: data.records || [] },
        settings: { repo: settingsRepository, rows: data.settings || [] },
    };

    for (const [key, { repo, rows }] of Object.entries(repos)) {
        if (rows.length === 0) {
            imported[key] = 0;
            continue;
        }
        await repo.truncate();
        await repo.batchInsert(rows);
        imported[key] = rows.length;
    }

    cache = null;
    await refreshCache();
    return imported;
}
