import { hashGenerate } from "../methods/crypto";
import Repository from "../lib/repository";
import { AccountEntity } from "../../shared/modules/auth/auth.entity";
import { config } from "dotenv";
config();

const accountRepository: Repository<AccountEntity> = Repository.instance<AccountEntity>("account");

export async function initialize() {
    if (process.env.ADMIN_NAME && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
        const exist = await accountRepository.findOne({ email: ADMIN_EMAIL } as any);
        if (exist && !exist.delete_time) return;
        accountRepository.insert({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: hashGenerate(ADMIN_PASSWORD),
            is_admin: 1,
            api_key: "",
            balance: 0,
            last_daily_time: null,
        } as any);
    }
}
