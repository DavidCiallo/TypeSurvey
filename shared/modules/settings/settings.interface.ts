import { BaseRequest, BaseResponse } from "../../lib/default/decorator";

export interface SettingsEntry {
    key: string;
    value: string;
}

export class SettingsSaveRequest implements BaseRequest {
    public auth?: string;
    public entries: SettingsEntry[];

    constructor(origin: Partial<SettingsSaveRequest>) {
        origin.auth && (this.auth = origin.auth);
        this.entries = origin.entries || [];
    }
    static self(unsafe: SettingsSaveRequest) {
        return new SettingsSaveRequest(unsafe);
    }
}

export class SettingsSaveResponse implements BaseResponse<null> {
    public success: boolean;
    public message: string;
    public data?: Record<string, any>;

    constructor(origin: SettingsSaveResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class SettingsListRequest implements BaseRequest {
    public auth?: string;

    constructor(origin: Partial<SettingsListRequest>) {
        origin.auth && (this.auth = origin.auth);
    }
    static self(unsafe: SettingsListRequest) {
        return new SettingsListRequest(unsafe);
    }
}

export class SettingsListResponse implements BaseResponse<null> {
    public success: boolean;
    public message: string;
    public data?: Record<string, any>;

    constructor(origin: SettingsListResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

// Export/Import types

export interface ExportData {
    version: number;
    exported_at: number;
    data: {
        accounts?: any[];
        fields?: any[];
        radios?: any[];
        records?: any[];
        settings?: any[];
    };
}

export class AppExportRequest implements BaseRequest {
    public auth?: string;

    constructor(origin: Partial<AppExportRequest>) {
        origin.auth && (this.auth = origin.auth);
    }
    static self(unsafe: AppExportRequest) {
        return new AppExportRequest(unsafe);
    }
}

export class AppExportResponse implements BaseResponse<null> {
    public success: boolean;
    public message: string;
    public data?: Record<string, any>;

    constructor(origin: AppExportResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class AppImportRequest implements BaseRequest {
    public auth?: string;
    public data: ExportData;

    constructor(origin: Partial<AppImportRequest>) {
        origin.auth && (this.auth = origin.auth);
        this.data = origin.data || { version: 1, exported_at: 0, data: {} };
    }
    static self(unsafe: AppImportRequest) {
        return new AppImportRequest(unsafe);
    }
}

export class AppImportResponse implements BaseResponse<null> {
    public success: boolean;
    public message: string;
    public data?: Record<string, any>;

    constructor(origin: AppImportResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
