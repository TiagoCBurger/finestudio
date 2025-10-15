import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
} from '@/components/ui/kibo-ui/combobox';
import { cn } from '@/lib/utils';
import { CheckIcon, ClockIcon } from 'lucide-react';
import { useState } from 'react';

type VideoDurationSelectorProps = {
    id?: string;
    value: number;
    options: number[];
    width?: number | string;
    className?: string;
    onChange?: (value: number) => void;
};

const getLabel = (duration: number) => {
    return (
        <div className="flex items-center gap-1 truncate">
            <span>{duration}</span>
            <span className="text-muted-foreground text-xs">segundos</span>
        </div>
    );
};

export const VideoDurationSelector = ({
    id,
    value,
    width = 200,
    options,
    className,
    onChange,
}: VideoDurationSelectorProps) => {
    const [open, setOpen] = useState(false);

    return (
        <Combobox
            open={open}
            onOpenChange={setOpen}
            data={options.map((option) => ({
                label: option.toString(),
                value: option.toString(),
            }))}
            type="duration"
            value={value.toString()}
            onValueChange={(val) => onChange?.(Number(val))}
        >
            <ComboboxTrigger id={id} className="rounded-full" style={{ width }}>
                <div className="flex w-full items-center gap-2">
                    <ClockIcon size={16} className="text-muted-foreground" />
                    {getLabel(value)}
                </div>
            </ComboboxTrigger>
            <ComboboxContent className={cn('p-0', className)}>
                <ComboboxInput />
                <ComboboxList>
                    <ComboboxEmpty />
                    <ComboboxGroup>
                        {options.map((option) => (
                            <ComboboxItem
                                key={option}
                                value={option.toString()}
                                onSelect={() => {
                                    onChange?.(option);
                                    setOpen(false);
                                }}
                            >
                                <ClockIcon size={16} className="text-muted-foreground" />
                                {getLabel(option)}
                                <CheckIcon
                                    className={cn(
                                        'ml-auto size-4',
                                        value === option ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                            </ComboboxItem>
                        ))}
                    </ComboboxGroup>
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
};
