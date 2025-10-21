#!/usr/bin/env node

/**
 * Validation script: Check if kie-nano-banana model is properly configured
 * 
 * This script verifies that the KIE.ai Nano Banana model is correctly
 * configured in the image models configuration file.
 * 
 * Usage: node test-check-kie-in-models.js
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  targetFile: 'lib/models/image/index.ts',
  modelId: 'kie-nano-banana',
  expectedPatterns: {
    modelKey: "'kie-nano-banana'",
    label: 'Nano Banana (Kie.ai)',
    provider: 'providers.kie',
    enabled: /['"]kie-nano-banana['"][\s\S]*?enabled:\s*true/,
  },
};

/**
 * Validates the presence of required patterns in the file content
 * @param {string} content - File content to validate
 * @returns {Object} Validation results
 */
function validateModelConfiguration(content) {
  return {
    hasModelKey: content.includes(CONFIG.expectedPatterns.modelKey),
    hasLabel: content.includes(CONFIG.expectedPatterns.label),
    hasProvider: content.includes(CONFIG.expectedPatterns.provider),
    hasEnabled: CONFIG.expectedPatterns.enabled.test(content),
  };
}

/**
 * Extracts a code snippet containing the model configuration
 * @param {string} content - File content
 * @returns {string|null} Code snippet or null if not found
 */
function extractModelSnippet(content) {
  const match = content.match(/'kie-nano-banana'[\s\S]{0,500}/);
  return match ? match[0].substring(0, 400) + '...' : null;
}

/**
 * Prints validation results to console
 * @param {Object} results - Validation results
 */
function printResults(results) {
  console.log('📋 Resultados:');
  console.log('  ✓ Tem "kie-nano-banana":', results.hasModelKey ? '✅' : '❌');
  console.log('  ✓ Tem label "Nano Banana (Kie.ai)":', results.hasLabel ? '✅' : '❌');
  console.log('  ✓ Tem "providers.kie":', results.hasProvider ? '✅' : '❌');
  console.log('  ✓ Tem "enabled: true":', results.hasEnabled ? '✅' : '❌');
}

/**
 * Prints next steps for the user
 */
function printNextSteps() {
  console.log('\n📝 Próximos passos:');
  console.log('  1. Certifique-se de que o servidor Next.js foi reiniciado');
  console.log('  2. Faça hard refresh no navegador (Cmd+Shift+R)');
  console.log('  3. Abra o DevTools (F12) e vá para Console');
  console.log('  4. Clique em um nó de imagem');
  console.log('  5. Procure pelos logs [getEnabledImageModels] e [ModelSelector]');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Verificando se kie-nano-banana está no código...\n');

  try {
    // Resolve path relative to script location
    const indexPath = path.resolve(__dirname, CONFIG.targetFile);
    
    // Check if file exists
    try {
      await fs.access(indexPath);
    } catch {
      console.error(`❌ Erro: Arquivo não encontrado: ${indexPath}`);
      console.error('   Certifique-se de executar o script na raiz do projeto.');
      process.exit(1);
    }

    // Read file content
    const indexContent = await fs.readFile(indexPath, 'utf-8');

    // Validate configuration
    const results = validateModelConfiguration(indexContent);
    
    // Print results
    printResults(results);

    // Check if all validations passed
    const allValid = Object.values(results).every(Boolean);

    if (allValid) {
      console.log('\n✅ Modelo kie-nano-banana está configurado corretamente no código!');
      printNextSteps();
    } else {
      console.log('\n❌ Modelo kie-nano-banana NÃO está configurado corretamente!');
      console.log('\n💡 Dica: Verifique se o modelo foi adicionado ao arquivo:');
      console.log(`   ${CONFIG.targetFile}`);
    }

    // Show code snippet
    console.log('\n📄 Trecho do código (kie-nano-banana):');
    const snippet = extractModelSnippet(indexContent);
    if (snippet) {
      console.log(snippet);
    } else {
      console.log('   (Modelo não encontrado no código)');
    }

    // Exit with appropriate code
    process.exit(allValid ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Erro ao executar validação:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Execute main function
main();
