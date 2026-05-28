import { Header } from "../../components/header/Header";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Input } from "@heroui/react";
import { Locale } from "../../methods/locale";
import { SettingsRouter, AppRouter } from "../../api/instance";
import { toast } from "../../methods/notify";

const Component = () => {
    const locale = Locale("SettingsPage");

    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function loadSettings() {
        const { success, data } = await SettingsRouter.list({});
        if (success && data) {
            setProjectName(data["项目名称"] || "");
        }
    }

    useEffect(() => {
        loadSettings();
    }, []);

    async function handleSave() {
        setLoading(true);
        try {
            const { success } = await SettingsRouter.save({ entries: [{ key: "项目名称", value: projectName }] });
            if (success) {
                toast({ title: locale.ToastSaveSuccess, color: "success" });
            } else {
                throw "";
            }
        } catch {
            toast({ title: locale.ToastSaveFailed, color: "danger" });
        } finally {
            setLoading(false);
        }
    }

    async function handleExport() {
        setExporting(true);
        try {
            const { success, data } = await AppRouter.exportData({});
            if (success && data) {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `typeform-export-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: locale.ToastExportSuccess, color: "success" });
            } else {
                throw "";
            }
        } catch {
            toast({ title: locale.ToastExportFailed, color: "danger" });
        } finally {
            setExporting(false);
        }
    }

    async function handleImport() {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            if (!json.version || !json.data) {
                throw "Invalid format";
            }

            const { success, data } = await AppRouter.importData({ data: json });
            if (success && data) {
                toast({ title: locale.ToastImportSuccess + " " + JSON.stringify(data.imported), color: "success" });
                loadSettings();
                fileInputRef.current!.value = "";
            } else {
                throw "";
            }
        } catch {
            toast({ title: locale.ToastImportFailed, color: "danger" });
        } finally {
            setImporting(false);
        }
    }

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col px-[5vw] pt-6">
                <div className="w-full flex flex-row justify-end items-center mb-4 gap-2">
                    <Button size="sm" color="primary" variant="bordered" onPress={handleExport} isLoading={exporting}>
                        {locale.ExportData}
                    </Button>
                    <Button size="sm" color="warning" variant="bordered" onPress={handleImport} isLoading={importing}>
                        {locale.ImportData}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                    />
                </div>

                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">{locale.BasicSettings}</h2>
                    <div className="flex flex-row items-center gap-4 mb-4">
                        <span className="text-sm min-w-[80px]">{locale.ProjectName}</span>
                        <Input
                            className="max-w-[400px]"
                            variant="bordered"
                            size="sm"
                            value={projectName}
                            onValueChange={setProjectName}
                            placeholder={locale.ProjectNamePlaceholder}
                        />
                    </div>
                    <div>
                        <Button color="primary" size="sm" isLoading={loading} onClick={handleSave}>
                            {locale.SaveSettings}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Component;
