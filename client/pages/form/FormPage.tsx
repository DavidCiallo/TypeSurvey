import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { Button, Pagination, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { FormFieldImpl } from "../../../shared/impl";
import { FormFieldListResponse } from "../../../shared/router/FieldRouter";
import { FormFieldRouter } from "../../api/instance";
import FormFieldContentModal from "./FormFieldContent";
import FieldEditor from "./FormFieldEditor";

const Component = () => {
    const [allFormFieldList, setAllFormFieldList] = useState<FormFieldImpl[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [focusFormField, setFocusFormField] = useState<FormFieldImpl | null>(null);
    const [isFormFieldContentOpen, setFormFieldContentOpen] = useState(false);
    const [isFieldEditorOpen, setFieldEditorOpen] = useState(false);

    function renderFormField(data: FormFieldListResponse) {
        setTotal(data.total);
        setAllFormFieldList(data.list);
        setIsLoading(false);
    }

    useEffect(() => {
        FormFieldRouter.list({ page }, renderFormField);
    }, [])

    return (
        <div className="max-w-screen">
            <Header name="表单列表" />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-4">
                <div className="flex flex-row justify-between items-center w-full py-3">
                    <div className="flex-row w-full">
                        {!!total &&
                            <Pagination
                                initialPage={1} total={Math.ceil(total / 10)}
                                onChange={(page: number) => {
                                    setPage(page);
                                    setIsLoading(true);
                                    FormFieldRouter.list({ page }, renderFormField)
                                }}
                            />
                        }
                    </div>
                    <Button
                        onClick={() => setFieldEditorOpen(true)}
                        color="primary" variant="bordered" className="text-primary"
                    >
                        新建字段
                    </Button>
                </div>
            </div>
            <div className="w-full flex flex-col flex-wrap px-[5vw] py-4">
                <Table>
                    <TableHeader>
                        <TableColumn>字段名称</TableColumn>
                        <TableColumn>字段类型</TableColumn>
                        <TableColumn>操作</TableColumn>
                    </TableHeader>
                    <TableBody
                        isLoading={isLoading}
                        loadingContent={<div className="w-full h-full bg-[rgba(0,0,0,0.1)]"><Spinner /></div>}
                    >
                        {allFormFieldList.map((i) => (
                            <TableRow key={i.id}>
                                <TableCell>{i.field_name}</TableCell>
                                <TableCell>{i.field_type}</TableCell>
                                <TableCell>
                                    <Button
                                        onClick={() => {
                                            setFocusFormField(i);
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {
                focusFormField && <FormFieldContentModal
                    filed={focusFormField}
                    isOpen={isFormFieldContentOpen}
                    onOpenChange={setFormFieldContentOpen}
                />
            }
            {
                <FieldEditor
                    isOpen={isFieldEditorOpen}
                    onOpenChange={(v: boolean) => {
                        setFieldEditorOpen(v);
                    }}
                    onSubmit={() => {
                    }}
                />
            }
        </div >
    )
};


export default Component;