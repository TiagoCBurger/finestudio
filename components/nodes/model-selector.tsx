import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  type TersaModel,
  type TersaProvider,
  providers,
} from '@/lib/providers';
import { cn } from '@/lib/utils';
import type { PriceBracket } from '@/providers/gateway/client';
import {
  type SubscriptionContextType,
  useSubscription,
} from '@/providers/subscription';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  Coins,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type ModelSelectorProps = {
  id?: string;
  options: Record<string, TersaModel>;
  value: string;
  width?: number | string;
  className?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

const formatCredits = (cost: number): string => {
  if (cost === 0) return 'Grátis';
  if (cost < 0.01) return '<0.01';
  if (cost >= 1) return cost.toFixed(0);
  return cost.toFixed(3);
};

const getCostBracketIcon = (bracket: PriceBracket, className?: string) => {
  switch (bracket) {
    case 'lowest':
      return (
        <ChevronsDownIcon
          size={16}
          className={cn('text-purple-500 dark:text-purple-400', className)}
        />
      );
    case 'low':
      return (
        <ChevronDownIcon
          size={16}
          className={cn('text-blue-500 dark:text-blue-400', className)}
        />
      );
    case 'high':
      return (
        <ChevronUpIcon
          size={16}
          className={cn('text-orange-500 dark:text-orange-400', className)}
        />
      );
    case 'highest':
      return (
        <ChevronsUpIcon
          size={16}
          className={cn('text-red-500 dark:text-red-400', className)}
        />
      );
    default:
      return null;
  }
};

const getCostBracketLabel = (bracket: PriceBracket) => {
  switch (bracket) {
    case 'lowest':
      return 'This model uses a lot less credits.';
    case 'low':
      return 'This model uses less credits.';
    case 'high':
      return 'This model uses more credits.';
    case 'highest':
      return 'This model uses a lot of credits.';
    default:
      return '';
  }
};

const getModelDisabled = (
  model: TersaModel,
  plan: SubscriptionContextType['plan']
) => {
  if (model.disabled) {
    return true;
  }

  if (
    (!plan || plan === 'hobby') &&
    (model.priceIndicator === 'highest' || model.priceIndicator === 'high')
  ) {
    return true;
  }

  return false;
};

const CommandGroupHeading = ({ data }: { data: TersaProvider }) => (
  <div className="flex items-center gap-2">
    <data.icon className="size-4 shrink-0" />
    <span className="block truncate">{data.name}</span>
  </div>
);

const ModelIcon = ({
  data,
  chef,
  className,
}: {
  data: TersaModel;
  chef: TersaProvider;
  className?: string;
}) => {
  if (data.icon) {
    return <data.icon className={cn('size-4 shrink-0', className)} />;
  }

  return <chef.icon className={cn('size-4 shrink-0', className)} />;
};

export const ModelSelector = ({
  id,
  value,
  options,
  width = 250,
  className,
  onChange,
  disabled,
}: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { plan } = useSubscription();

  // Filter out disabled models defensively
  const enabledOptions = Object.fromEntries(
    Object.entries(options).filter(([_, model]) =>
      !model.disabled && model.enabled !== false
    )
  );

  const activeModel = enabledOptions[value];

  useEffect(() => {
    if (value && !enabledOptions[value]) {
      const firstKey = Object.keys(enabledOptions)[0];
      if (firstKey) {
        onChange?.(firstKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const groupedOptions = Object.entries(enabledOptions).reduce(
    (acc, [id, model]) => {
      const chef = model.chef.id;

      if (!acc[chef]) {
        acc[chef] = {};
      }

      acc[chef][id] = model;
      return acc;
    },
    {} as Record<string, Record<string, TersaModel>>
  );

  const sortedChefs = Object.keys(groupedOptions)
    .filter((chef) => Object.keys(groupedOptions[chef]).length > 0) // Filter out empty groups
    .sort((a, b) => {
      const aName = Object.values(providers)
        .find((provider) => provider.id === a)
        ?.name.toLowerCase();
      const bName = Object.values(providers)
        .find((provider) => provider.id === b)
        ?.name.toLowerCase();

      return aName?.localeCompare(bName ?? '') ?? 0;
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={className}
        id={id}
        style={{ width }}
        disabled={disabled}
        asChild
      >
        <Button variant="outline" className="w-full">
          {activeModel && (
            <div className="flex w-full items-center gap-2 overflow-hidden">
              <ModelIcon data={activeModel} chef={activeModel.chef} />
              <span className="block truncate">{activeModel.label}</span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Select a model</DialogTitle>
        </DialogHeader>
        <Command>
          <div className="[&>div]:h-12">
            <CommandInput placeholder="Search for a model..." />
          </div>
          <CommandList>
            <CommandEmpty />
            {sortedChefs.map((chef) => (
              <CommandGroup
                key={chef}
                heading={
                  <CommandGroupHeading
                    data={
                      chef in providers
                        ? providers[chef as keyof typeof providers]
                        : providers.unknown
                    }
                  />
                }
              >
                {Object.entries(groupedOptions[chef]).map(([id, model]) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      onChange?.(id);
                      setOpen(false);
                    }}
                    disabled={getModelDisabled(model, plan)}
                    className={cn(
                      value === id &&
                      'bg-primary text-primary-foreground data-[selected=true]:bg-primary/80 data-[selected=true]:text-primary-foreground'
                    )}
                  >
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <ModelIcon
                        data={model}
                        chef={
                          chef in providers
                            ? providers[chef as keyof typeof providers]
                            : providers.unknown
                        }
                        className={
                          value === id ? 'text-primary-foreground' : ''
                        }
                      />
                      <span className="block truncate">{model.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins
                        size={14}
                        className={cn(
                          'shrink-0',
                          value === id
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm',
                          value === id
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatCredits(
                          (() => {
                            try {
                              const provider = model.providers[0] as any;
                              if (!provider?.getCost) return 0;
                              // Try calling with duration parameter for video models
                              return provider.getCost({ duration: 5 }) ?? 0;
                            } catch {
                              // Fallback for image models that don't need parameters
                              try {
                                return (model.providers[0] as any)?.getCost?.() ?? 0;
                              } catch {
                                return 0;
                              }
                            }
                          })()
                        )}
                      </span>
                      {model.priceIndicator ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {getCostBracketIcon(
                                model.priceIndicator,
                                value === id ? 'text-primary-foreground' : ''
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{getCostBracketLabel(model.priceIndicator)}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="size-4" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
