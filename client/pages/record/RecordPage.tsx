import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import {
    Button,
    Card,
    Input,
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
import { copytext } from "../../methods/text";
import SearchIcon from "../../images/svg/Search";

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
            const usefulField = fieldList.find((i) => !i.disabled);
            setFieldChoose(usefulField || null);
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
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6">
                <div className="flex flex-row justify-between items-center w-full py-2">
                    <div className="w-full flex flex-row">
                        <Select
                            aria-label="select"
                            className="w-1/6"
                            variant="bordered"
                            selectedKeys={[fieldChoose?.id || ""]}
                            onSelectionChange={(key) => setFieldChoose(fieldList.find((f) => f.id === key.currentKey)!)}
                        >
                            {fieldList
                                .filter((i) => !i.disabled)
                                .map((f) => {
                                    return <SelectItem key={f.id}>{f.field_name}</SelectItem>;
                                })}
                        </Select>
                        <Input
                            className="w-1/8 mx-1"
                            variant="bordered"
                            value={search}
                            onValueChange={setSearch}
                            endContent={
                                <Button
                                    size="sm"
                                    isIconOnly
                                    className="p-[5px] ml-[-10px] mr-[-5px]"
                                    variant="light"
                                    onClick={() => loadUserPage()}
                                >
                                    <SearchIcon />
                                </Button>
                            }
                            onBlur={() => loadUserPage()}
                        />
                    </div>

                    <div className="flex flex-row">
                        <Button
                            color="default"
                            variant="bordered"
                            className="text-black-500"
                            onClick={() => loadUserPage(userpage)}
                        >
                            {locale.ReloadButton}
                        </Button>
                    </div>
                </div>
                <div className="mt-2 flex flex-row justify-between items-start gap-4">
                    <Card className="min-w-[450px] w-1/3 h-[70vh]">
                        <Table
                            isStriped
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
                                            <TableCell align="center" className="flex flex-row justify-center gap-1">
                                                <Button
                                                    variant="bordered"
                                                    size="sm"
                                                    onClick={() => setItemChoose(i.item_id)}
                                                    color={i.item_id === itemChoose ? "primary" : "default"}
                                                >
                                                    {locale.ListViewRecordButton}
                                                </Button>
                                                <Button
                                                    variant="bordered"
                                                    size="sm"
                                                    onClick={() => {
                                                        copytext(`${baseurl + i.item_id}#code:${i.code}`);
                                                        toast({ title: locale.ToastCopySuccess, color: "success" });
                                                    }}
                                                    color="danger"
                                                >
                                                    {locale.ListItemLinkButton}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>

                    <Card className="w-2/3 h-[70vh]">
                        <Table isStriped aria-label="table" className="h-full">
                            <TableHeader>
                                <TableColumn align="center">{locale.RecordFieldColumn}</TableColumn>
                                <TableColumn align="center">{locale.RecordValueColumn}</TableColumn>
                                <TableColumn align="center">{locale.RecordActionColumn}</TableColumn>
                            </TableHeader>
                            <TableBody className="h-full" emptyContent={<div>{locale.EmptyRecordSelect}</div>}>
                                {fieldList
                                    .filter(() => itemChoose)
                                    .map(({ id: field_id, field_name, radios }) => {
                                        const record = recordList
                                            ?.find((i) => i.item_id === itemChoose)
                                            ?.data.find((r) => r.field_id == field_id);
                                        const value =
                                            radios?.find((r) => r.id === record?.field_value)?.radio_name ||
                                            record?.field_value;
                                        return (
                                            <TableRow>
                                                <TableCell className="min-w-48 max-w-48" align="center">
                                                    {field_name}
                                                </TableCell>
                                                <TableCell className="min-w-32" align="center">
                                                    {value}
                                                </TableCell>
                                                <TableCell className="min-w-24 max-w-24" align="center">
                                                    <Button
                                                        variant="bordered"
                                                        size="sm"
                                                        onClick={() => value && copytext(String(value))}
                                                    >
                                                        复制
                                                    </Button>
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
