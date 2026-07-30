import { useState, useCallback } from "react";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select";
import { Textarea } from "@/client/components/ui/textarea";
import { Button } from "@/client/components/ui/button";
import { Upload, FileImage, X } from "lucide-react";
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";
import { FileRouter } from "../../api/instance";
import { MultilinePlaceholder } from "@/client/components/ui/multiline-placeholder";

// TextareaField 组件：处理多行文本字段的渲染
function TextareaField({
    field,
    render_value,
    fieldLabel,
    submitRecord
}: {
    field: FormFieldImpl;
    render_value: string;
    fieldLabel: React.ReactNode;
    submitRecord: (field_id: string, field_value: number | string) => void;
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!render_value);
    const hasMultilinePlaceholder = field.placeholder?.includes('\n');
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setHasValue(!!e.target.value);
        submitRecord(field.id, e.target.value);
    }, [field.id, submitRecord]);
    
    const handleFocus = useCallback(() => setIsFocused(true), []);
    const handleBlur = useCallback(() => setIsFocused(false), []);
    
    return (
        <div className="flex w-full flex-col">
            {fieldLabel}
            <div className="relative">
                <Textarea
                    placeholder={hasMultilinePlaceholder ? " " : field.placeholder}
                    required={field.required}
                    defaultValue={render_value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="min-h-[80px]"
                />
                {hasMultilinePlaceholder && (
                    <MultilinePlaceholder
                        placeholder={field.placeholder}
                        hasValue={hasValue}
                        isFocused={isFocused}
                    />
                )}
            </div>
        </div>
    );
}

export function renderControl(
    records: RecordImpl[],
    field: FormFieldImpl,
    submitRecord: (field_id: string, field_value: number | string) => void
) {
    const field_value = records.find((r) => r.field_id === field.id)?.field_value || "";
    const radios = field.radios || [];
    // 按 id 优先、name 兜底，在 radios 里找选项；找不到返回原值
    const matchRadio = (val: string) =>
        radios.find((r) => r.id === val) || radios.find((r) => r.radio_name === val);
    let render_value: string;
    let choose_value: string;
    let choose_keys: string[] = [];
    if (field.field_type === "mulselect" || field.field_type === "checkboxgroup") {
        const ids = String(field_value).split(",").filter(Boolean);
        choose_keys = ids
            .map((id) => matchRadio(id)?.id || "")
            .filter(Boolean);
        choose_value = choose_keys[0] || String(field_value);
        render_value = ids
            .map((id) => matchRadio(id)?.radio_name || id)
            .join(", ");
    } else if (matchRadio(String(field_value))) {
        choose_value = String(matchRadio(String(field_value))!.id);
        render_value = String(matchRadio(String(field_value))!.radio_name);
    } else {
        choose_value = String(field_value);
        render_value = String(field_value);
    }

    const fieldLabel = (
        <div className="flex flex-col">
            <Label className="pb-1">
                <span>{field.field_name}</span>
                {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            {field.comment && (
                <span className="text-muted-foreground pb-1 text-xs">{field.comment}</span>
            )}
        </div>
    );

    switch (field.field_type) {
        case "text": {
            const placeholderText = field.placeholder?.split('\n')[0] || " ";
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="text"
                        required={field.required}
                        placeholder={placeholderText}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                        autoComplete="off"
                        title={field.placeholder}
                    />
                </div>
            );
        }
        case "email": {
            const placeholderText = field.placeholder?.split('\n')[0] || "mail@example.com";
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="email"
                        required={field.required}
                        placeholder={placeholderText}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                        title={field.placeholder}
                    />
                </div>
            );
        }
        case "password": {
            const placeholderText = field.placeholder?.split('\n')[0];
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="password"
                        required={field.required}
                        placeholder={placeholderText}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                        title={field.placeholder}
                    />
                </div>
            );
        }
        case "date":
        case "time":
        case "month": {
            const placeholderText = field.placeholder?.split('\n')[0];
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type={field.field_type}
                        required={field.required}
                        placeholder={placeholderText}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                        title={field.placeholder}
                    />
                </div>
            );
        }
        case "color": {
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <div className="flex items-center gap-2">
                        <Input
                            type="color"
                            required={field.required}
                            defaultValue={render_value || "#000000"}
                            onChange={(e) => submitRecord(field.id, e.target.value)}
                            className="h-9 w-14 cursor-pointer p-1"
                        />
                        <Input
                            type="text"
                            defaultValue={render_value}
                            placeholder="#000000"
                            onChange={(e) => submitRecord(field.id, e.target.value)}
                            className="max-w-32"
                        />
                    </div>
                </div>
            );
        }
        case "textarea": {
            return (
                <TextareaField
                    field={field}
                    render_value={render_value}
                    fieldLabel={fieldLabel}
                    submitRecord={submitRecord}
                />
            );
        }
        case "number": {
            const placeholderText = field.placeholder?.split('\n')[0];
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="number"
                        required={field.required}
                        placeholder={placeholderText}
                        title={field.placeholder}
                        defaultValue={
                            !field_value && field_value !== 0
                                ? ""
                                : isNaN(Number(render_value))
                                ? ""
                                : String(render_value)
                        }
                        onChange={(e) => submitRecord(field.id, e.target.valueAsNumber)}
                    />
                </div>
            );
        }
        case "select": {
            const placeholderText = field.placeholder?.split('\n')[0] || Locale("Common").DefaultSelectPlaceholder;
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Select
                        value={choose_value}
                        onValueChange={(value) => submitRecord(field.id, value)}
                    >
                        <SelectTrigger title={field.placeholder}>
                            <SelectValue placeholder={placeholderText} />
                        </SelectTrigger>
                        <SelectContent>
                            {(field.radios || []).map((radio) => (
                                <SelectItem key={radio.id} value={radio.id}>
                                    {radio.radio_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }
        case "mulselect": {
            const current = choose_keys.map((id) => field.radios?.find((r) => r.id === id)?.radio_name).filter(Boolean);
            const placeholderText = field.placeholder?.split('\n')[0] || Locale("Common").DefaultSelectPlaceholder;
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <div className="text-muted-foreground border-input mb-2 flex min-h-9 items-center rounded-md border px-3 text-sm" title={field.placeholder}>
                        {current.length ? current.join(", ") : placeholderText}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                        {(field.radios || []).map((radio) => (
                            <div key={radio.id} className="flex items-center gap-2">
                                <Checkbox
                                    checked={choose_keys.includes(radio.id)}
                                    onCheckedChange={(checked) => {
                                        const current = new Set(choose_keys);
                                        if (checked) {
                                            current.add(radio.id);
                                        } else {
                                            current.delete(radio.id);
                                        }
                                        submitRecord(field.id, Array.from(current).join(","));
                                    }}
                                />
                                <span className="text-sm">{radio.radio_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        case "checkboxgroup": {
            if (!field.radios || !field.radios.length) return <div />;
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                        {field.radios.map((radio) => (
                            <div key={radio.id} className="flex items-center gap-2">
                                <Checkbox
                                    checked={choose_keys.includes(radio.id)}
                                    onCheckedChange={(checked) => {
                                        const current = new Set(choose_keys);
                                        if (checked) {
                                            current.add(radio.id);
                                        } else {
                                            current.delete(radio.id);
                                        }
                                        submitRecord(field.id, Array.from(current).join(","));
                                    }}
                                />
                                <span className="text-sm">{radio.radio_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        case "checkbox": {
            if (!field.radios || !field.radios.length) return <div />;
            const { id, radio_name } = field.radios[0];
            if (!id || !radio_name) return <div />;
            return (
                <div className="flex flex-col">
                    {fieldLabel}
                    <div className="flex items-center gap-2 pb-1">
                        <Checkbox
                            defaultChecked={id === choose_value}
                            onCheckedChange={(check) => submitRecord(field.id, check ? id : "")}
                        />
                        <span className="text-sm">{radio_name}</span>
                    </div>
                </div>
            );
        }
        case "file": {
            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(render_value);
            const fileInput = (
                <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = "";
                        const reader = new FileReader();
                        reader.onload = async () => {
                            const base64 = (reader.result as string).split(",")[1];
                            const { success, data } = await FileRouter.upload({ filename: file.name, data: base64 });
                            if (success && data?.url) {
                                submitRecord(field.id, data.url);
                            }
                        };
                        reader.readAsDataURL(file);
                    }}
                />
            );
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    {render_value ? (
                        <div className="flex items-center gap-3">
                            {isImage ? (
                                <img
                                    src={render_value}
                                    alt="uploaded"
                                    className="h-20 w-20 rounded-md border object-cover"
                                />
                            ) : (
                                <FileImage className="text-muted-foreground size-8" />
                            )}
                            <label className="hover:bg-accent cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors">
                                重新上传
                                {fileInput}
                            </label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => submitRecord(field.id, "")}
                            >
                                <X className="size-3" />
                            </Button>
                        </div>
                    ) : (
                        <label className="border-input hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm transition-colors" title={field.placeholder}>
                            <Upload className="text-muted-foreground size-4" />
                            <span className="text-muted-foreground">{field.placeholder?.split('\n')[0] || "点击上传文件"}</span>
                            {fileInput}
                        </label>
                    )}
                </div>
            );
        }
    }

    return null;
}
