import { Checkbox, Input, NumberInput, Select, SelectItem, Textarea } from "@heroui/react";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";

export function renderControl(
    records: RecordImpl[],
    field: FormFieldImpl,
    submitRecord: (field_id: string, field_value: number | string) => void
) {
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
                    <label className="text-sm pb-1">
                        <span>{field.field_name}</span>
                        <span className="text-red-600">{field.required ? "*" : ""}</span>
                    </label>
                    <label className="text-xs pb-1">
                        <span className="text-gray-500">{field.comment}</span>
                    </label>
                    <Input
                        type="text"
                        variant="bordered"
                        labelPlacement="outside"
                        isRequired={field.required}
                        placeholder={field.placeholder || " "}
                        defaultValue={render_value}
                        onValueChange={(text) => submitRecord(field.id, text)}
                        className="w-full"
                        autoComplete="off"
                    />
                </div>
            );
        }
        case "email": {
            return (
                <div className="w-full flex flex-col">
                    <label className="text-sm pb-1">
                        <span>{field.field_name}</span>
                        <span className="text-red-600">{field.required ? "*" : ""}</span>
                    </label>
                    <label className="text-xs pb-1">
                        <span className="text-gray-500">{field.comment}</span>
                    </label>
                    <Input
                        type="email"
                        variant="bordered"
                        labelPlacement="outside"
                        isRequired={field.required}
                        placeholder={field.placeholder || "mail@example.com"}
                        defaultValue={render_value}
                        onValueChange={(text) => submitRecord(field.id, text)}
                        className="w-full"
                    />
                </div>
            );
        }
        case "password": {
            return (
                <div className="w-full flex flex-col">
                    <label className="text-sm pb-1">
                        <span>{field.field_name}</span>
                        <span className="text-red-600">{field.required ? "*" : ""}</span>
                    </label>
                    <label className="text-xs pb-1">
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
                    <label className="text-sm pb-1">
                        <span>{field.field_name}</span>
                        <span className="text-red-600">{field.required ? "*" : ""}</span>
                    </label>
                    <label className="text-xs pb-1">
                        <span className="text-gray-500">{field.comment}</span>
                    </label>
                    <Textarea
                        classNames={{ label: "text-[rgb(17, 24, 28)]" }}
                        variant="bordered"
                        labelPlacement="outside"
                        placeholder={field.placeholder}
                        isRequired={field.required}
                        defaultValue={render_value}
                        onValueChange={(text) => submitRecord(field.id, text)}
                        className="w-full"
                        minRows={4}
                    />
                </div>
            );
        }
        case "number": {
            return (
                <div className="w-full flex flex-col">
                    <label className="text-sm pb-1">
                        <span>{field.field_name}</span>
                        <span className="text-red-600">{field.required ? "*" : ""}</span>
                    </label>
                    <label className="text-xs pb-1">
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
                    <label className="text-xs pb-1">
                        <span className="text-gray-500">{field.comment}</span>
                    </label>
                    <Select
                        aria-label="select"
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
                    <label className="text-sm pb-1">
                        <span>{field.field_name}</span>
                        <span className="text-red-600">{field.required ? "*" : ""}</span>
                    </label>
                    <Checkbox
                        size="sm"
                        className="pb-1"
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
