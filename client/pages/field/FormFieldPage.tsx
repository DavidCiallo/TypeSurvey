import { Header } from "../../components/header/Header";
import { useEffect, useRef, useState } from "react";
import { FormFieldImpl } from "../../../shared/impl";
import { FormRouter, FieldRouter, RadioRouter } from "../../api/instance";
import FieldEditor from "./FormFieldEditor";
import RadioEditor from "./FormFieldRadioEditor";
import { toast } from "../../methods/notify";
import FormFieldTable from "./FormFieldTable";
import { Locale } from "../../methods/locale";
import { FieldCreateRequest, FieldUpdateRequest } from "../../../shared/modules/field/field.interface";
import { RadioCreateRequest, RadioUpdateRequest } from "../../../shared/modules/radio/radio.interface";
import FormFieldHeader from "./FormFieldHeader";

const DEBOUNCE_KEYS = ["field_name", "comment", "placeholder"];

const Component = () => {
    const locale = Locale("FormFieldPage");
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const [formName, setFormName] = useState<string>("");
    const [formList, setFormList] = useState<string[]>([]);
    const [formFieldList, setFormFieldList] = useState<FormFieldImpl[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState(1);

    const [focusFormField, setFocusFormField] = useState<FormFieldImpl | null>(null);
    const [isFieldEditorOpen, setFieldEditorOpen] = useState(false);
    const [isRadioEditorOpen, setRadioEditorOpen] = useState(false);

    async function loadFormFields(form_name: string, page: number = 1) {
        if (formName !== form_name) {
            setFormName(form_name);
            const { success, data, message } = await FieldRouter.list({ form_name, page });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list, total } = data;
            renderFormField(list, total);
        } else {
            const { success, data, message } = await FieldRouter.list({ form_name, page });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list, total } = data;
            renderFormField(list, total);
        }
        setPage(page);
    }

    async function saveField(field: FieldCreateRequest | FieldUpdateRequest) {
        if (!("form_name" in field)) {
            return;
        }
        const form_name = field.form_name;
        const field_name = field.field_name!;
        const field_type = field.field_type!;
        const { success } = await FieldRouter.create({ form_name, field_name, field_type });
        if (success) {
            setFieldEditorOpen(false);
            loadFormFields(form_name, page);
        } else {
            toast({ title: locale.CreateFieldFailed, color: "danger" });
        }
    }

    async function saveRadio(radio: RadioCreateRequest | RadioUpdateRequest) {
        if (!("radio_name" in radio) || !focusFormField) {
            return;
        }
        const { success } = await RadioRouter.create({
            field_id: focusFormField.id,
            radio_name: radio.radio_name!,
        });
        if (success) {
            setRadioEditorOpen(false);
            loadFormFields(formName, page);
        } else {
            toast({ title: locale.CreateRadioFailed, color: "danger" });
        }
    }

    async function updateField(field_id: string, key: string, value: string | number | boolean) {
        if (DEBOUNCE_KEYS.includes(key)) {
            const timerKey = `field_${field_id}_${key}`;
            if (timers.current[timerKey]) clearTimeout(timers.current[timerKey]);
            timers.current[timerKey] = setTimeout(async () => {
                await FieldRouter.update({ field_id, [key]: value });
                await loadFormFields(formName, page);
            }, 600);
        } else {
            await FieldRouter.update({ field_id, [key]: value });
            await loadFormFields(formName, page);
        }
    }

    async function updateRadio(radio_id: string, key: string, value: string | number | boolean) {
        if (DEBOUNCE_KEYS.includes(key)) {
            const timerKey = `radio_${radio_id}_${key}`;
            if (timers.current[timerKey]) clearTimeout(timers.current[timerKey]);
            timers.current[timerKey] = setTimeout(async () => {
                await RadioRouter.update({ radio_id, [key]: value });
                await loadFormFields(formName, page);
            }, 600);
        } else {
            await RadioRouter.update({ radio_id, [key]: value });
            await loadFormFields(formName, page);
        }
    }

    function renderFormField(list: FormFieldImpl[], total: number) {
        setTotal(total);
        setFormFieldList(list);
    }

    useEffect(() => {
        (async () => {
            const { success, data, message } = await FormRouter.list({ page: 1 });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list } = data;
            setFormList(list.map((i) => i.form_name));
            if (list.length === 0) return;
            loadFormFields(list[0].form_name);
        })();
    }, []);

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <FormFieldHeader
                total={total}
                page={page}
                formList={formList}
                currentFormName={formName}
                openFieldEditor={setFieldEditorOpen}
                loadFormFields={loadFormFields}
            />
            <FormFieldTable
                total={total}
                page={page}
                formFieldList={formFieldList}
                focusFormFieldId={focusFormField?.id || null}
                isRadioEditorOpen={isRadioEditorOpen}
                changeFocusField={(id) => setFocusFormField(formFieldList.find((i) => i.id === id) || null)}
                changeRadioEditorOpen={setRadioEditorOpen}
                updateField={updateField}
                updateRadio={updateRadio}
            />
            <FieldEditor
                form_name={formName}
                isOpen={isFieldEditorOpen}
                onOpenChange={setFieldEditorOpen}
                onSubmit={saveField}
            />
            <RadioEditor
                field_id={focusFormField?.id || null}
                isOpen={isRadioEditorOpen}
                onOpenChange={setRadioEditorOpen}
                onSubmit={saveRadio}
            />
        </div>
    );
};

export default Component;
