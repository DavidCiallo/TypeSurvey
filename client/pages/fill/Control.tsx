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
import { FormFieldImpl, RecordImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";

export function renderControl(
    records: RecordImpl[],
    field: FormFieldImpl,
    submitRecord: (field_id: string, field_value: number | string) => void
) {
    const field_value = records.find((r) => r.field_id === field.id)?.field_value || "";
    let render_value: string;
    let choose_value: string;
    let choose_keys: string[] = [];
    if (field.field_type === "mulselect" || field.field_type === "checkboxgroup") {
        const ids = String(field_value).split(",").filter(Boolean);
        choose_keys = ids.filter((id) => field.radios?.some((r) => r.id === id));
        choose_value = choose_keys[0] || String(field_value);
        render_value = choose_keys
            .map((id) => field.radios?.find((r) => r.id === id)?.radio_name || id)
            .join(", ");
    } else if (field.radios?.find((i) => i.id == field_value)) {
        choose_value = String(field_value);
        render_value = String(field.radios?.find((i) => i.id == field_value)?.radio_name);
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
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="text"
                        required={field.required}
                        placeholder={field.placeholder || " "}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                        autoComplete="off"
                    />
                </div>
            );
        }
        case "email": {
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="email"
                        required={field.required}
                        placeholder={field.placeholder || "mail@example.com"}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                    />
                </div>
            );
        }
        case "password": {
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="password"
                        required={field.required}
                        placeholder={field.placeholder}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                    />
                </div>
            );
        }
        case "textarea": {
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Textarea
                        placeholder={field.placeholder}
                        required={field.required}
                        defaultValue={render_value}
                        onChange={(e) => submitRecord(field.id, e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            );
        }
        case "number": {
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Input
                        type="number"
                        required={field.required}
                        placeholder={field.placeholder}
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
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <Select
                        value={choose_value}
                        onValueChange={(value) => submitRecord(field.id, value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || Locale("Common").DefaultSelectPlaceholder} />
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
            return (
                <div className="flex w-full flex-col">
                    {fieldLabel}
                    <div className="text-muted-foreground border-input mb-2 flex min-h-9 items-center rounded-md border px-3 text-sm">
                        {current.length ? current.join(", ") : (field.placeholder || Locale("Common").DefaultSelectPlaceholder)}
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
    }

    return null;
}
