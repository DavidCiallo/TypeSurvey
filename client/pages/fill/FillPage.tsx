import { useEffect, useState } from "react";
import { Checkbox, Input, NumberInput, Pagination, Select, SelectItem, Textarea } from "@heroui/react";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { RecordRouter } from "../../api/instance";
import CheckModal from "./CheckModal";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";

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

    async function submitRecord(field_id: string, field_value: number | string | boolean) {
        const item_id = localStorage.getItem("item_id");
        if (!item_id)
            return toast({
                title: locale.ToastErrorSubmit,
                color: "danger",
            });
        const { success } = await RecordRouter.submit({ item_id, field_id, field_value });
        if (!success) {
            return toast({
                title: locale.ToastErrorSubmit,
                color: "danger",
            });
        }
        const exist = records.find((i) => i.field_id === field_id);
        if (exist) {
            exist.field_value = field_value;
            setRecords(records);
        } else {
            records.push({ id: "", item_id, field_id, field_value, create_time: 0, update_time: 0 });
            setRecords(records);
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

    function renderControl(field: FormFieldImpl) {
        const field_value = records.find((r) => r.field_id === field.id)?.field_value || "";
        let render_value: string; // for origin from input
        let choose_value: string; // for origin from select
        if (field.radios?.find((i) => i.id == field_value)) {
            choose_value = String(field_value);
            render_value = String(field.radios?.find((i) => i.id == field_value)?.radio_name);
        } else {
            choose_value = String(field_value);
            render_value = String(field_value);
        }
        switch (field.field_type) {
            case "text": {
                return (
                    <div className="w-full flex flex-col">
                        <label className="text-sm pb-2">
                            <span>{field.field_name}</span>
                            <span className="text-red-600">{field.required ? "*" : ""}</span>
                        </label>
                        <label className="text-xs pb-2">
                            <span className="text-gray-500">{field.comment}</span>
                        </label>
                        <Input
                            type="text"
                            variant="bordered"
                            labelPlacement="outside"
                            isRequired={field.required}
                            placeholder={field.placeholder || " "}
                            defaultValue={render_value}
                            onBlur={(e) => e?.target?.value && submitRecord(field.id, e.target.value)}
                            className="w-full"
                        />
                    </div>
                );
            }
            case "email": {
                return (
                    <div className="w-full flex flex-col">
                        <label className="text-sm pb-2">
                            <span>{field.field_name}</span>
                            <span className="text-red-600">{field.required ? "*" : ""}</span>
                        </label>
                        <label className="text-xs pb-2">
                            <span className="text-gray-500">{field.comment}</span>
                        </label>
                        <Input
                            type="email"
                            variant="bordered"
                            labelPlacement="outside"
                            isRequired={field.required}
                            placeholder={field.placeholder || "mail@example.com"}
                            defaultValue={render_value}
                            onBlur={(e) => e?.target?.value && submitRecord(field.id, e.target.value)}
                            className="w-full"
                        />
                    </div>
                );
            }
            case "password": {
                return (
                    <div className="w-full flex flex-col">
                        <label className="text-sm pb-2">
                            <span>{field.field_name}</span>
                            <span className="text-red-600">{field.required ? "*" : ""}</span>
                        </label>
                        <label className="text-xs pb-2">
                            <span className="text-gray-500">{field.comment}</span>
                        </label>
                        <Input
                            type="password"
                            variant="bordered"
                            labelPlacement="outside"
                            isRequired={field.required}
                            placeholder={field.placeholder}
                            defaultValue={render_value}
                            onValueChange={(text) => submitRecord(field.id, text)}
                            className="w-full"
                        />
                    </div>
                );
            }
            case "textarea": {
                return (
                    <div className="w-full flex flex-col">
                        <label className="text-sm pb-2">
                            <span>{field.field_name}</span>
                            <span className="text-red-600">{field.required ? "*" : ""}</span>
                        </label>
                        <label className="text-xs pb-2">
                            <span className="text-gray-500">{field.comment}</span>
                        </label>
                        <Textarea
                            classNames={{ label: "text-[rgb(17, 24, 28)]" }}
                            variant="bordered"
                            labelPlacement="outside"
                            placeholder={field.placeholder}
                            isRequired={field.required}
                            defaultValue={render_value}
                            onBlur={(e) => e?.target?.value && submitRecord(field.id, e.target.value)}
                            className="w-full"
                            minRows={4}
                        />
                    </div>
                );
            }
            case "number": {
                return (
                    <div className="w-full flex flex-col">
                        <label className="text-sm pb-2">
                            <span>{field.field_name}</span>
                            <span className="text-red-600">{field.required ? "*" : ""}</span>
                        </label>
                        <label className="text-xs pb-2">
                            <span className="text-gray-500">{field.comment}</span>
                        </label>
                        <NumberInput
                            type="number"
                            variant="bordered"
                            labelPlacement="outside"
                            isRequired={field.required}
                            placeholder={field.placeholder}
                            defaultValue={
                                !field_value && field_value !== 0
                                    ? undefined
                                    : isNaN(Number(render_value))
                                      ? undefined
                                      : Number(render_value)
                            }
                            onValueChange={(number) => submitRecord(field.id, number)}
                            className="w-full"
                        />
                    </div>
                );
            }
            case "select": {
                return (
                    <div className="w-full flex flex-col">
                        <label className="text-sm pb-1">
                            <span>{field.field_name}</span>
                            <span className="text-red-600">{field.required ? "*" : ""}</span>
                        </label>
                        <label className="text-xs pb-2">
                            <span className="text-gray-500">{field.comment}</span>
                        </label>
                        <Select
                            variant="bordered"
                            labelPlacement="outside"
                            className="w-full"
                            isRequired={field.required}
                            defaultSelectedKeys={[choose_value]}
                            onSelectionChange={({ currentKey }) => currentKey && submitRecord(field.id, currentKey)}
                            placeholder={field.placeholder || Locale("Common").DefaultSelectPlaceholder}
                        >
                            {(field.radios || []).map((radio) => (
                                <SelectItem key={radio.id}>{radio.radio_name}</SelectItem>
                            ))}
                        </Select>
                    </div>
                );
            }
            case "mulselect": {
                return (
                    <Select
                        variant="bordered"
                        labelPlacement="outside"
                        className="w-full"
                        isRequired={field.required}
                        defaultSelectedKeys={[choose_value]}
                        onSelectionChange={({ currentKey }) => currentKey && submitRecord(field.id, currentKey)}
                        placeholder={field.placeholder || Locale("Common").DefaultSelectPlaceholder}
                    >
                        {(field.radios || []).map((radio) => (
                            <SelectItem key={radio.id}>{radio.radio_name}</SelectItem>
                        ))}
                    </Select>
                );
            }
            case "checkbox": {
                if (!field.radios || !field.radios.length) return <div />;
                const { id, radio_name } = field.radios[0];
                if (!id || !radio_name) return <div />;
                return (
                    <div className="flex flex-col">
                        <label className="text-sm pb-2">{field.field_name}</label>
                        <Checkbox
                            size="sm"
                            className="pb-2"
                            defaultSelected={id === choose_value}
                            onValueChange={(check) => submitRecord(field.id, check ? id : "")}
                        >
                            {radio_name}
                        </Checkbox>
                    </div>
                );
            }
        }
    }
    return (
        <div className="w-3/4 md:w-1/3 mx-auto">
            <div className="w-full flex flex-col px-2 py-2">
                <div className="text-lg mx-auto font-bold py-4">{formName}</div>
                <div className="flex flex-col">
                    {fieldList
                        .slice((page - 1) * 10, page * 10)
                        .filter((i) => !i.disabled)
                        .map((field) => {
                            return (
                                <div className="w-full flex flex-row flex-wrap pt-3" key={field.id}>
                                    {renderControl(field)}
                                </div>
                            );
                        })}
                </div>
            </div>
            <div className="flex flex-row justify-center items-center w-full py-2">
                {!!total && (
                    <Pagination showControls initialPage={1} total={Math.ceil(total / 10)} onChange={setPage} />
                )}
            </div>
            {!pass && <CheckModal value={code} change={changeCode} />}
        </div>
    );
};

export default Component;
