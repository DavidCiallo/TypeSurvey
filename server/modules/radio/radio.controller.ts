import {
    RadioCreateRequest, RadioUpdateRequest, RadioDeleteRequest,
} from "../../../shared/modules/radio/radio.interface";
import { radioRoutes } from "../../../shared/modules/radio/radio.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { createRadio, updateRadio } from "./radio.service";

async function create(request: RadioCreateRequest) {
    const { field_id, radio_name, auth } = request;
    if (!field_id || !radio_name || !auth) throw "参数错误";
    const user = getIdentifyByVerify(auth);
    if (!user) throw "Unauthorized";
    const result = await createRadio({ field_id, radio_name, useful: false });
    if (!result) throw "创建选项失败，可能存在同名项";
    return {};
}

async function update(request: RadioUpdateRequest) {
    const { radio_id, radio_name, useful, auth } = request;
    if (!radio_id || !auth) throw "参数错误";
    const user = getIdentifyByVerify(auth);
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

async function del(request: RadioDeleteRequest) {
    const { auth } = request;
    if (!auth) throw "参数错误";
    const user = getIdentifyByVerify(auth);
    if (!user) throw "Unauthorized";
    return {};
}

export const radioController = {
    routes: radioRoutes,
    handlers: { create, update, del },
};
