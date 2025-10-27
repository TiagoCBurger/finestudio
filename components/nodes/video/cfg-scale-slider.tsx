import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type CfgScaleSliderProps = {
    id?: string;
    value: number;
    className?: string;
    onChange?: (value: number) => void;
};

export const CfgScaleSlider = ({
    id,
    value,
    className,
    onChange,
}: CfgScaleSliderProps) => {
    return (
        <div className={cn('flex items-center gap-3 px-3', className)}>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
                Temperatura
            </span>
            <Slider
                id={id}
                min={0}
                max={1}
                step={0.1}
                value={[value]}
                onValueChange={(values) => onChange?.(values[0])}
                className="flex-1"
            />
            <span className="text-xs font-medium w-8 text-right">
                {value.toFixed(1)}
            </span>
        </div>
    );
};
