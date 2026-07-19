import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/client/components/ui/accordion";
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
        <div className="flex w-full flex-col">
            {formList.length === 0 && <EmptyComp height="min-h-[30vh]" opacity="opacity-50" />}
            <Accordion type="multiple">
                {formList.map(({ form_name, records_num, last_submit }) => (
                    <AccordionItem key={form_name} value={form_name}>
                        <AccordionTrigger
                            indicator={
                                <div className="flex items-center gap-2">
                                    <span
                                        role="button"
                                        className="hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            viewRecords(form_name);
                                        }}
                                    >
                                        {locale.ViewRecordsButton}
                                    </span>
                                    <span
                                        role="button"
                                        className="hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openFormEditor(form_name);
                                        }}
                                    >
                                        {locale.RenameButton}
                                    </span>
                                    <span
                                        role="button"
                                        className="text-destructive hover:bg-destructive/10 inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openRecordEditor(form_name);
                                        }}
                                    >
                                        {locale.CreateRecordButton}
                                    </span>
                                </div>
                            }
                        >
                            <div className="flex flex-1 items-center justify-between gap-4 pr-4">
                                <div className="text-base font-semibold">{form_name}</div>
                                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                                    <span>{locale.RecordNumLabel + " " + records_num}</span>
                                    {last_submit ? (
                                        <span>{formatTime(last_submit)}</span>
                                    ) : (
                                        <span>{locale.EmptyNumLabel}</span>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent />
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};

export default FormList;
