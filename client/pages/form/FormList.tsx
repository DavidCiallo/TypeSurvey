import { FileText } from "lucide-react";

import { Card, CardContent } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/client/components/ui/table";
import { Locale } from "../../methods/locale";
import { useNavigate } from "react-router-dom";
import { EmptyComp } from "../../components/empty/Empty";

interface props {
    formList: Array<{ form_name: string; records_num: number; last_submit: number }>;
    openFormEditor: (form_name: string) => void;
    openRecordEditor: (form_name: string) => void;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${M}/${D} ${h}:${m}`;
}

const FormList = ({ formList, openFormEditor, openRecordEditor }: props) => {
    const locale = Locale("FormPage");
    const navigate = useNavigate();

    function viewRecords(formname: string) {
        localStorage.setItem("formname", formname);
        navigate("/record");
    }

    return (
        <Card>
            <CardContent className="p-0">
                {formList.length === 0 ? (
                    <EmptyComp height="min-h-[30vh]" opacity="opacity-50" />
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">{locale.TableHeaderName}</TableHead>
                                        <TableHead>{locale.TableHeaderRecords}</TableHead>
                                        <TableHead>{locale.TableHeaderLastSubmit}</TableHead>
                                        <TableHead className="text-center">{locale.TableHeaderActions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formList.map(({ form_name, records_num, last_submit }) => (
                                        <TableRow key={form_name}>
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                                                        <FileText className="size-4" />
                                                    </div>
                                                    <span className="font-medium">{form_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{records_num}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {last_submit ? formatTime(last_submit) : locale.EmptyNumLabel}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => viewRecords(form_name)}>
                                                        {locale.ViewRecordsButton}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openFormEditor(form_name)}>
                                                        {locale.RenameButton}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openRecordEditor(form_name)}>
                                                        {locale.CreateRecordButton}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile list */}
                        <ul className="divide-y md:hidden">
                            {formList.map(({ form_name, records_num, last_submit }) => (
                                <li key={form_name} className="flex items-center gap-3 px-4 py-3">
                                    <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                                        <FileText className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <p className="truncate text-sm font-medium">{form_name}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {locale.RecordNumLabel} {records_num}
                                            {last_submit ? ` · ${formatTime(last_submit)}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => viewRecords(form_name)}>
                                            {locale.ViewRecordsButton}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openRecordEditor(form_name)}>
                                            {locale.CreateRecordButton}
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default FormList;
