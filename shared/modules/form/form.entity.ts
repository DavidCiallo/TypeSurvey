import { BaseEntity } from "../../lib/default/base.entity";
import { FieldType } from "../../impl/field";

export interface FormFieldEntity extends BaseEntity {
    /**
     * Owning team. Always populated by the Go server (the migration backfills
     * existing rows); left optional because the legacy TypeScript server under
     * server/modules predates multi-tenancy and is not the running server.
     */
    team_id?: string;
    form_name: string;
    field_name: string;
    field_type: FieldType;
    comment: string;
    placeholder: string;
    position: number;
    required: boolean;
    disabled: boolean;
}
