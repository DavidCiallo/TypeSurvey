import { useEffect, useRef, useState } from "react";
import { Button, Form, Pagination } from "@heroui/react";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { RecordRouter } from "../../api/instance";
import CheckModal from "./CheckModal";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";
import { renderControl } from "./Control";

const Component = () => {
    const locale = Locale("FillPage");

    const [formName, setFormName] = useState<string>("");
    const [fieldList, setFieldList] = useState<FormFieldImpl[]>([]);
    const [records, setRecords] = useState<RecordImpl[]>([]);

    const [pass, setPass] = useState<boolean>(true);
    const [code, setCode] = useState<string>("");

    function changeCode(code: string) {
        if (code.length > 4) return;
        setCode(code);
        if (code.length === 4) {
            loadRecord(code);
        }
    }

    const [total, setTotal] = useState<number>(1);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(7);
    const [pageKey, setPageKey] = useState(Math.random());
    const prePage = useRef(1);

    const submitBtn = useRef<HTMLButtonElement>(null);

    function setAuthData(form_name: string, fields: FormFieldImpl[], records: RecordImpl[]) {
        setFormName(form_name);
        setFieldList(fields);
        setTotal(fields.length);
        setRecords(records);
        setPass(true);
    }

    async function loadRecord(code: string) {
        let id = localStorage.getItem("entry_id");
        if (!id) return;
        const { success, data, message } = await RecordRouter.history({ id, code });
        if (!success || !data) {
            toast({ title: message });
            setCode("");
            setPass(false);
            return;
        }
        const { form_name, fields, records, item_id, code: newCode } = data;
        setAuthData(form_name, fields, records);
        localStorage.setItem("item_id", item_id);
        localStorage.setItem("code", newCode);
    }

    const latestSubmit = useRef<{ field_id: string; field_value: number | string | boolean }>({
        field_id: "",
        field_value: "",
    });

    async function submitRecord(field_id: string, field_value: number | string | boolean) {
        const item_id = localStorage.getItem("item_id");
        if (!item_id)
            return toast({
                title: locale.ToastErrorSubmit,
                color: "danger",
            });
        const exist = records.find((i) => i.field_id === field_id);
        if (exist) {
            exist.field_value = field_value;
            setRecords(records);
        } else {
            records.push({ id: "", item_id, field_id, field_value, create_time: 0, update_time: 0 });
            setRecords(records);
        }

        if (field_id !== latestSubmit.current.field_id && latestSubmit.current.field_id) {
            const { success } = await RecordRouter.submit({
                item_id,
                field_id: latestSubmit.current.field_id,
                field_value: latestSubmit.current.field_value,
            });
            if (!success) {
                return toast({
                    title: locale.ToastErrorSubmit,
                    color: "danger",
                });
            }
        }
        latestSubmit.current = { field_id, field_value };
    }

    useEffect(() => {
        const id = new URLSearchParams(window.location?.search)?.get("t");
        if (!id) {
            return toast({
                title: locale.ToastErrorParam,
                color: "danger",
            });
        }
        localStorage.setItem("entry_id", id);
        loadRecord(localStorage.getItem("code") || "");
    }, []);

    return (
        <div className="w-3/4 md:w-1/3 mx-auto">
            <Form
                onInvalid={() => {
                    setPageKey(Math.random());
                }}
                onSubmit={(e) => {
                    e.preventDefault();
                    setPage(Number(prePage.current));
                }}
            >
                <div className="w-full flex flex-col px-2 py-2">
                    <div className="text-lg mx-auto font-bold py-4">{formName}</div>
                    <div className="flex flex-col">
                        {fieldList
                            .filter((i) => !i.disabled)
                            .slice((page - 1) * pageSize, page * pageSize)
                            .map((field) => {
                                return (
                                    <div className="w-full flex flex-row flex-wrap pt-3" key={field.id}>
                                        {renderControl(records, field, submitRecord)}
                                    </div>
                                );
                            })}
                    </div>
                </div>
                <Button ref={submitBtn} hidden type="submit" />
            </Form>
            <div className="flex flex-row justify-center items-center w-full mt-2 py-2">
                {!!total && (
                    <Pagination
                        siblings={0}
                        key={pageKey}
                        showControls
                        size="sm"
                        initialPage={1}
                        page={page}
                        total={Math.ceil(total / pageSize)}
                        onChange={(changePage) => {
                            prePage.current = changePage;
                            if (prePage.current > page) {
                                submitBtn.current?.click();
                            } else {
                                setPage(prePage.current);
                            }
                            submitRecord("", "");
                        }}
                    />
                )}
            </div>
            {!pass && <CheckModal value={code} change={changeCode} />}
        </div>
    );
};

export default Component;
