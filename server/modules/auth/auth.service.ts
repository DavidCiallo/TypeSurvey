import { AccountEntity } from "../../../shared/modules/auth/auth.entity";
import { aesDecrypt, aesEncrypt, hashGenerate } from "../../methods/crypto";
import Repository from "../../lib/repository";

const accountRepository: Repository<AccountEntity> = Repository.instance<AccountEntity>("account");
const ALL_MENUS = ["form", "field", "record"];

export async function loginUser(email: string, password: string): Promise<{ token?: string; is_admin?: number; roles?: { name: string; type: string }[] }> {
    password = hashGenerate(password);
    const emailItem = await accountRepository.findOne({ email, password } as any);
    if (emailItem) {
        const roles = emailItem.is_admin
            ? ALL_MENUS.map(name => ({ name, type: "menu" }))
            : [];
        return { token: genTokenForIdentify(email), is_admin: emailItem.is_admin, roles };
    } else {
        return {};
    }
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean }> {
    const emailItem = await accountRepository.findOne({ email } as any);
    if (emailItem) {
        return { success: false };
    }
    password = hashGenerate(password);
    accountRepository.insert({ name, email, password, is_admin: 0, api_key: "", balance: 0, last_daily_time: null } as any);
    return { success: true };
}

export async function getAccountByEmail(email: string): Promise<AccountEntity | null> {
    return await accountRepository.findOne({ email } as any);
}

export function genTokenForIdentify(identity: string, expried: number = 1000 * 60 * 60 * 24 * 3): string {
    expried = Date.now() + expried;
    const token = [identity, expried.toString()].join("|-|");
    return aesEncrypt(token);
}

export function getIdentifyByVerify(token: string): string | null {
    const dt = aesDecrypt(token);
    if (!dt) return null;
    const [identity, expried] = dt.split("|-|");
    if (Date.now() > Number(expried)) return null;
    return identity;
}

export async function requireAdmin(auth?: string): Promise<void> {
    if (!auth) throw "Authorization failed";
    const email = getIdentifyByVerify(auth);
    if (!email) throw "Authorization failed";
    const account = await getAccountByEmail(email);
    if (!account || !account.is_admin) throw "Permission denied";
}
