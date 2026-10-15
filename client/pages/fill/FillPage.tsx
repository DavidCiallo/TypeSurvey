import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/client/components/ui/button";
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

    const timers = useRef<{ [field_id: string]: ReturnType<typeof setTimeout> }>({});

    function setAuthData(form_name: string, fields: FormFieldImpl[], records: RecordImpl[]) {
        setFormName(form_name);
        setFieldList(fields);
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
            // The server words the deadline itself; keep its message so the
            // reason shown is the one that actually rejected the request.
            toast({ title: message === "链接已过期" ? locale.LinkExpired : message, color: "danger" });
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

        const { success, message } = await RecordRouter.submit({ item_id, field_id, field_value });
        if (!success) {
            toast({ title: message === "链接已过期" ? locale.LinkExpired : message || locale.ToastErrorSubmit, color: "danger" });
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

    // Every field is on one page now, so the whole form renders at once and
    // the progress line is the only navigation the page needs.
    const enabledFields = useMemo(() => fieldList.filter((i) => !i.disabled), [fieldList]);

    const filledCount = useMemo(
        () => enabledFields.filter((f) => {
            const v = records.find((r) => r.field_id === f.id)?.field_value;
            return v !== undefined && v !== null && String(v) !== "";
        }).length,
        [enabledFields, records]
    );

    const percent = enabledFields.length ? Math.round((filledCount / enabledFields.length) * 100) : 0;

    const isFilled = useCallback(
        (field: FormFieldImpl) => {
            const v = records.find((r) => r.field_id === field.id)?.field_value;
            return v !== undefined && v !== null && String(v) !== "";
        },
        [records]
    );

    // The next unfilled field at or below the top of the viewport, so repeated
    // clicks walk down the form instead of restarting from the top.
    function jumpToNextUnfilled() {
        const anchor = window.scrollY + 8;
        const next = enabledFields.find(
            (f) => !isFilled(f) && (document.getElementById(`field-${f.id}`)?.offsetTop ?? 0) >= anchor
        ) || enabledFields.find((f) => !isFilled(f));
        if (!next) {
            toast({ title: locale.AllFilledToast, color: "success" });
            return;
        }
        document.getElementById(`field-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (!pass) return <CheckModal value={code} change={changeCode} />;
    if (!formName) return null;

    return (
        <div className="mx-auto w-full max-w-2xl px-4 pb-16">
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 -mx-4 border-b px-4 py-4 backdrop-blur">
                <h1 className="text-lg font-bold">{formName}</h1>
                <div className="text-muted-foreground mt-0.5 flex items-center justify-between text-xs">
                    <span>{locale.ProgressLabel.replace("{filled}", String(filledCount)).replace("{total}", String(enabledFields.length))}</span>
                    <span>{percent}%</span>
                </div>
                <div className="bg-secondary mt-2 h-1 w-full overflow-hidden rounded-full">
                    <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            <form
                className="flex flex-col gap-1 pt-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    // Required fields gate nothing server-side; this only walks
                    // the user to the first one they left empty.
                    const missing = enabledFields.find((f) => f.required && !isFilled(f));
                    if (missing) {
                        toast({ title: locale.RequiredMissingToast, color: "danger" });
                        document.getElementById(`field-${missing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        return;
                    }
                    toast({ title: locale.ButtonSubmit, color: "success" });
                }}
            >
                {enabledFields.map((field) => (
                    <div className="pt-3" id={`field-${field.id}`} key={field.id}>
                        {renderControl(records, field, (fid, val) => submitRecord(fid, val, field.field_type))}
                    </div>
                ))}

                <div className="flex justify-end pt-6">
                    <Button className="px-8" type="submit">
                        {locale.ButtonSubmit}
                    </Button>
                </div>
            </form>

            {filledCount >= 10 && (
                <Button
                    className="fixed right-6 bottom-6 z-40 shadow-lg"
                    onClick={jumpToNextUnfilled}
                >
                    {locale.JumpNextButton}
                </Button>
            )}
        </div>
    );
};

export default Component;
