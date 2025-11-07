import { BaseEntity } from "./Base";

export class AccountEntity extends BaseEntity {
    name: string;
    email: string;
    password: string;
}