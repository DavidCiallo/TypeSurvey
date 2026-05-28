import { Button, Pagination, Select, SelectItem } from "@heroui/react";
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

    const pagination = (
        <Pagination
            initialPage={1}
            total={Math.ceil(total / 10)}
            onChange={(page: number) => loadFormFields(currentFormName, page)}
        />
    );
    return (
        <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
            <div className="flex flex-row justify-between items-center w-full py-2">
                <div className="flex flex-row w-full">{!!total && pagination}</div>
                <div className="flex flex-row">
                    <Select
                        aria-label="formname"
                        className="mr-2 w-32 md:w-80"
                        variant="bordered"
                        selectedKeys={[currentFormName]}
                        onSelectionChange={(key) => key.currentKey && loadFormFields(key.currentKey, page)}
                    >
                        {formList.map((i) => (
                            <SelectItem key={i}>{i}</SelectItem>
                        ))}
                    </Select>
                    <Button
                        onClick={() => openFieldEditor(true)}
                        color="default"
                        variant="bordered"
                        className="text-black-500"
                    >
                        {locale.CreateNewField}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Component;
