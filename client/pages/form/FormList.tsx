import { Accordion, AccordionItem } from "@heroui/react";
import { Locale } from "../../methods/locale";
import { useNavigate } from "react-router-dom";
import { EmptyComp } from "../../components/empty/Empty";

interface props {
    formList: Array<{ form_name: string; records_num: number; last_submit: number }>;
    openFormEditor: (form_name: string) => void;
    openRecordEditor: (form_name: string) => void;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${M}/${D} ${h}:${m}`;
}

const FormList = ({ formList, openFormEditor, openRecordEditor }: props) => {
    const locale = Locale("FormPage");
    const navigate = useNavigate();

    function viewRecords(formname: string) {
        localStorage.setItem("formname", formname);
        navigate("/record");
    }
    return (
        <div className="w-full flex flex-col">
            {formList.length == 0 && <EmptyComp height="min-h-[30vh]" opacity="opacity-50" />}
            <Accordion selectedKeys={[]}>
                {formList.map(({ form_name, records_num, last_submit }) => {
                    const title = <div className="text-lg font-bold">{form_name}</div>;
                    const subtitle = (
                        <div className="flex flex-row gap-3">
                            <div>{locale.RecordNumLabel + " " + records_num}</div>
                            {!!last_submit && <div>{formatTime(last_submit)}</div>}
                            {!last_submit && <div>{locale.EmptyNumLabel}</div>}
                        </div>
                    );
                    const indicator = (
                        <div className="flex flex-row gap-3">
                            <div className="text-sm text-primary" onClick={() => viewRecords(form_name)}>
                                {locale.ViewRecordsButton}
                            </div>
                            <div className="text-sm text-primary" onClick={() => openFormEditor(form_name)}>
                                {locale.RenameButton}
                            </div>
                            <div className="text-sm text-danger" onClick={() => openRecordEditor(form_name)}>
                                {locale.CreateRecordButton}
                            </div>
                        </div>
                    );
                    return (
                        <AccordionItem
                            key={form_name}
                            aria-label={form_name}
                            title={title}
                            subtitle={subtitle}
                            indicator={indicator}
                        ></AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
};

export default FormList;
