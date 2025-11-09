import fs from 'fs';
import path from 'path';


type Constructor<T> = { new(...args: any[]): T };

const DB_PATH = "form_data"

class Repository<T> {
    public name: string;
    private filePath: string;
    private cache: T[] = [];
    private isInitialized: boolean = false;

    private static instances = new Map<string, any>();
    /**
     * @param entityClass The class of the entity this repository will manage.
     */
    private constructor(private entityClass: Constructor<T>) {
        this.name = entityClass.name.toLowerCase().replace("entity", "");
        this.filePath = path.join(`./${DB_PATH}`, `${this.name}.json`);
    }

    public static instance<T>(
        entityClass: Constructor<T>,
    ): Repository<T> {
        const entityName = entityClass.name.toLowerCase();
        if (!Repository.instances.has(entityName)) {
            Repository.instances.set(entityName, new Repository(entityClass));
        }
        return Repository.instances.get(entityName);
    }
    private initialize(): void {
        if (this.isInitialized) {
            return;
        }

        try {
            if (!fs.existsSync(`./${DB_PATH}`)) {
                fs.mkdirSync(`./${DB_PATH}`);
            }
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, '[]');
            }
            this.loadData();
        } catch (error) {
            console.warn(`Data file not found for ${this.name}. Creating a new one.`);
            this.saveData([]);
        }

        this.isInitialized = true;
    }

    /**
     * A private helper to load data from the JSON file into the cache.
     */
    private loadData(): void {
        try {
            const data = fs.readFileSync(this.filePath).toString();
            this.cache = JSON.parse(data);
        } catch (error) {
            console.error(`Failed to load data for ${this.name}:`, error);
            this.cache = [];
        }
    }

    /**
     * A private helper to save the current cache to the JSON file.
     * @param data The data array to save. If not provided, it saves the current cache.
     */
    private saveData(data: T[] = this.cache): void {
        try {
            this.cache = data;
            if (Math.random() < 1) {
                fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.error(`Failed to save data for ${this.name}:`, error);
        }
    }

    /**
     * Filters the cache based on the provided conditions.
     * @param where An object containing key-value pairs to match.
     * @returns A filtered array of entities.
     */
    private filterData(where?: Partial<T>): T[] {
        if (!where || Object.keys(where).length === 0) {
            return this.cache;
        }

        return this.cache.filter(entity => {
            return Object.entries(where).every(([key, value]) => {
                // Handle cases where the value in `where` is null or undefined
                const entityValue = (entity as any)[key];
                if (value === null || value === undefined) {
                    return entityValue === null || entityValue === undefined;
                }
                return entityValue === value;
            });
        });
    }

    /**
     * Counts the number of entities that match the optional `where` clause.
     * @param where An optional object for filtering.
     * @returns The number of matching entities.
     */
    async count(where?: Partial<T>): Promise<number> {
        this.initialize();
        return this.filterData(where).length;
    }

    /**
     * Finds all entities that match the optional `where` clause.
     * @param where An optional object for filtering.
     * @param config An optional object for limiting and offsetting results.
     * @returns An array of matching entities.
     */
    async find(where?: Partial<T>, config?: { limit?: number, offset?: number }): Promise<T[]> {
        this.initialize();
        const filteredData = this.filterData(where);
        const start = config?.offset || 0;
        const end = start + (config?.limit || filteredData.length);
        return filteredData.slice(start, end);
    }

    /**
     * Finds a single entity that matches the `where` clause.
     * @param where An object for filtering.
     * @returns The first matching entity, or undefined.
     */
    findOne(where: Partial<T>): T | null {
        this.initialize();
        const entity = this.filterData(where)[0];
        if (!entity) return null;
        return this.filterData(where)[0];
    }

    /**
     * Inserts a new entity. It generates a unique ID for the entity.
     * @param entity A partial entity object to insert.
     * @returns True if the insertion was successful.
     */
    async insert(entity: Partial<T>): Promise<boolean> {
        this.initialize();
        const id = Math.random().toString(36).substring(4, 10) + Math.random().toString(36).substring(4, 10);
        const create_time = Date.now();
        const newEntity = { ...entity, id, create_time } as T;
        this.cache.push(newEntity);
        this.saveData();
        return true;
    }

    /**
     * Inserts more entities into the cache.
     * @param entities An array of partial entity objects to insert.
     * @returns True if the insertion was successful.
     */
    async insertMany(entities: Partial<T>[]): Promise<boolean> {
        this.initialize();
        const create_time = Date.now();
        const newEntities = entities.map(entity => {
            const id = Date.now().toString(36) + Math.random().toString(36).substring(4, 10);
            return { ...entity, id, create_time } as T;
        });
        this.cache.push(...newEntities as Array<T>);
        this.saveData();
        return true;
    }

    /**
     * Updates entities that match the `where` clause with new data.
     * @param where An object to find the entities to update.
     * @param updateData An object with the new data to apply.
     * @returns True if at least one entity was updated.
     */
    async update(where: Partial<T>, updateData: Partial<T>): Promise<boolean> {
        this.initialize();
        let updatedCount = 0;
        const newCache = this.cache.map(entity => {
            // Check if the entity matches the `where` clause
            if (Object.entries(where).every(([key, value]) => (entity as any)[key] === value)) {
                updatedCount++;
                return { ...entity, ...updateData, update_time: Date.now() };
            }
            return entity;
        });

        if (updatedCount > 0) {
            this.saveData(newCache);
        }
        return updatedCount > 0;
    }

    /**
     * Deletes entities that match the `where` clause.
     * This is a new method added for completeness.
     * @param where An object to find the entities to delete.
     * @returns True if at least one entity was deleted.
     */
    delete(where: Partial<T>): boolean {
        this.initialize();
        const initialCount = this.cache.length;
        const newCache = this.cache.filter(entity => {
            return !Object.entries(where).every(([key, value]) => (entity as any)[key] === value);
        });
        const deletedCount = initialCount - newCache.length;
        if (deletedCount > 0) {
            this.saveData(newCache);
        }
        return deletedCount > 0;
    }
}

export default Repository;
