import { useEffect, useState } from "react";
import { Input, Pagination, Select, SelectItem } from "@heroui/react";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { RecordRouter } from "../../api/instance";
import { RecordGetResponse } from "../../../shared/router/RecordRouter";
import CheckModal from "./CheckModal";
import { toast } from "../../methods/notify";
import { useNavigate } from "react-router-dom";

const Component = () => {
    const navigate = useNavigate();
    const reqpath = new URLSearchParams(window.location.search);
    let id = reqpath.get("t");

    const [formName, setFormName] = useState<string>("");
    const [fieldList, setFieldList] = useState<FormFieldImpl[]>([]);
    const [records, setRecords] = useState<RecordImpl[]>([]);

    const [pass, setPass] = useState(true);
    const [code, setCode] = useState(localStorage.getItem("code") || "");

    function changeCode(code: string) {
        if (code.length > 4) return;
        setCode(code);
        if (code.length === 4) {
            loadRecord(code);
        }
    }

    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState(1);

    function setAuthData(form_name: string, fields: FormFieldImpl[], records: RecordImpl[]) {
        setFormName(form_name);
        setFieldList(fields);
        setTotal(fields.length);
        setRecords(records);
        setPass(true);
    }

    async function loadRecord(code: string) {
        if (!id) return toast({ title: "非法参数", color: "danger" });
        await RecordRouter.get(
            { id, code },
            async ({ form_name, fields, records, item_id, code, check }: RecordGetResponse) => {
                if (!check) {
                    toast({ title: "需要正确的验证码" });
                    setCode("");
                    setPass(false);
                    return;
                }
                setAuthData(form_name, fields, records);
                localStorage.setItem("item_id", item_id);
                localStorage.setItem("code", code);
            },
        );
    }

    async function submitRecord(field_id: string, field_value: string) {
        const item_id = localStorage.getItem("item_id");
        if (!item_id) return toast({ title: "错误提交", color: "danger" });
        await RecordRouter.submit({ item_id, field_id, field_value });
        navigate("/fill?t=" + item_id);
    }

    useEffect(() => {
        loadRecord(code);
    }, []);

    const pagination = (
        <Pagination
            initialPage={1}
            total={Math.ceil(total / 10)}
            onChange={(page: number) => {
                setPage(page);
            }}
        />
    );

    function renderControl(field: FormFieldImpl) {
        switch (field.field_type) {
            case "text": {
                return (
                    <Input
                        label={field.field_name}
                        type="text"
                        variant="bordered"
                        labelPlacement="outside"
                        placeholder={field.placeholder || " "}
                        defaultValue={records.find((r) => r.field_id === field.id)?.field_value}
                        onValueChange={(text) => submitRecord(field.id, text)}
                        className="w-full"
                    />
                );
            }
            case "email": {
                return (
                    <Input
                        label={field.field_name}
                        type="email"
                        variant="bordered"
                        labelPlacement="outside"
                        placeholder={field.placeholder || "mail@example.com"}
                        className="w-full"
                    />
                );
            }
            case "select": {
                return (
                    <Select
                        label={field.field_name}
                        variant="bordered"
                        labelPlacement="outside"
                        className="w-full"
                        placeholder={field.placeholder || "请选择"}
                    >
                        {(field.radios || []).map((radio, index) => (
                            <SelectItem key={index}>{radio.radio_name}</SelectItem>
                        ))}
                    </Select>
                );
            }
        }
    }
    return (
        <div className="w-3/4 md:w-1/3 mx-auto">
            <div className="w-full flex flex-col px-2 py-2">
                <div className="text-lg mx-auto font-bold py-4">{formName}</div>
                <div className="flex flex-col">
                    {fieldList.map((field, index) => {
                        return (
                            <div className="w-full flex flex-row flex-wrap pt-2" key={index}>
                                {renderControl(field)}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
                <div className="flex flex-row justify-between items-center w-full py-2">
                    <div className="flex flex-row w-full">{!!total && pagination}</div>
                    <div className="flex flex-row"></div>
                </div>
            </div>
            {!pass && <CheckModal value={code} change={changeCode} />}
        </div>
    );
};

export default Component;
