import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Pagination } from "@/client/components/ui/pagination";
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
    const [pageSize] = useState(10);
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
        const item_id = localStorage.getItem("item_id") || undefined;
        const { success, data, message } = await RecordRouter.history({ id, code, item_id });
        if (!success || !data) {
            toast({ title: message });
            setCode("");
            setPass(false);
            return;
        }
        const { form_name, fields, records, item_id: newItemId, code: newCode } = data;
        setAuthData(form_name, fields, records);
        localStorage.setItem("item_id", newItemId);
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
        <div className="mx-auto w-full max-w-sm px-4">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    try {
                        await new Promise((r) => setTimeout(r, 300));
                        const isLastPage = page >= Math.ceil(total / pageSize);
                        if (isLastPage) {
                            toast({ title: locale.ButtonSubmit, color: "success" });
                        } else {
                            setPage(Number(prePage.current));
                        }
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                <div className="flex w-full flex-col py-2">
                    <div className="mx-auto py-4 text-lg font-bold">{formName}</div>
                    <div className="flex flex-col">
                        {fieldList
                            .filter((i) => !i.disabled)
                            .slice((page - 1) * pageSize, page * pageSize)
                            .map((field) => {
                                return (
                                    <div className="flex w-full flex-row flex-wrap pt-3" key={field.id}>
                                        {renderControl(records, field, (fid, val) => submitRecord(fid, val, field.field_type))}
                                    </div>
                                );
                            })}
                    </div>
                </div>
                <button ref={submitBtn} type="submit" className="hidden" />
            </form>
            {total > 0 && (
                <div className="flex flex-col items-center gap-2 py-4">
                    <Pagination
                        key={pageKey}
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
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="px-6"
                            disabled={page <= 1}
                            onClick={() => {
                                prePage.current = page - 1;
                                setPage(page - 1);
                            }}
                        >
                            {locale.ButtonPrev || "上一页"}
                        </Button>
                        <Button
                            className="px-6"
                            disabled={submitting}
                            onClick={() => {
                                prePage.current = page + 1;
                                submitBtn.current?.click();
                            }}
                        >
                            {page >= Math.ceil(total / pageSize) ? locale.ButtonSubmit : locale.ButtonNext || "下一页"}
                        </Button>
                    </div>
                </div>
            )}
            {!pass && <CheckModal value={code} change={changeCode} />}
        </div>
    );
};

export default Component;
