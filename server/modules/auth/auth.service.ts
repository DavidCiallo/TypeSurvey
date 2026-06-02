import { AccountEntity } from "../../../shared/modules/auth/auth.entity";
import { aesDecrypt, aesEncrypt, hashGenerate } from "../../methods/crypto";
import Repository from "../../lib/repository";
import { sendEmail, buildVerificationEmail } from "../email/email.service";
import { getSetting } from "../settings/settings.service";

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

function checkAllowedDomain(email: string): string | null {
    const allowedDomains = getSetting("allowed_domains");
    if (!allowedDomains) return null;
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return "Invalid email format";
    const domains = allowedDomains.split(",").map(d => d.trim().toLowerCase());
    if (!domains.includes(domain)) {
        return `Registration is limited to ${domains.join(", ")} email addresses`;
    }
    return null;
}

export async function preRegisterUser(name: string, email: string, password: string): Promise<{ needsVerification?: boolean }> {
    const domainError = checkAllowedDomain(email);
    if (domainError) { throw domainError; }
    const exist = await accountRepository.findIgnoreDelete({ email } as any);
    if (exist) { return {}; }
    const payload = [name, email, password].join("|-|");
    const verificationToken = aesEncrypt(payload);
    const clientUrl = getSetting("client_url") || "";
    const verifyUrl = `${clientUrl}/verify?token=${encodeURIComponent(verificationToken)}`;
    const fromDomain = (getSetting("allowed_from_domains") || getSetting("allowed_domains")).split(",")[0]?.trim();
    const from = fromDomain ? `noreply@${fromDomain}` : "noreply@ehex.cc";
    const emailSent = await sendEmail({
        from,
        to: email,
        ...buildVerificationEmail(verifyUrl),
    });
    if (!emailSent) {
        console.error("Failed to send verification email to:", email);
        return {};
    }
    return { needsVerification: true };
}

export async function completeRegistration(token: string): Promise<{ account?: AccountEntity; token?: string } | null> {
    const decrypted = aesDecrypt(token);
    if (!decrypted) return null;
    const parts = decrypted.split("|-|");
    if (parts.length < 3) return null;
    const [name, email, plainPassword] = parts;
    const exist = await accountRepository.findIgnoreDelete({ email } as any);
    if (exist) return null;
    const password = hashGenerate(plainPassword);
    const account = await accountRepository.insert({ name, email, password, is_admin: 0, api_key: "", balance: 0, last_daily_time: null } as any);
    if (!account) return null;
    return { account, token: genTokenForIdentify(email) };
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
