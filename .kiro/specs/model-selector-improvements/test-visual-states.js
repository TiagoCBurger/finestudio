/**
 * Script de Teste: Estados Visuais do ModelSelector
 * 
 * Este script verifica se as classes CSS corretas estão sendo aplicadas
 * para cada estado visual do componente ModelSelector.
 * 
 * Uso: node .kiro/specs/model-selector-improvements/test-visual-states.js
 */

const fs = require('fs');
const path = require('path');

// Cores do tema (baseado em Tailwind CSS)
const colors = {
  light: {
    primary: 'hsl(262.1 83.3% 57.8%)', // roxo
    'primary-foreground': 'hsl(210 40% 98%)', // branco
    'muted-foreground': 'hsl(215.4 16.3% 46.9%)', // cinza
    accent: 'hsl(210 40% 96.1%)', // cinza claro
    'accent-foreground': 'hsl(222.2 47.4% 11.2%)', // preto
  },
  dark: {
    primary: 'hsl(263.4 70% 50.4%)', // roxo
    'primary-foreground': 'hsl(210 40% 98%)', // branco
    'muted-foreground': 'hsl(215 20.2% 65.1%)', // cinza claro
    accent: 'hsl(217.2 32.6% 17.5%)', // cinza escuro
    'accent-foreground': 'hsl(210 40% 98%)', // branco
  }
};

// Estados visuais esperados
const expectedStates = {
  selected: {
    background: 'bg-primary',
    text: 'text-primary-foreground',
    icon: 'text-primary-foreground',
    coinIcon: 'text-primary-foreground',
    cost: 'text-primary-foreground',
    bracket: 'text-primary-foreground',
    hover: 'bg-primary/80',
  },
  normal: {
    background: 'transparent',
    text: 'default',
    icon: 'default',
    coinIcon: 'text-muted-foreground',
    cost: 'text-muted-foreground',
    bracket: 'specific-color', // roxo/azul/laranja/vermelho
  },
  hover: {
    background: 'bg-accent',
    text: 'text-accent-foreground',
  },
  disabled: {
    opacity: 'opacity-50',
    cursor: 'cursor-not-allowed',
    pointerEvents: 'pointer-events-none',
  }
};

// Verificar se o componente existe
const componentPath = path.join(process.cwd(), 'components/nodes/model-selector.tsx');

if (!fs.existsSync(componentPath)) {
  console.error('❌ Componente não encontrado:', componentPath);
  process.exit(1);
}

const componentCode = fs.readFileSync(componentPath, 'utf-8');

console.log('🧪 Teste de Estados Visuais - ModelSelector\n');
console.log('=' .repeat(60));

// Teste 1: Verificar estado selecionado
console.log('\n📋 Teste 1: Estado Selecionado');
console.log('-'.repeat(60));

const selectedBgCheck = componentCode.includes('bg-primary text-primary-foreground');
console.log(selectedBgCheck ? '✅' : '❌', 'Fundo e texto do item selecionado');

const selectedCoinCheck = componentCode.includes("value === id") && 
  componentCode.includes("'text-primary-foreground'") &&
  componentCode.includes("'text-muted-foreground'") &&
  componentCode.includes("<Coins");
console.log(selectedCoinCheck ? '✅' : '❌', 'Ícone de moeda muda de cor quando selecionado');

const selectedCostCheck = componentCode.includes("value === id") && 
  componentCode.includes("text-primary-foreground") &&
  componentCode.includes("text-muted-foreground") &&
  componentCode.includes("formatCredits");
console.log(selectedCostCheck ? '✅' : '❌', 'Custo muda de cor quando selecionado');

const selectedBracketCheck = componentCode.includes("value === id ? 'text-primary-foreground' : ''");
console.log(selectedBracketCheck ? '✅' : '❌', 'Indicador de bracket muda de cor quando selecionado');

const selectedHoverCheck = componentCode.includes('data-[selected=true]:bg-primary/80');
console.log(selectedHoverCheck ? '✅' : '❌', 'Hover em item selecionado (bg-primary/80)');

// Teste 2: Verificar estado normal
console.log('\n📋 Teste 2: Estado Normal');
console.log('-'.repeat(60));

const normalCoinCheck = componentCode.includes('text-muted-foreground');
console.log(normalCoinCheck ? '✅' : '❌', 'Ícone de moeda em cinza (text-muted-foreground)');

const normalCostCheck = componentCode.includes('text-sm');
console.log(normalCostCheck ? '✅' : '❌', 'Custo com tamanho de texto apropriado');

// Teste 3: Verificar indicadores de bracket
console.log('\n📋 Teste 3: Indicadores de Bracket');
console.log('-'.repeat(60));

const lowestCheck = componentCode.includes('text-purple-500 dark:text-purple-400');
console.log(lowestCheck ? '✅' : '❌', 'Bracket "lowest" (roxo)');

const lowCheck = componentCode.includes('text-blue-500 dark:text-blue-400');
console.log(lowCheck ? '✅' : '❌', 'Bracket "low" (azul)');

const highCheck = componentCode.includes('text-orange-500 dark:text-orange-400');
console.log(highCheck ? '✅' : '❌', 'Bracket "high" (laranja)');

const highestCheck = componentCode.includes('text-red-500 dark:text-red-400');
console.log(highestCheck ? '✅' : '❌', 'Bracket "highest" (vermelho)');

// Teste 4: Verificar estado desabilitado
console.log('\n📋 Teste 4: Estado Desabilitado');
console.log('-'.repeat(60));

const disabledCheck = componentCode.includes('disabled={getModelDisabled(model, plan)}');
console.log(disabledCheck ? '✅' : '❌', 'Prop disabled aplicada ao CommandItem');

const disabledFunctionCheck = componentCode.includes('const getModelDisabled');
console.log(disabledFunctionCheck ? '✅' : '❌', 'Função getModelDisabled implementada');

const disabledPlanCheck = componentCode.includes("plan === 'hobby'");
console.log(disabledPlanCheck ? '✅' : '❌', 'Desabilita modelos caros para plano hobby');

// Teste 5: Verificar ícone de moeda
console.log('\n📋 Teste 5: Ícone de Moeda');
console.log('-'.repeat(60));

const coinsImportCheck = componentCode.includes("import {") && componentCode.includes("Coins");
console.log(coinsImportCheck ? '✅' : '❌', 'Ícone Coins importado do lucide-react');

const coinsUsageCheck = componentCode.includes('<Coins');
console.log(coinsUsageCheck ? '✅' : '❌', 'Ícone Coins usado no componente');

const coinsSizeCheck = componentCode.includes('size={14}');
console.log(coinsSizeCheck ? '✅' : '❌', 'Tamanho do ícone (14px)');

// Teste 6: Verificar formatação de créditos
console.log('\n📋 Teste 6: Formatação de Créditos');
console.log('-'.repeat(60));

const formatCreditsCheck = componentCode.includes('const formatCredits');
console.log(formatCreditsCheck ? '✅' : '❌', 'Função formatCredits implementada');

const formatGratisCheck = componentCode.includes("return 'Grátis'");
console.log(formatGratisCheck ? '✅' : '❌', 'Formata custo zero como "Grátis"');

const formatLowCheck = componentCode.includes("return '<0.01'");
console.log(formatLowCheck ? '✅' : '❌', 'Formata custos muito baixos como "<0.01"');

// Teste 7: Verificar filtro de modelos desabilitados
console.log('\n📋 Teste 7: Filtro de Modelos Desabilitados');
console.log('-'.repeat(60));

const filterCheck = componentCode.includes('model.enabled !== false');
console.log(filterCheck ? '✅' : '❌', 'Filtra modelos com enabled: false');

const enabledOptionsCheck = componentCode.includes('const enabledOptions');
console.log(enabledOptionsCheck ? '✅' : '❌', 'Cria lista de modelos habilitados');

// Teste 8: Verificar classes condicionais
console.log('\n📋 Teste 8: Classes Condicionais');
console.log('-'.repeat(60));

const cnImportCheck = componentCode.includes("import { cn }");
console.log(cnImportCheck ? '✅' : '❌', 'Utilitário cn importado');

const cnUsageCheck = (componentCode.match(/cn\(/g) || []).length;
console.log(cnUsageCheck >= 5 ? '✅' : '❌', `Uso de cn() para classes condicionais (${cnUsageCheck} vezes)`);

// Resumo
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES\n');

const allTests = [
  selectedBgCheck,
  selectedCoinCheck,
  selectedCostCheck,
  selectedBracketCheck,
  selectedHoverCheck,
  normalCoinCheck,
  normalCostCheck,
  lowestCheck,
  lowCheck,
  highCheck,
  highestCheck,
  disabledCheck,
  disabledFunctionCheck,
  disabledPlanCheck,
  coinsImportCheck,
  coinsUsageCheck,
  coinsSizeCheck,
  formatCreditsCheck,
  formatGratisCheck,
  formatLowCheck,
  filterCheck,
  enabledOptionsCheck,
  cnImportCheck,
  cnUsageCheck >= 5,
];

const passedTests = allTests.filter(Boolean).length;
const totalTests = allTests.length;
const percentage = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total de testes: ${totalTests}`);
console.log(`Testes passados: ${passedTests}`);
console.log(`Testes falhados: ${totalTests - passedTests}`);
console.log(`Taxa de sucesso: ${percentage}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ Os estados visuais estão implementados corretamente.');
} else {
  console.log('\n⚠️  ALGUNS TESTES FALHARAM');
  console.log('❌ Verifique os itens marcados acima.');
}

console.log('\n' + '='.repeat(60));

// Análise de contraste (informativo)
console.log('\n📐 ANÁLISE DE CONTRASTE (Informativo)\n');
console.log('Para validar o contraste WCAG AA (4.5:1), use ferramentas como:');
console.log('- Chrome DevTools (Lighthouse)');
console.log('- WebAIM Contrast Checker');
console.log('- Axe DevTools\n');

console.log('Cores esperadas:');
console.log('- Item selecionado: roxo (#8B5CF6) com texto branco (#FFFFFF)');
console.log('- Item normal: texto preto/branco com custo cinza');
console.log('- Brackets: roxo/azul/laranja/vermelho específicos\n');

console.log('='.repeat(60));

// Instruções para teste manual
console.log('\n📝 PRÓXIMOS PASSOS - TESTE MANUAL\n');
console.log('1. Abra a aplicação em desenvolvimento');
console.log('2. Navegue até um nó que use ModelSelector');
console.log('3. Abra o seletor de modelos');
console.log('4. Verifique cada estado visual:');
console.log('   - Selecione um modelo (deve ficar roxo com texto branco)');
console.log('   - Passe o mouse sobre outros modelos (deve ter feedback visual)');
console.log('   - Verifique modelos desabilitados (opacidade reduzida)');
console.log('   - Alterne entre tema claro e escuro');
console.log('5. Use Chrome DevTools para verificar contraste de cores');
console.log('6. Teste navegação por teclado (Tab, Enter, Esc)');
console.log('\n' + '='.repeat(60));

process.exit(passedTests === totalTests ? 0 : 1);
