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
import { FieldRouter, RecordRouter } from "../../api/instance";
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
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col px-[5vw] pt-6">
                <div className="flex flex-row justify-between items-center w-full py-2 gap-2">
                    <div className="flex flex-row flex-1 min-w-0 gap-1">
                        <Select
                            aria-label="select"
                            className="min-w-[120px] max-w-[200px]"
                            variant="bordered"
                            size="sm"
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
                            className="min-w-[120px] flex-1"
                            variant="bordered"
                            size="sm"
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

                    <div className="flex-shrink-0">
                        <Button
                            color="default"
                            variant="bordered"
                            size="sm"
                            onClick={() => loadUserPage(userpage)}
                        >
                            {locale.ReloadButton}
                        </Button>
                    </div>
                </div>
                <div className="mt-2 flex flex-col lg:flex-row justify-between items-start gap-4">
                    <Card className="w-full lg:w-1/3 h-auto lg:h-[70vh] overflow-auto">
                        <Table
                            isStriped
                            aria-label="table"
                            removeWrapper
                            bottomContent={
                                <div className="flex items-center py-1">
                                    <Pagination
                                        className="mx-auto"
                                        size="sm"
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
                                    const raw = new Date(i.data[0]?.update_time || i.data[0]?.create_time);
                                    const time = `${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")} ${String(raw.getHours()).padStart(2, "0")}:${String(raw.getMinutes()).padStart(2, "0")}`;
                                    return (
                                        <TableRow>
                                            <TableCell className="min-w-24" align="center">
                                                {record?.field_value}
                                            </TableCell>
                                            <TableCell align="center" className="min-w-24">
                                                {time}
                                            </TableCell>
                                            <TableCell align="center">
                                                <div className="flex flex-row justify-center gap-1 flex-wrap">
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
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>

                    <Card className="w-full lg:w-2/3 h-auto lg:h-[70vh] overflow-auto">
                        <Table isStriped aria-label="table" removeWrapper>
                            <TableHeader>
                                <TableColumn align="center">{locale.RecordFieldColumn}</TableColumn>
                                <TableColumn align="center">{locale.RecordValueColumn}</TableColumn>
                                <TableColumn align="center">{locale.RecordActionColumn}</TableColumn>
                            </TableHeader>
                            <TableBody emptyContent={<div>{locale.EmptyRecordSelect}</div>}>
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
                                                <TableCell className="min-w-24" align="center">
                                                    {field_name}
                                                </TableCell>
                                                <TableCell className="min-w-24" align="center">
                                                    {value}
                                                </TableCell>
                                                <TableCell align="center">
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
