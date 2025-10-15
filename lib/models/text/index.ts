export type TextModel = {
    id: string;
    label: string;
    provider: 'openrouter' | 'gateway';
    pricing: {
        input: string;   // custo por 1M tokens
        output: string;  // custo por 1M tokens
    };
    enabled: boolean;
    default?: boolean;
};

export const textModels: Record<string, TextModel> = {
    'openai/gpt-5-pro': {
        id: 'openai/gpt-5-pro',
        label: 'GPT-5',
        provider: 'openrouter',
        pricing: { input: '2.50', output: '10.00' },
        enabled: true,
    },
    'anthropic/claude-sonnet-4': {
        id: 'anthropic/claude-sonnet-4',
        label: 'Claude Sonnet 4',
        provider: 'openrouter',
        pricing: { input: '3.00', output: '15.00' },
        enabled: true,
    },
    'google/gemini-2.5-pro': {
        id: 'google/gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        provider: 'openrouter',
        pricing: { input: '1.25', output: '5.00' },
        enabled: true,
    },
    'openai/gpt-4o-mini-search-preview': {
        id: 'openai/gpt-4o-mini-search-preview',
        label: 'GPT-4o Mini',
        provider: 'openrouter',
        pricing: { input: '0.15', output: '0.60' },
        enabled: true,
        default: true,
    },
};

export const getEnabledTextModels = () => {
    return Object.fromEntries(
        Object.entries(textModels).filter(([_, model]) => model.enabled)
    );
};
