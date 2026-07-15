import {
    SettingsListRequest,
    SettingsSaveRequest,
    AppExportRequest,
    AppImportRequest,
} from "../../../shared/modules/settings/settings.interface";
import { settingsRoutes, appRoutes } from "../../../shared/modules/settings/settings.router";
import { requireAdmin } from "../auth/auth.service";
import { getSettings, getAllSettings, saveSettings, getAllData, importAllData } from "./settings.service";

async function list(request: SettingsListRequest) {
    request = SettingsListRequest.self(request);
    await requireAdmin(request.auth);
    const allSettings = getAllSettings();
    const entries = Object.entries(allSettings).map(([key, value]) => ({ key, value: value || "" }));
    return { entries };
}

async function save(request: SettingsSaveRequest) {
    request = SettingsSaveRequest.self(request);
    await requireAdmin(request.auth);
    if (!request.entries || request.entries.length === 0) throw "No entries to save";
    await saveSettings(request.entries);
    return await getSettings();
}

async function exportData(request: AppExportRequest) {
    request = AppExportRequest.self(request);
    await requireAdmin(request.auth);
    const data = await getAllData();
    return {
        version: 1,
        exported_at: Date.now(),
        data,
    };
}

async function importData(request: AppImportRequest) {
    request = AppImportRequest.self(request);
    await requireAdmin(request.auth);
    if (!request.data || !request.data.data) throw "Invalid import data";
    const imported = await importAllData(request.data.data);
    return { imported };
}

export const settingsController = {
    routes: settingsRoutes,
    handlers: { list, save },
};

export const appController = {
    routes: appRoutes,
    handlers: { exportData, importData },
};
