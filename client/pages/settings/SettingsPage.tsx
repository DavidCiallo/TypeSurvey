import { useEffect, useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
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
        <div className="mx-auto w-full max-w-3xl space-y-4">
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                    {locale.ExportData}
                </Button>
                <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
                    {locale.ImportData}
                </Button>
            </div>
            {loading ? (
                <div className="text-muted-foreground py-8 text-center">Loading...</div>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{locale.BasicSettings}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {entries.map((e) => (
                                <div key={e.key} className="flex flex-col gap-2">
                                    <Label htmlFor={`field-${e.key}`}>{fieldLabel(e.key)}</Label>
                                    <Input
                                        id={`field-${e.key}`}
                                        value={e.value}
                                        onChange={(e2) => updateEntry(e.key, e2.target.value)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <div className="flex items-center gap-4">
                        <Button onClick={handleSave} disabled={saving}>
                            {locale.SaveSettings}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
