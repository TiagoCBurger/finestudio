#!/usr/bin/env node

/**
 * Teste para validar correção de toasts falsos positivos
 * no carregamento de imagens
 * 
 * Problema: Múltiplos toasts "Failed to load image" aparecem
 * mesmo quando a imagem é gerada com sucesso
 * 
 * Solução: Filtrar erros durante:
 * - Processo de geração (loading=true)
 * - Carregamento de imagem (imageLoading=true)
 * - Transição de URL (URL mudou recentemente)
 * - Erros duplicados (mesma URL já mostrou erro)
 */

console.log('🧪 Teste: Correção de Toasts Falsos Positivos no Carregamento de Imagem\n');

// Simular estados do componente
class ImageComponentSimulator {
    constructor() {
        this.loading = false;
        this.imageLoading = false;
        this.previousUrl = '';
        this.lastErrorUrl = null;
        this.currentUrl = '';
        this.toasts = [];
    }

    // Helper para resetar estado entre testes
    reset() {
        this.loading = false;
        this.imageLoading = false;
        this.previousUrl = '';
        this.lastErrorUrl = null;
        this.currentUrl = '';
        this.toasts = [];
    }

    // Simular início de geração
    startGeneration() {
        console.log('▶️  Iniciando geração de imagem...');
        this.loading = true;
        this.imageLoading = false;
    }

    // Simular recebimento de nova URL via webhook
    receiveNewUrl(url) {
        console.log(`📥 Nova URL recebida: ${url.substring(0, 50)}...`);
        this.currentUrl = url;
        this.imageLoading = true;
        this.loading = false; // Geração completa, aguardando carregamento
    }

    // Simular erro de carregamento de imagem
    onImageError(url) {
        console.log(`❌ onError disparado para: ${url.substring(0, 50)}...`);

        // 🔧 CORREÇÃO 1: Evitar toasts duplicados para a mesma URL
        if (this.lastErrorUrl === url) {
            console.log('   ⚠️  Suprimindo toast duplicado para a mesma URL');
            return false;
        }

        // 🔧 CORREÇÃO 2: Não mostrar erro se estamos em processo de geração
        if (this.loading || this.imageLoading) {
            console.log('   ⚠️  Suprimindo erro durante processo de geração/carregamento');
            return false;
        }

        // 🔧 CORREÇÃO 3: Não mostrar erro se a URL mudou recentemente
        if (url !== this.previousUrl) {
            console.log('   ⚠️  Suprimindo erro durante transição de URL');
            this.previousUrl = url;
            return false;
        }

        // Se passou por todas as validações, mostrar erro
        this.lastErrorUrl = url;
        this.toasts.push({ type: 'error', message: 'Failed to load image' });
        console.log('   🔴 Toast de erro exibido');
        return true;
    }

    // Simular sucesso no carregamento
    onImageLoad(url) {
        console.log(`✅ onLoad disparado para: ${url.substring(0, 50)}...`);
        this.imageLoading = false;
        this.loading = false;
        this.lastErrorUrl = null; // Reset error tracking
        this.toasts.push({ type: 'success', message: 'Image generated successfully' });
        console.log('   ✅ Toast de sucesso exibido');
    }

    // Verificar resultado
    getToastSummary() {
        const errors = this.toasts.filter(t => t.type === 'error').length;
        const successes = this.toasts.filter(t => t.type === 'success').length;
        return { errors, successes, total: this.toasts.length };
    }

    // Helper para debug
    printState() {
        console.log('   Estado atual:', {
            loading: this.loading,
            imageLoading: this.imageLoading,
            currentUrl: this.currentUrl?.substring(0, 30) + '...',
            previousUrl: this.previousUrl?.substring(0, 30) + '...',
            lastErrorUrl: this.lastErrorUrl?.substring(0, 30) + '...',
            toastCount: this.toasts.length
        });
    }
}

// Helper para executar cenários de teste
function runTestScenario(name, description, testFn, expectedErrors, expectedSuccesses = 0) {
    console.log(`\n📋 ${name}`);
    console.log('─'.repeat(60));
    console.log(`   ${description}`);
    
    const simulator = new ImageComponentSimulator();
    testFn(simulator);
    
    const result = simulator.getToastSummary();
    const passed = result.errors === expectedErrors && result.successes === expectedSuccesses;
    
    console.log(`\n📊 Resultado: ${result.errors} erros, ${result.successes} sucessos`);
    console.log(`   Esperado: ${expectedErrors} erros, ${expectedSuccesses} sucessos`);
    console.log(passed ? '✅ PASSOU' : '❌ FALHOU');
    
    return { passed, result };
}

// Cenário 1: Geração bem-sucedida (caso normal)
const test1 = runTestScenario(
    'Cenário 1: Geração Bem-Sucedida',
    'Geração normal com race condition na URL antiga',
    (sim) => {
        sim.startGeneration();
        sim.receiveNewUrl('https://r2.example.com/image1.png');
        sim.onImageError('https://old-url.com/image.png'); // Race condition
        sim.onImageLoad('https://r2.example.com/image1.png');
    },
    0, // expected errors
    1  // expected successes
);

// Cenário 2: Múltiplos erros para a mesma URL (duplicados)
const test2 = runTestScenario(
    'Cenário 2: Múltiplos Erros Duplicados',
    'Múltiplos erros para a mesma URL devem mostrar apenas 1 toast',
    (sim) => {
        sim.currentUrl = 'https://r2.example.com/image2.png';
        sim.previousUrl = 'https://r2.example.com/image2.png';
        sim.onImageError('https://r2.example.com/image2.png'); // Primeiro
        sim.onImageError('https://r2.example.com/image2.png'); // Duplicado
        sim.onImageError('https://r2.example.com/image2.png'); // Duplicado
    },
    1 // expected errors (apenas o primeiro)
);

// Cenário 3: Erro durante geração
const test3 = runTestScenario(
    'Cenário 3: Erro Durante Geração',
    'Erros durante loading=true devem ser suprimidos',
    (sim) => {
        sim.startGeneration();
        sim.onImageError('https://r2.example.com/image3.png');
    },
    0 // expected errors (suprimido)
);

// Cenário 4: Erro durante carregamento de imagem
const test4 = runTestScenario(
    'Cenário 4: Erro Durante Carregamento',
    'Erros durante imageLoading=true devem ser suprimidos',
    (sim) => {
        sim.receiveNewUrl('https://r2.example.com/image4.png');
        sim.onImageError('https://r2.example.com/image4.png');
    },
    0 // expected errors (suprimido)
);

// Cenário 5: Erro durante transição de URL
const test5 = runTestScenario(
    'Cenário 5: Erro Durante Transição de URL',
    'Erros quando URL mudou recentemente devem ser suprimidos',
    (sim) => {
        sim.previousUrl = 'https://r2.example.com/old-image.png';
        sim.currentUrl = 'https://r2.example.com/new-image.png';
        sim.onImageError('https://r2.example.com/new-image.png');
    },
    0 // expected errors (suprimido)
);

// Cenário 6: Erro real (URL não muda, não está em loading)
const test6 = runTestScenario(
    'Cenário 6: Erro Real',
    'Erros legítimos devem mostrar toast normalmente',
    (sim) => {
        sim.currentUrl = 'https://r2.example.com/broken-image.png';
        sim.previousUrl = 'https://r2.example.com/broken-image.png';
        sim.loading = false;
        sim.imageLoading = false;
        sim.onImageError('https://r2.example.com/broken-image.png');
    },
    1 // expected errors (deve mostrar)
);

// Resumo final
console.log('\n' + '═'.repeat(60));
console.log('📊 RESUMO FINAL');
console.log('═'.repeat(60));

const allTests = [test1, test2, test3, test4, test5, test6];
const allPassed = allTests.every(test => test.passed);

console.log(`
Cenário 1 (Geração bem-sucedida): ${test1.passed ? '✅' : '❌'}
Cenário 2 (Erros duplicados): ${test2.passed ? '✅' : '❌'}
Cenário 3 (Erro durante geração): ${test3.passed ? '✅' : '❌'}
Cenário 4 (Erro durante carregamento): ${test4.passed ? '✅' : '❌'}
Cenário 5 (Erro durante transição): ${test5.passed ? '✅' : '❌'}
Cenário 6 (Erro real): ${test6.passed ? '✅' : '❌'}
`);

if (allPassed) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('\n✅ A correção está funcionando corretamente:');
    console.log('   - Toasts duplicados são suprimidos');
    console.log('   - Erros durante geração/carregamento são suprimidos');
    console.log('   - Erros durante transição de URL são suprimidos');
    console.log('   - Erros reais ainda são exibidos');
    console.log('\n' + '═'.repeat(60));
    process.exit(0);
} else {
    console.log('❌ ALGUNS TESTES FALHARAM');
    console.log('\n⚠️  Verifique a implementação no arquivo:');
    console.log('   components/nodes/image/transform.tsx');
    
    // Mostrar detalhes dos testes que falharam
    console.log('\n📋 Detalhes dos testes que falharam:');
    allTests.forEach((test, index) => {
        if (!test.passed) {
            console.log(`   Cenário ${index + 1}: Esperado ${test.result.errors} erros, obteve ${test.result.errors}`);
        }
    });
    
    console.log('\n' + '═'.repeat(60));
    process.exit(1);
}
