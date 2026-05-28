import { BaseEntity } from "../../lib/default/base.entity";

export interface RecordEntity extends BaseEntity {
    item_id: string;
    field_id: string;
    field_value: number | string | boolean;
}
