import { Button } from "@/client/components/ui/button";
import { Pagination } from "@/client/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select";
import { Locale } from "../../methods/locale";

type props = {
    total: number;
    page: number;
    currentFormName: string;
    formList: Array<string>;
    loadFormFields: (form_name: string, page: number) => void;
    openFieldEditor: (isOpen: boolean) => void;
};

const Component = ({ total, page, currentFormName, formList, loadFormFields, openFieldEditor }: props) => {
    const locale = Locale("FormFieldPage");

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-2">
                {!!total && (
                    <Pagination
                        page={page}
                        total={Math.ceil(total / 10)}
                        onChange={(p) => loadFormFields(currentFormName, p)}
                    />
                )}
            </div>
            <div className="flex items-center gap-2">
                <Select
                    value={currentFormName}
                    onValueChange={(value) => loadFormFields(value, page)}
                >
                    <SelectTrigger className="w-48 md:w-80">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {formList.map((i) => (
                            <SelectItem key={i} value={i}>
                                {i}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => openFieldEditor(true)}>
                    {locale.CreateNewField}
                </Button>
            </div>
        </div>
    );
};

export default Component;
