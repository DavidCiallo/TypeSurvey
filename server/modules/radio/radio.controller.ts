import {
    RadioCreateRequest, RadioUpdateRequest,
} from "../../../shared/modules/radio/radio.interface";
import { radioRoutes } from "../../../shared/modules/radio/radio.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { createRadio, updateRadio } from "./radio.service";

async function create(request: RadioCreateRequest) {
    request = RadioCreateRequest.self(request);
    const { field_id, radio_name } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    const result = await createRadio({ field_id, radio_name, useful: true });
    if (!result) throw "创建选项失败，可能存在同名项";
    return {};
}

async function update(request: RadioUpdateRequest) {
    request = RadioUpdateRequest.self(request);
    const { radio_id, radio_name, useful } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    if (radio_name) {
        const success = await updateRadio(radio_id, "radio_name", radio_name);
        if (!success) throw "更新失败";
    }
    if (useful === true || useful === false) {
        const success = await updateRadio(radio_id, "useful", useful);
        if (!success) throw "更新失败";
    }
    return {};
}

export const radioController = {
    routes: radioRoutes,
    handlers: { create, update },
};
