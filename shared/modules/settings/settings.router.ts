import {
    SettingsListRequest, SettingsListResponse,
    SettingsSaveRequest, SettingsSaveResponse,
    AppExportRequest, AppExportResponse,
    AppImportRequest, AppImportResponse,
} from "./settings.interface";

export const settingsRoutes = {
    base: "/api",
    prefix: "/settings",
    list: { path: "/list", request: {} as SettingsListRequest, response: {} as SettingsListResponse },
    save: { path: "/save", request: {} as SettingsSaveRequest, response: {} as SettingsSaveResponse },
} as const;

export const appRoutes = {
    base: "/api",
    prefix: "/app",
    exportData: { path: "/export", request: {} as AppExportRequest, response: {} as AppExportResponse },
    importData: { path: "/import", request: {} as AppImportRequest, response: {} as AppImportResponse },
} as const;
