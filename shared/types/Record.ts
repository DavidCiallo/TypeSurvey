import { BaseEntity } from "./Base";

export class RecordEntity extends BaseEntity {
    item_id: string;
    field_id: string;
    field_value: number | string | boolean;
}
