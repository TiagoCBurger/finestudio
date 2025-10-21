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
import {
  CheckIcon,
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  SquareIcon,
} from 'lucide-react';
import { useState } from 'react';

type ImageSizeSelectorProps = {
  id?: string;
  value: string;
  options: string[];
  width?: number | string;
  className?: string;
  onChange?: (value: string) => void;
};

const getIcon = (option: string) => {
  // Check if it's aspect ratio format (e.g., "16:9") or pixel format (e.g., "1024x768")
  const isAspectRatio = option.includes(':');

  let width: number, height: number;

  if (isAspectRatio) {
    // Parse aspect ratio (e.g., "16:9")
    if (option === 'auto') {
      return <SquareIcon size={16} className="text-muted-foreground" />;
    }
    [width, height] = option.split(':').map(Number);
  } else {
    // Parse pixel dimensions (e.g., "1024x768")
    [width, height] = option.split('x').map(Number);
  }

  if (width === height) {
    return <SquareIcon size={16} className="text-muted-foreground" />;
  }

  if (width > height) {
    return (
      <RectangleHorizontalIcon size={16} className="text-muted-foreground" />
    );
  }

  return <RectangleVerticalIcon size={16} className="text-muted-foreground" />;
};

const getLabel = (option: string) => {
  // Check if it's aspect ratio format (e.g., "16:9") or pixel format (e.g., "1024x768")
  const isAspectRatio = option.includes(':');

  if (isAspectRatio) {
    // Display aspect ratio as-is
    return (
      <div className="flex items-center gap-1 truncate">
        <span>{option}</span>
      </div>
    );
  }

  // Display pixel dimensions
  const [width, height] = option.split('x').map(Number);
  return (
    <div className="flex items-center gap-1 truncate">
      <span>{width}</span>
      <span className="text-muted-foreground">&times;</span>
      <span>{height}</span>
    </div>
  );
};

export const ImageSizeSelector = ({
  id,
  value,
  width = 200,
  options,
  className,
  onChange,
}: ImageSizeSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Combobox
      open={open}
      onOpenChange={setOpen}
      data={options.map((option) => ({
        label: option,
        value: option,
      }))}
      type="size"
      value={value}
      onValueChange={onChange}
    >
      <ComboboxTrigger id={id} className="rounded-full" style={{ width }}>
        <div className="flex w-full items-center gap-2">
          {getIcon(value)}
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
                value={option}
                onSelect={() => {
                  onChange?.(option);
                  setOpen(false);
                }}
              >
                {getIcon(option)}
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
