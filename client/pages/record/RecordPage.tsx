import { useEffect, useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Pagination } from "@/client/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/client/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/client/components/ui/dialog";
import { Inbox, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/client/components/ui/tooltip";
import { FieldRouter, RecordRouter } from "../../api/instance";
import { toast } from "../../methods/notify";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";
import { copytext } from "../../methods/text";

const Component = () => {
    const locale = Locale("RecordPage");

    const baseurl = location.protocol + "//" + location.host + "/fill?t=";

    const [fieldList, setFieldList] = useState<Array<FormFieldImpl>>([]);
    const [fieldChoose, setFieldChoose] = useState<FormFieldImpl | null>(null);

    const [recordList, setRecordList] = useState<Array<{ item_id: string; code: string; data: RecordImpl[] }>>([]);
    const [itemChoose, setItemChoose] = useState<string | null>(null);

    const [userpage, setPage] = useState(1);
    const [usertotal, setTotal] = useState(1);

    const [search, setSearch] = useState("");

    const [_, setFieldTotal] = useState(1);

    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    async function loadUserPage(page: number = 1) {
        setItemChoose(null);
        const form_name = localStorage.getItem("formname") || "";
        const { data } = await RecordRouter.all({ form_name, page, search });
        if (!data) {
            return;
        }
        setTotal(Math.ceil(data.total / 10) || 1);
        setRecordList(data.records);
        setPage(page);
    }
    async function loadFieldPage(page: number = 1) {
        const form_name = localStorage.getItem("formname") || "";

        const { success, data, message } = await FieldRouter.list({ form_name, page });
        if (!success || !data) {
            toast({ title: message, color: "danger" });
            return;
        }
        const { list, total } = data;
        list.forEach((field) => {
            if (fieldList.find((f) => f.id === field.id)) return;
            fieldList.push(field);
        });
        setFieldList([...fieldList]);
        setFieldTotal(Math.ceil(total / 10));
        if (!fieldChoose || !fieldList.some((f) => f.id === fieldChoose.id)) {
            const priorityKeys = ["姓名", "名字", "Name", "FullName", "FirstName"];
            const enabledFields = fieldList.filter((i) => !i.disabled);
            const priorityField = enabledFields.find((f) =>
                priorityKeys.some((k) => f.field_name.toLowerCase().includes(k.toLowerCase()))
            );
            setFieldChoose(priorityField || enabledFields[0] || null);
        }
        if (list.length > 0 && fieldList.length < total) {
            loadFieldPage(page + 1);
        } else {
        }
    }
    useEffect(() => {
        loadUserPage();
        loadFieldPage();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-1 items-center gap-2">
                    <Select
                        value={fieldChoose?.id || ""}
                        onValueChange={(value) => setFieldChoose(fieldList.find((f) => f.id === value)!)}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {fieldList
                                .filter((i) => !i.disabled)
                                .map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.field_name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") loadUserPage();
                            }}
                            onBlur={() => loadUserPage()}
                        />
                    </div>
                </div>
                <div className="shrink-0">
                    <Button variant="outline" size="sm" onClick={() => loadUserPage(userpage)}>
                        {locale.ReloadButton}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row">
                <Card className="h-auto w-full lg:h-[70vh] lg:w-1/3">
                    <CardContent className="h-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">{locale.ListFieldValueColumn}</TableHead>
                                    <TableHead className="text-center">{locale.ListUpdateTimeColumn}</TableHead>
                                    <TableHead className="text-center">{locale.ListActionColumn}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recordList.map((i) => {
                                    const index = i.data.findIndex((r) => r.field_id === fieldChoose?.id);
                                    const record = i.data[index] || null;
                                    const raw = new Date(i.data[0]?.update_time || i.data[0]?.create_time);
                                    const time = `${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")} ${String(raw.getHours()).padStart(2, "0")}:${String(raw.getMinutes()).padStart(2, "0")}`;
                                    return (
                                        <TableRow key={i.item_id}>
                                            <TableCell className="min-w-24 text-center">
                                                {record?.field_value}
                                            </TableCell>
                                            <TableCell className="min-w-24 text-center">
                                                {time}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setItemChoose(i.item_id)}
                                                        className={i.item_id === itemChoose ? "border-primary" : ""}
                                                    >
                                                        {locale.ListViewRecordButton}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            copytext(`${baseurl + i.item_id}#code:${i.code}`);
                                                            toast({ title: locale.ToastCopySuccess, color: "success" });
                                                        }}
                                                    >
                                                        {locale.ListItemLinkButton}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <div className="flex items-center justify-center py-2">
                            <Pagination
                                page={userpage}
                                total={usertotal}
                                onChange={loadUserPage}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-auto w-full lg:h-[70vh] lg:w-2/3">
                    <CardContent className="flex h-full flex-col overflow-auto">
                        <div className="flex-1 overflow-auto">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%] text-center">{locale.RecordFieldColumn}</TableHead>
                                    <TableHead className="w-[55%] text-center">{locale.RecordValueColumn}</TableHead>
                                    <TableHead className="w-[20%] text-center">{locale.RecordActionColumn}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!itemChoose ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-16">
                                            <div className="flex flex-col items-center gap-3">
                                                <Inbox className="text-muted-foreground/40 size-10" strokeWidth={1.2} />
                                                <span className="text-muted-foreground text-sm">{locale.EmptyRecordSelect}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    fieldList.map(({ id: field_id, field_name, radios }) => {
                                        const record = recordList
                                            ?.find((i) => i.item_id === itemChoose)
                                            ?.data.find((r) => r.field_id == field_id);
                                        const value =
                                            radios?.find((r) => r.id === record?.field_value)?.radio_name ||
                                            record?.field_value;
                                        return (
                                            <TableRow key={field_id}>
                                                <TableCell className="text-center">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="block max-w-full truncate">{field_name}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs break-all">
                                                            {field_name}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {value ? (
                                                        String(value).startsWith("/uploads/") ? (
                                                            /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(String(value)) ? (
                                                                <a href={String(value)} target="_blank" rel="noreferrer">
                                                                    <img src={String(value)} alt="file" className="mx-auto h-12 w-12 rounded border object-cover" />
                                                                </a>
                                                            ) : (
                                                                <a href={String(value)} target="_blank" rel="noreferrer" className="text-primary text-sm underline">
                                                                    {String(value).split("/").pop()}
                                                                </a>
                                                            )
                                                        ) : (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="block max-w-full truncate">{value}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-xs break-all">
                                                                    {value}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground/50">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (!value) return;
                                                            copytext(String(value));
                                                            toast({ title: "已复制到剪贴板", color: "success" });
                                                        }}
                                                    >
                                                        复制
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        </div>
                        <div className="flex justify-end pt-3">
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={!itemChoose}
                                onClick={() => setDeleteTarget(itemChoose)}
                            >
                                {locale.DeleteRecordButton}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{locale.DeleteRecordTitle}</DialogTitle>
                        <DialogDescription>{locale.DeleteRecordDesc}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            {Locale("Common").ButtonCancel}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!deleteTarget) return;
                                const { success } = await RecordRouter.del({ item_id: deleteTarget });
                                if (success) {
                                    toast({ title: locale.ToastDeleteSuccess, color: "success" });
                                    if (itemChoose === deleteTarget) setItemChoose(null);
                                    loadUserPage(userpage);
                                } else {
                                    toast({ title: locale.ToastDeleteFailed, color: "danger" });
                                }
                                setDeleteTarget(null);
                            }}
                        >
                            {Locale("Common").ButtonConfirm}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Component;
