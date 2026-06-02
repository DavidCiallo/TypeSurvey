// @ts-nocheck
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const _filename = fileURLToPath(import.meta.url);
const SERVER_DIR = path.resolve(path.dirname(_filename), "..");
const DATA_DIR = path.join(path.resolve(SERVER_DIR, ".."), "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

type Row = Record<string, any>;

function collectionFile(name: string): string {
    return path.join(DATA_DIR, `${name}.jsonl`);
}

/** Read lines from end to start (newest first) — used for paginated find() with DESC order */
async function* readLinesReverse(name: string): AsyncGenerator<Row, void, void> {
    const file = collectionFile(name);
    if (!fs.existsSync(file)) return;

    const stat = fs.statSync(file);
    if (stat.size === 0) return;

    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(65536);
    let pos = stat.size;
    let remainder = "";

    try {
        while (pos > 0) {
            const readSize = Math.min(65536, pos);
            pos -= readSize;
            fs.readSync(fd, buf, 0, readSize, pos);
            let chunk = buf.toString("utf-8", 0, readSize) + remainder;
            remainder = "";

            const lines = chunk.split("\n");
            remainder = lines[0];
            for (let i = lines.length - 1; i >= 1; i--) {
                const trimmed = lines[i].trim();
                if (!trimmed) continue;
                const row = JSON.parse(trimmed);
                yield row;
            }
        }
        if (remainder.trim()) {
            const row = JSON.parse(remainder.trim());
            yield row;
        }
    } finally {
        fs.closeSync(fd);
    }
}

/** Read lines forward — used for findOne(), count(), findAllIgnoreDelete() */
async function* readLines(name: string): AsyncGenerator<Row, void, void> {
    const file = collectionFile(name);
    if (!fs.existsSync(file)) return;

    const stream = Bun.file(file).stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const row = JSON.parse(trimmed);
                yield row;
            }
        }
        if (buffer.trim()) {
            const row = JSON.parse(buffer.trim());
            yield row;
        }
    } finally {
        reader.cancel().catch(() => {});
    }
}

/** Check if a row matches the where conditions. Supports operators: $eq, $ne, $gt, $gte, $lt, $lte, $in. */
function matches<T extends Row>(row: T, where: Record<string, any>): boolean {
    for (const [key, val] of Object.entries(where)) {
        if (val === undefined || val === "") continue;
        // null is a valid value for $eq / $ne
        if (val === null) {
            if (row[key] !== null) return false;
            continue;
        }
        if (typeof val === "object" && !Array.isArray(val)) {
            for (const [op, opVal] of Object.entries(val)) {
                const rowVal = row[key];
                if (op === "$eq")  { if (rowVal !== opVal) return false; }
                if (op === "$ne")  { if (rowVal === opVal) return false; }
                if (op === "$gt")  { if (!(rowVal > opVal)) return false; }
                if (op === "$gte") { if (!(rowVal >= opVal)) return false; }
                if (op === "$lt")  { if (!(rowVal < opVal)) return false; }
                if (op === "$lte") { if (!(rowVal <= opVal)) return false; }
                if (op === "$in")  { if (!Array.isArray(opVal) || !opVal.includes(rowVal)) return false; }
            }
        } else {
            if (row[key] !== val) return false;
        }
    }
    return true;
}

class Repository<
    T extends { id?: string; create_time?: number | null; update_time?: number | null; delete_time?: number | null },
> {
    private collection: string;
    private static instances = new Map<string, any>();
    private writeLock = Promise.resolve();

    private constructor(collection: string) {
        this.collection = collection;
    }

    private async withLock<R>(fn: () => Promise<R>): Promise<R> {
        const prev = this.writeLock;
        let release: () => void;
        this.writeLock = new Promise<void>((resolve) => {
            release = resolve;
        });
        await prev;
        try {
            return await fn();
        } finally {
            release!();
        }
    }

    private filePath(): string {
        return collectionFile(this.collection);
    }

    public static instance<
        T extends {
            id?: string;
            create_time?: number | null;
            update_time?: number | null;
            delete_time?: number | null;
        },
    >(collection: string): Repository<T> {
        const key = collection.toLowerCase();
        if (!Repository.instances.has(key)) {
            Repository.instances.set(key, new Repository(key));
        }
        return Repository.instances.get(key);
    }

    async find(
        where?: Record<string, any>,
        config?: { limit?: number; offset?: number; since?: number },
    ): Promise<T[]> {
        const results: T[] = [];
        const since = config?.since;
        const limit = config?.limit;
        const offset = config?.offset || 0;

        // Use reverse read to get newest-first (matches previous Drizzle DESC order)
        for await (const row of readLinesReverse(this.collection)) {
            if (row.delete_time) continue;
            if (since && row.create_time < since) continue;

            if (where && !matches(row, where as Record<string, any>)) continue;

            results.push(row as T);
            // If limit is set, stop reading when we have enough to satisfy offset+limit
            if (limit !== undefined && results.length >= offset + limit) break;
        }

        if (offset > 0 || limit !== undefined) {
            return results.slice(offset, limit !== undefined ? offset + limit : undefined);
        }
        return results;
    }

    /** Stream rows one at a time via callback — never accumulates, avoids OOM */
    async findEach(
        where: Record<string, any>,
        callback: (row: T) => void,
        config?: { limit?: number; since?: number },
    ): Promise<number> {
        let count = 0;
        const since = config?.since;
        const limit = config?.limit;

        for await (const row of readLines(this.collection)) {
            if (row.delete_time) continue;
            if (since && row.create_time < since) continue;
            if (!matches(row, where)) continue;

            callback(row as T);
            count++;
            if (limit && count >= limit) break;
        }
        return count;
    }

    /** Streaming sum of a numeric field — avoids loading all rows into memory */
    async sum(field: string, where?: Record<string, any>, since?: number): Promise<number> {
        let total = 0;
        for await (const row of readLines(this.collection)) {
            if (row.delete_time) continue;
            if (since && row.create_time < since) continue;
            if (where && !matches(row, where as Record<string, any>)) continue;
            total += row[field] || 0;
        }
        return total;
    }

    async findOne(where: Partial<T>, reverse = false): Promise<T | null> {
        const reader = reverse ? readLinesReverse(this.collection) : readLines(this.collection);
        for await (const row of reader) {
            if (row.delete_time) continue;
            if (matches(row, where as Record<string, any>)) return row as T;
        }
        return null;
    }

    async findIgnoreDelete(where: Partial<T>): Promise<T | null> {
        for await (const row of readLines(this.collection)) {
            if (matches(row, where as Record<string, any>)) return row as T;
        }
        return null;
    }

    /** Get ALL records (including soft-deleted) — used for data export */
    async findAllIgnoreDelete(): Promise<T[]> {
        const results: T[] = [];
        for await (const row of readLines(this.collection)) {
            results.push(row as T);
        }
        return results;
    }

    async findByIds(ids: string[]): Promise<T[]> {
        if (ids.length === 0) return [];
        const idSet = new Set(ids);
        const results: T[] = [];
        for await (const row of readLines(this.collection)) {
            if (row.delete_time) continue;
            if (row.id && idSet.has(row.id)) {
                results.push(row as T);
            }
        }
        return results;
    }

    /** Stream all records in batches (including soft-deleted) — avoids loading entire table into memory */
    async *findAllIgnoreDeleteBatch(batchSize = 1000): AsyncGenerator<T[], void, void> {
        let batch: T[] = [];
        for await (const row of readLines(this.collection)) {
            batch.push(row as T);
            if (batch.length >= batchSize) {
                yield batch;
                batch = [];
            }
        }
        if (batch.length > 0) yield batch;
    }

    async insert(entity: Partial<T>): Promise<T> {
        return this.withLock(async () => {
            const now = Date.now();
            const id = entity.id || nanoid(6);
            const row = {
                ...entity,
                id,
                create_time: entity.create_time || now,
                update_time: entity.update_time || now,
                delete_time: null,
            };
            fs.appendFileSync(this.filePath(), JSON.stringify(row) + "\n");
            return row as T;
        });
    }

    async update(where: Partial<T>, updateData: Partial<T>, includeDeleted = false): Promise<boolean> {
        return this.withLock(async () => {
            const now = Date.now();
            let updated = false;
            const file = this.filePath();
            if (!fs.existsSync(file)) return false;

            const content = fs.readFileSync(file, "utf-8");
            const lines = content.split("\n");
            const out: string[] = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const row = JSON.parse(trimmed);
                if (!includeDeleted && row.delete_time) {
                    out.push(line);
                    continue;
                }

                let match = true;
                for (const [key, val] of Object.entries(where)) {
                    if (row[key] !== val) {
                        match = false;
                        break;
                    }
                }

                if (match) {
                    Object.assign(row, updateData, { update_time: now });
                    out.push(JSON.stringify(row));
                    updated = true;
                } else {
                    out.push(line);
                }
            }

            fs.writeFileSync(file, out.join("\n") + "\n");
            return updated;
        });
    }

    async delete(where: Partial<T>): Promise<boolean> {
        const now = Date.now();
        return this.update(where, { delete_time: now } as Partial<T>);
    }

    /** Clear all data — used before import */
    async truncate(): Promise<void> {
        return this.withLock(async () => {
            fs.writeFileSync(this.filePath(), "");
        });
    }

    /** Permanently delete matching records */
    async hardDelete(where: Partial<T>): Promise<boolean> {
        return this.withLock(async () => {
            const file = this.filePath();
            if (!fs.existsSync(file)) return false;

            let deleted = false;

            const content = fs.readFileSync(file, "utf-8");
            const lines = content.split("\n");
            const out: string[] = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const row = JSON.parse(trimmed);

                let match = true;
                for (const [key, val] of Object.entries(where)) {
                    if (row[key] !== val) {
                        match = false;
                        break;
                    }
                }

                if (match) {
                    deleted = true;
                } else {
                    out.push(line);
                }
            }

            fs.writeFileSync(file, out.join("\n") + "\n");
            return deleted;
        });
    }

    /**
     * Atomic read-modify-write patch: apply a function to the matched row inside the write lock.
     * The callback receives the current row (or null) and returns the new row (or null to skip).
     */
    async atomicPatch(
        where: Partial<T>,
        patch: (row: T | null) => Partial<T> | null,
        includeDeleted = false,
    ): Promise<boolean> {
        return this.withLock(async () => {
            const file = this.filePath();
            if (!fs.existsSync(file)) return false;

            const content = fs.readFileSync(file, "utf-8");
            const lines = content.split("\n");
            const now = Date.now();
            let updated = false;

            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (!trimmed) continue;
                const row = JSON.parse(trimmed);
                if (!includeDeleted && row.delete_time) continue;

                let match = true;
                for (const [key, val] of Object.entries(where)) {
                    if (row[key] !== val) { match = false; break; }
                }

                if (match) {
                    const patchData = patch(row);
                    if (patchData) {
                        Object.assign(row, patchData, { update_time: now });
                        lines[i] = JSON.stringify(row);
                        updated = true;
                    }
                }
            }

            if (updated) {
                fs.writeFileSync(file, lines.join("\n") + "\n");
            }
            return updated;
        });
    }

    /** Insert multiple rows in one write */
    async batchInsert(entities: Partial<T>[]): Promise<number> {
        return this.withLock(async () => {
            if (entities.length === 0) return 0;
            const now = Date.now();
            const rows = entities.map((e) => ({
                ...e,
                id: e.id || nanoid(6),
                create_time: e.create_time || now,
                update_time: e.update_time || now,
                delete_time: null,
            }));
            fs.appendFileSync(this.filePath(), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
            return rows.length;
        });
    }

    async count(where?: Partial<T>, since?: number): Promise<number> {
        let count = 0;
        for await (const row of readLines(this.collection)) {
            if (row.delete_time) continue;
            if (since && row.create_time < since) continue;
            if (where && !matches(row, where as Record<string, any>)) continue;
            count++;
        }
        return count;
    }
}

export default Repository;
