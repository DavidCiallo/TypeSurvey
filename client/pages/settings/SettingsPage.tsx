import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, Input } from "@heroui/react";
import { Locale } from "../../methods/locale";
import { SettingsRouter, AppRouter } from "../../api/instance";
import { toast } from "../../methods/notify";

interface SettingsEntry {
    key: string;
    value: string;
}

export default function SettingsPage() {
    const locale = Locale("SettingsPage") as any;
    const [entries, setEntries] = useState<SettingsEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    async function fetchSettings() {
        setLoading(true);
        const { success, data } = await SettingsRouter.list({});
        if (success && data) {
            setEntries(data.entries || []);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchSettings();
    }, []);

    async function handleSave() {
        setSaving(true);
        const { success } = await SettingsRouter.save({ entries });
        if (success) {
            toast({ title: locale.ToastSaveSuccess, color: "success" });
        } else {
            toast({ title: locale.ToastSaveFailed, color: "danger" });
        }
        setSaving(false);
    }

    const updateEntry = (key: string, value: string) => {
        setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, value } : e)));
    };

    async function handleExport() {
        setExporting(true);
        const { success, data } = await AppRouter.exportData({});
        if (success && data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `typeform-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: locale.ToastExportSuccess, color: "success" });
        } else {
            toast({ title: locale.ToastExportFailed, color: "danger" });
        }
        setExporting(false);
    }

    async function handleImport() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImporting(true);
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                if (!json.version || !json.data) throw "Invalid format";
                const { success, data } = await AppRouter.importData({ data: json });
                if (success && data) {
                    const counts = Object.entries(data.imported || {})
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ");
                    toast({ title: `${locale.ToastImportSuccess} (${counts})`, color: "success" });
                    fetchSettings();
                } else {
                    toast({ title: locale.ToastImportFailed, color: "danger" });
                }
            } catch {
                toast({ title: locale.ToastInvalidFormat, color: "danger" });
            } finally {
                setImporting(false);
            }
        };
        input.click();
    }

    const fieldLabel = (key: string) => locale.FieldLabel?.[key] || key;

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
                </div>
                {loading ? (
                    <div className="text-center text-gray-400 py-8">Loading...</div>
                ) : (
                    <>
                        <Card>
                            <CardBody className="flex flex-col gap-4">
                                {entries.map((e) => (
                                    <div key={e.key} className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-600">
                                            {fieldLabel(e.key)}
                                        </label>
                                        <Input
                                            size="sm"
                                            variant="bordered"
                                            value={e.value}
                                            onValueChange={(val) => updateEntry(e.key, val)}
                                        />
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                        <div className="flex items-center gap-4 mt-4">
                            <Button size="sm" color="primary" isLoading={saving} onPress={handleSave}>
                                {locale.SaveSettings}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
