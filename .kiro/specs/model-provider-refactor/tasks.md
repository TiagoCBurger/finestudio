# Implementation Plan

- [ ] 0. SAFETY FIRST: Preserve existing functionality
  - [ ] 0.1 Create comprehensive backup of working code
    - Backup all existing provider implementations (KIE, OpenRouter)
    - Document current working behavior and API contracts
    - Create test suite that validates existing nano-banana and OpenRouter functionality
    - Establish baseline performance metrics
    - _Requirements: ALL (safety requirement)_

  - [ ] 0.2 Implement "new system disabled by default" pattern
    - Add feature flag ENABLE_UNIFIED_PROVIDERS with default value false
    - Ensure all new code is behind feature flags
    - Create runtime checks that use old system when flag is disabled
    - Add logging to track which system is being used
    - _Requirements: ALL (safety requirement)_

- [ ] 1. Simplify model configurations to essential models only
  - [ ] 1.1 Update image models to only include nano-banana models
    - Keep only `google/nano-banana` for text-to-image generation
    - Keep only `google/nano-banana-edit` for image-to-image when images are connected
    - Remove all other image models (FAL models, etc.)
    - Update model selection logic to show nano-banana-edit only when images are connected
    - _Requirements: 1.2, 2.4, 2.5, 4.2_

  - [ ] 1.2 Update text models to only include Google Gemini
    - Keep only `google/gemini-2.5-pro` for text generation via OpenRouter
    - Remove all other text models (GPT, Claude, etc.)
    - Update text model configuration to use single default model
    - _Requirements: 1.2, 4.2, 4.3_

  - [ ] 1.3 Disable video and audio model configurations temporarily
    - Disable video model configurations in lib/models/video/index.ts
    - Disable audio model functionality temporarily
    - Keep video and audio UI components for future use
    - Focus refactoring on image and text models only
    - _Requirements: 1.2, 4.2_

  - [ ] 1.4 Simplify provider configurations
    - Keep only KIE.ai provider for image models
    - Keep only OpenRouter provider for text models
    - Remove FAL.ai provider configurations temporarily
    - Update provider factory to handle only essential providers
    - _Requirements: 1.1, 1.3, 4.1_

- [ ] 2. Create unified type system and core interfaces
  - Create shared type definitions for essential model types (image, text only)
  - Define standardized interfaces for providers, models, and configurations
  - Implement error types and standardized error handling structures
  - Create common interfaces for generation input/output and job metadata
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.3, 6.1, 6.2_

- [ ] 3. Implement Model Registry system
  - [ ] 3.1 Create Model Registry core class
    - Write ModelRegistry class with static methods for model management
    - Implement model registration, retrieval, and filtering functionality
    - Add validation for model definitions and configuration compliance
    - Focus on image and text models only (nano-banana and gemini)
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 7.1_

  - [ ] 3.2 Create model configuration schema
    - Define ModelDefinition interface with capabilities and pricing
    - Implement ModelCapabilities for input/output type validation
    - Create PricingConfig for standardized cost structures
    - Support image-to-image detection for nano-banana-edit model
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.3 Implement model compatibility validation
    - Create NodeCompatibility system for connection rules
    - Implement validation logic for node type connections
    - Add logic to show nano-banana-edit only when images are connected
    - Add support for text-to-image (nano-banana) and image-to-image (nano-banana-edit) model types
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Create Provider Factory and base architecture
  - [ ] 4.1 Implement Provider Factory pattern
    - Create ProviderFactory class with caching and instantiation logic
    - Implement provider configuration management and validation
    - Add provider instance caching and lifecycle management
    - _Requirements: 1.1, 1.3, 1.4, 5.1, 5.2_

  - [ ] 4.2 Create Provider Base abstract class
    - Implement ProviderBase with common generation workflow
    - Add abstract methods for provider-specific implementations
    - Implement shared logic for job creation and state management
    - Create standardized input validation and error normalization
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 6.1, 6.2_

  - [ ] 4.3 Implement retry and error handling system
    - Create RetryManager with configurable retry strategies
    - Implement ErrorHandler for consistent error categorization
    - Add retry logic with exponential backoff and error type filtering
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 5. Refactor existing providers to use new architecture
  - [ ] 5.1 Refactor KIE provider implementation
    - Update KieImageProvider to extend new ProviderBase class
    - Migrate existing KIE-specific logic to new architecture
    - Implement KIE-specific API integration using new interfaces
    - Update webhook handling to use unified system
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 5.2, 5.5_

  - [ ] 5.2 Refactor OpenRouter provider implementation
    - Update OpenRouter provider to use new base architecture
    - Implement text model generation using unified interfaces
    - Add proper error handling and response normalization
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 5.2_

- [ ] 6. Implement unified webhook handler
  - [ ] 6.1 Create UnifiedWebhookHandler system
    - Implement centralized webhook processing for all providers
    - Add payload normalization for different provider formats
    - Create job status update logic with database integration
    - _Requirements: 3.2, 3.4, 5.5_

  - [ ] 6.2 Update webhook endpoints
    - Modify existing webhook routes to use unified handler
    - Add provider-specific payload processing while maintaining unified interface
    - Implement webhook signature verification and security measures
    - _Requirements: 3.2, 3.4, 5.5_

- [ ] 7. Update model configurations and registrations
  - [ ] 7.1 Migrate image model configurations
    - Convert nano-banana models to new configuration format
    - Register only google/nano-banana and google/nano-banana-edit in ModelRegistry
    - Add logic to show nano-banana-edit only when images are connected
    - Update model selection logic to use registry system
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ] 7.2 Migrate text model configurations
    - Convert google/gemini-2.5-pro to new configuration format
    - Add text model capabilities and pricing information
    - Register single text model with OpenRouter provider mapping
    - Set as default text model
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 8. Update node components to use new system
  - [ ] 8.1 Update image node components
    - Modify image transform components to use ModelRegistry
    - Update model selection logic to show nano-banana-edit only when images are connected
    - Integrate with new error handling and state management
    - Remove references to removed image models
    - _Requirements: 1.2, 2.1, 2.2, 6.5_

  - [ ] 8.2 Update text node components
    - Modify text transform components to use ModelRegistry
    - Update text model selection to use single gemini model
    - Integrate with new provider architecture
    - Remove model selection UI (single model)
    - _Requirements: 1.2, 2.1, 2.2, 6.5_

  - [ ] 8.3 Update model selector components
    - Create simplified ModelSelector component using ModelRegistry
    - Implement logic for image model selection based on connected inputs
    - Remove video and audio model selection options
    - _Requirements: 1.2, 4.1, 4.2_

- [ ] 9. Implement feature flags and backward compatibility (CRITICAL)
  - [ ] 9.1 Create feature flag system with safe defaults
    - Implement FeatureFlags interface with new system DISABLED by default
    - Add environment variable ENABLE_UNIFIED_PROVIDERS=false as default
    - Ensure existing nano-banana and OpenRouter continue working unchanged
    - Create runtime switches to toggle between old and new systems
    - _Requirements: 1.1, 1.2_

  - [ ] 9.2 Create backward compatibility adapters
    - Create adapter layer that wraps existing providers without changing them
    - Implement fallback logic: if new system fails, use old system
    - Maintain all existing API interfaces and function signatures
    - Add comprehensive logging to track which system is being used
    - _Requirements: 1.1, 1.2_

  - [ ] 9.3 Implement parallel system approach
    - Run new system alongside existing system (not replacing)
    - Add A/B testing capability to compare systems
    - Create validation layer to ensure both systems produce same results
    - Allow instant rollback to old system if issues occur
    - _Requirements: 1.1, 1.2_

- [ ]* 10. Create comprehensive test suite
  - [ ]* 10.1 Write unit tests for core components
    - Create tests for ModelRegistry functionality
    - Write tests for ProviderFactory and ProviderBase classes
    - Add tests for error handling and retry logic
    - _Requirements: 1.1, 1.4, 6.1, 6.2_

  - [ ]* 10.2 Write integration tests
    - Create end-to-end tests for generation workflows
    - Write tests for webhook processing and state updates
    - Add tests for provider compatibility and error scenarios
    - _Requirements: 3.1, 3.2, 3.3, 5.5_

  - [ ]* 10.3 Write provider-specific tests
    - Create tests for each provider implementation
    - Write tests for model configuration validation
    - Add tests for node component integration
    - _Requirements: 1.5, 4.1, 4.2, 4.3_

- [ ] 11. Update file organization and documentation
  - [ ] 11.1 Reorganize provider code structure
    - Create consistent directory structure for all providers
    - Separate client and server implementations properly
    - Centralize shared types and interfaces
    - _Requirements: 7.1, 7.2, 7.3, 5.1, 5.3_

  - [ ] 11.2 Update environment configuration
    - Consolidate environment variable handling
    - Add validation for required configuration
    - Update configuration documentation
    - _Requirements: 5.1, 5.4_

  - [ ]* 11.3 Create provider documentation
    - Document new provider architecture and patterns
    - Create migration guide for existing code
    - Add examples for adding new providers and models
    - _Requirements: 7.5_

- [ ] 12. Deploy and validate new system (SAFE DEPLOYMENT)
  - [ ] 12.1 Deploy with new system completely disabled
    - Deploy all new code with ENABLE_UNIFIED_PROVIDERS=false
    - Verify nano-banana and OpenRouter work exactly as before
    - Run comprehensive tests on existing functionality
    - Monitor for any regressions (should be zero)
    - _Requirements: 1.1, 1.2_

  - [ ] 12.2 Enable new system for single test model only
    - Create test environment with ENABLE_UNIFIED_PROVIDERS=true
    - Test with only one model (e.g., nano-banana) in controlled environment
    - Compare results between old and new systems
    - Ensure 100% compatibility before proceeding
    - _Requirements: 1.1, 1.2_

  - [ ] 12.3 Gradual rollout with instant rollback capability
    - Enable for internal testing only (specific user IDs)
    - Monitor error rates and performance metrics
    - Keep old system as primary, new system as secondary
    - Implement instant rollback mechanism if issues detected
    - _Requirements: 1.1, 1.2_

  - [ ] 12.4 Optional: Full migration (only after extensive validation)
    - Only proceed if new system proves 100% reliable
    - Maintain old system code for at least 30 days after migration
    - Keep rollback capability available
    - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3_

- [ ] 13. Create comprehensive developer documentation
  - [ ] 13.1 Create provider implementation guide
    - Document step-by-step process for adding new providers
    - Include code examples for extending ProviderBase class
    - Document webhook integration patterns and requirements
    - Provide templates for common provider types
    - _Requirements: 7.5_

  - [ ] 13.2 Create model registration guide
    - Document how to register new models in ModelRegistry
    - Explain model capability definitions and compatibility rules
    - Provide examples for different model types (text-to-image, image-to-image, text)
    - Document pricing configuration and parameter handling
    - _Requirements: 4.1, 4.2, 7.5_

  - [ ] 13.3 Create integration examples and best practices
    - Provide complete working examples for common scenarios
    - Document testing strategies for new providers and models
    - Include troubleshooting guide for common integration issues
    - Create checklist for provider and model validation
    - _Requirements: 7.5_