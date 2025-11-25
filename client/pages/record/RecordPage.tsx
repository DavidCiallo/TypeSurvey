import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import {
    Button,
    Card,
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
import { FormFieldRouter, RecordRouter } from "../../api/instance";
import { toast } from "../../methods/notify";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";

const Component = () => {
    const locale = Locale("RecordPage");

    const [recordList, setRecordList] = useState<Array<{ item_id: string; data: RecordImpl[] }>>([]);
    const [fieldList, setFieldList] = useState<Array<FormFieldImpl>>([]);
    const [fieldChoose, setFieldChoose] = useState<FormFieldImpl | null>(null);
    const [itemChoose, setItemChoose] = useState<string | null>(null);

    const [userpage, setPage] = useState(1);
    const [usertotal, setTotal] = useState(1);

    const [fieldpage, setFieldPage] = useState(1);
    const [fieldtotal, setFieldTotal] = useState(1);

    async function loadUserPage(page: number) {
        setPage(page);
        setItemChoose(null);
        const form_name = localStorage.getItem("formname") || "";
        const { data } = await RecordRouter.all({ form_name, page });
        if (!data) {
            return;
        }
        setTotal(Math.ceil(data.total / 10) || 1);
        setRecordList(data.records);
    }
    async function loadFieldPage(page: number) {
        setFieldPage(page);
        const form_name = localStorage.getItem("formname") || "";

        const { success, data, message } = await FormFieldRouter.list({ form_name, page });
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
            setFieldChoose(list[0] || null);
        }
    }
    useEffect(() => {
        loadUserPage(userpage);
        loadFieldPage(fieldpage);
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
                        onClick={() => loadUserPage(userpage)}
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
                                    <Pagination
                                        className="mx-auto"
                                        initialPage={1}
                                        total={usertotal}
                                        onChange={loadUserPage}
                                    />
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
                        <Table
                            aria-label="table"
                            className="h-full"
                            bottomContent={
                                <div className="flex items-center">
                                    <Pagination
                                        className="mx-auto"
                                        initialPage={1}
                                        total={fieldtotal}
                                        onChange={loadFieldPage}
                                    />
                                </div>
                            }
                        >
                            <TableHeader>
                                <TableColumn align="center">{locale.RecordFieldColumn}</TableColumn>
                                <TableColumn align="center">{locale.RecordValueColumn}</TableColumn>
                            </TableHeader>
                            <TableBody className="h-full" emptyContent={<div>{locale.EmptyRecordSelect}</div>}>
                                {fieldList
                                    .slice((fieldpage - 1) * 10, fieldpage * 10)
                                    .filter(() => itemChoose)
                                    .map(({ id: field_id, field_name, radios }) => {
                                        const record = recordList
                                            ?.find((i) => i.item_id === itemChoose)
                                            ?.data.find((r) => r.field_id == field_id);
                                        const value =
                                            radios?.find((r) => r.id === record?.field_value)?.radio_name ||
                                            record?.field_value;
                                        console.log(fieldList.filter(() => itemChoose).length, record);
                                        return (
                                            <TableRow>
                                                <TableCell className="min-w-32" align="center">
                                                    {field_name}
                                                </TableCell>
                                                <TableCell className="min-w-32" align="center">
                                                    {value}
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
