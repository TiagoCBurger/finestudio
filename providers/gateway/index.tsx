import { gateway } from '@/lib/gateway';
import type { ReactNode } from 'react';
import { GatewayProviderClient } from './client';

type GatewayProviderProps = {
  children: ReactNode;
};

export const GatewayProvider = async ({ children }: GatewayProviderProps) => {
  // Gateway é opcional - só usa se configurado
  if (!gateway) {
    return <GatewayProviderClient models={[]}>{children}</GatewayProviderClient>;
  }

  const { models } = await gateway.getAvailableModels();
  const textModels = models.filter(
    (model) => !model.name.toLocaleLowerCase().includes('embed')
  );

  return (
    <GatewayProviderClient models={textModels}>
      {children}
    </GatewayProviderClient>
  );
};
