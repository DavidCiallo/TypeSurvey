import { FormFieldRadioCreateRequest, FormFieldRadioCreateResponse, FormFieldRadioDeleteRequest, FormFieldRadioDeleteResponse, FormFieldRadioRouterInstance, FormFieldRadioUpdateRequest, FormFieldRadioUpdateResponse } from "../../shared/router/RadioRouter";
import { inject, injectws } from "../lib/inject";
import { createRadio, updateRadio } from "../service/field.service";


async function create(query: FormFieldRadioCreateRequest): Promise<FormFieldRadioCreateResponse> {
    const { field_id, radio_name } = query;
    if (!field_id || !radio_name) return { success: false };
    const success = await createRadio({ field_id, radio_name, useful: true })
    return { success };
}

async function update(query: FormFieldRadioUpdateRequest): Promise<FormFieldRadioUpdateResponse> {
    const { radio_id, radio_name, useful } = query;
    if (!radio_id) {
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

    return { success: true };
}


export const radioController = new FormFieldRadioRouterInstance(inject, { create, update, del });