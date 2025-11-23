import {
    FormFieldRadioCreateRequest,
    FormFieldRadioCreateResponse,
    FormFieldRadioDeleteRequest,
    FormFieldRadioDeleteResponse,
    FormFieldRadioRouterInstance,
    FormFieldRadioUpdateRequest,
    FormFieldRadioUpdateResponse,
} from "../../shared/router/RadioRouter";
import { inject, injectws } from "../lib/inject";
import { getIdentifyByVerify } from "../service/auth.service";
import { createRadio, updateRadio } from "../service/radio.service";

async function create(query: FormFieldRadioCreateRequest): Promise<FormFieldRadioCreateResponse> {
    const { field_id, radio_name, auth } = query;
    if (!field_id || !radio_name || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    const success = await createRadio({ field_id, radio_name, useful: false });
    return { success };
}

async function update(query: FormFieldRadioUpdateRequest): Promise<FormFieldRadioUpdateResponse> {
    const { radio_id, radio_name, useful, auth } = query;
    if (!radio_id || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    if (radio_name) {
        const success = await updateRadio(radio_id, "radio_name", radio_name);
        if (!success) return { success: false };
    }
    if (useful === true || useful === false) {
        const success = await updateRadio(radio_id, "useful", useful);
        if (!success) return { success: false };
    }
    return { success: true };
}

async function del(query: FormFieldRadioDeleteRequest): Promise<FormFieldRadioDeleteResponse> {
    const { auth } = query;
    if (!auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    return { success: true };
}

export const radioController = new FormFieldRadioRouterInstance(inject, { create, update, del });
