import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Form, Pagination } from "@heroui/react";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { RecordRouter } from "../../api/instance";
import CheckModal from "./CheckModal";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";
import { renderControl } from "./Control";

const INPUT_TYPES = ["text", "email", "password", "textarea", "number"];

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
    const [submitting, setSubmitting] = useState(false);

    const submitBtn = useRef<HTMLButtonElement>(null);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    function setAuthData(form_name: string, fields: FormFieldImpl[], records: RecordImpl[]) {
        setFormName(form_name);
        setFieldList(fields);
        setTotal(fields.length);
        setRecords([...records]);
        setPass(true);
        if (form_name) document.title = form_name;
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

    const doSubmit = useCallback(async (field_id: string, field_value: number | string | boolean) => {
        const item_id = localStorage.getItem("item_id");
        if (!item_id) {
            toast({ title: locale.ToastErrorSubmit, color: "danger" });
            return;
        }
        setRecords((prev) => {
            const exist = prev.find((i) => i.field_id === field_id);
            if (exist) {
                return prev.map((r) => r.field_id === field_id ? { ...r, field_value } : r);
            }
            return [...prev, { id: "", item_id, field_id, field_value, create_time: 0, update_time: 0 }];
        });

        const { success } = await RecordRouter.submit({ item_id, field_id, field_value });
        if (!success) {
            toast({ title: locale.ToastErrorSubmit, color: "danger" });
        }
    }, [locale]);

    function submitRecord(field_id: string, field_value: number | string | boolean, field_type?: string) {
        if (!field_id) return;

        if (field_type && INPUT_TYPES.includes(field_type)) {
            if (timers.current[field_id]) clearTimeout(timers.current[field_id]);
            timers.current[field_id] = setTimeout(() => {
                doSubmit(field_id, field_value);
            }, 2000);
        } else {
            doSubmit(field_id, field_value);
        }
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

    useEffect(() => {
        if (formName) document.title = formName;
    }, [formName]);

    return (
        <div className="w-3/4 md:w-1/3 mx-auto">
            <Form
                onInvalid={() => {
                    setPageKey(Math.random());
                }}
                onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    try {
                        await new Promise((r) => setTimeout(r, 300));
                        setPage(Number(prePage.current));
                        toast({ title: locale.ButtonSubmit, color: "success" });
                    } finally {
                        setSubmitting(false);
                    }
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
                                        {renderControl(records, field, (fid, val) => submitRecord(fid, val, field.field_type))}
                                    </div>
                                );
                            })}
                    </div>
                </div>
                <Button ref={submitBtn} hidden type="submit" />
            </Form>
            {total > 0 && (
                <div className="flex flex-col justify-center items-center w-full mt-2 py-4 gap-2">
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
                    <Button
                        color="primary"
                        className="px-8 py-1 my-2"
                        isLoading={submitting}
                        onPress={() => {
                            submitBtn.current?.click();
                        }}
                    >
                        {page >= Math.ceil(total / pageSize) ? locale.ButtonSubmit : locale.ButtonNext}
                    </Button>
                </div>
            )}
            {!pass && <CheckModal value={code} change={changeCode} />}
        </div>
    );
};

export default Component;
