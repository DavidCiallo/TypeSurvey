import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    Pagination,
    Select,
    SelectItem,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
import { FormFieldListResponse } from "../../../shared/router/FieldRouter";
import { FormFieldRouter, RecordRouter } from "../../api/instance";
import { toast } from "../../methods/notify";
import { RecordAllResponse } from "../../../shared/router/RecordRouter";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";

const Component = () => {
    const locale = Locale("RecordPage");

    const [recordList, setRecordList] = useState<Array<{ item_id: string; data: RecordImpl[] }>>([]);
    const [fieldList, setFieldList] = useState<Array<FormFieldImpl>>([]);
    const [fieldChoose, setFieldChoose] = useState<FormFieldImpl | null>(null);
    const [itemChoose, setItemChoose] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(1);

    async function loadPage(page: number) {
        setPage(page);
        setItemChoose(null);
        const form_name = localStorage.getItem("formname") || "";
        RecordRouter.all({ form_name, page }, ({ data }: RecordAllResponse) => {
            if (!data) {
                return;
            }
            setTotal(Math.ceil(data.total / 10) || 1);
            setRecordList(data.records);
        });
        FormFieldRouter.list({ form_name, page: 1 }, ({ success, data, message }: FormFieldListResponse) => {
            if (!success || !data) {
                toast({ title: message, color: "danger" });
                return;
            }
            const { list } = data;
            setFieldList(list);
            if (!fieldChoose || !list.some((f) => f.id === fieldChoose.id)) {
                setFieldChoose(list[0] || null);
            }
        });
    }

    useEffect(() => {
        loadPage(page);
    }, []);

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6">
                <div className="flex flex-row justify-between items-center w-full py-2">
                    <Select
                        aria-label="select"
                        className="w-36"
                        variant="bordered"
                        selectedKeys={[fieldChoose?.id || ""]}
                        onSelectionChange={(key) => setFieldChoose(fieldList.find((f) => f.id === key.currentKey)!)}
                    >
                        {fieldList.map((f) => {
                            return <SelectItem key={f.id}>{f.field_name}</SelectItem>;
                        })}
                    </Select>
                    <Button
                        color="default"
                        variant="bordered"
                        className="text-black-500"
                        onClick={() => loadPage(page)}
                    >
                        {locale.ReloadButton}
                    </Button>
                </div>
                <div className="mt-2 flex flex-row justify-between items-start gap-4">
                    <Card className="min-w-[450px] w-1/3 h-[70vh]">
                        <Table
                            aria-label="table"
                            bottomContent={
                                <div className="flex items-center">
                                    <Pagination className="mx-auto" initialPage={1} total={total} onChange={loadPage} />
                                </div>
                            }
                        >
                            <TableHeader>
                                <TableColumn align="center">{locale.ListFieldValueColumn}</TableColumn>
                                <TableColumn align="center">{locale.ListUpdateTimeColumn}</TableColumn>
                                <TableColumn align="center">{locale.ListActionColumn}</TableColumn>
                            </TableHeader>
                            <TableBody className="h-full">
                                {recordList.map((i) => {
                                    const index = i.data.findIndex((r) => r.field_id === fieldChoose?.id);
                                    const record = i.data[index] || null;
                                    const time = new Date(i.data[0]?.update_time || i.data[0]?.create_time);
                                    return (
                                        <TableRow>
                                            <TableCell className="min-w-32" align="center">
                                                {record?.field_value}
                                            </TableCell>
                                            <TableCell align="center" className="min-w-28 max-w-28">
                                                {time.toLocaleString().slice(5, 16)}
                                            </TableCell>
                                            <TableCell align="center" className="flex flex-row justify-center gap-2">
                                                <Button
                                                    variant="bordered"
                                                    size="sm"
                                                    className="mx-4"
                                                    onClick={() => setItemChoose(i.item_id)}
                                                    color={i.item_id === itemChoose ? "primary" : "default"}
                                                >
                                                    {locale.ListViewRecordButton}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>

                    <Card className="w-2/3 h-[70vh]">
                        <Table aria-label="table" className="h-full">
                            <TableHeader>
                                <TableColumn align="center">{locale.RecordFieldColumn}</TableColumn>
                                <TableColumn align="center">{locale.RecordValueColumn}</TableColumn>
                            </TableHeader>
                            <TableBody className="h-full" emptyContent={<div>{locale.EmptyRecordSelect}</div>}>
                                {fieldList
                                    .filter(() => itemChoose)
                                    .map(({ id: field_id, field_name, radios }) => {
                                        const record = recordList
                                            ?.find((i) => i.item_id === itemChoose)
                                            ?.data.find((r) => r.field_id == field_id);
                                        return (
                                            <TableRow>
                                                <TableCell className="min-w-32" align="center">
                                                    {field_name}
                                                </TableCell>
                                                <TableCell className="min-w-32" align="center">
                                                    {radios?.length
                                                        ? radios.find((r) => r.id === record?.field_value)?.radio_name
                                                        : record?.field_value}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Component;
