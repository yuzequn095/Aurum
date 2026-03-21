import {
  ServiceUnavailableException,
  type HttpExceptionOptions,
} from '@nestjs/common';
import type {
  ConnectedFinanceProviderErrorDetails,
  ConnectedFinanceProviderKey,
} from '@aurum/core';
import { getProviderNotConfiguredGuidance } from '@aurum/core';

export class ProviderNotConfiguredException extends ServiceUnavailableException {
  constructor(
    provider: Extract<ConnectedFinanceProviderKey, 'PLAID' | 'COINBASE'>,
    missingConfig: string[],
    options?: HttpExceptionOptions,
  ) {
    const guidance = getProviderNotConfiguredGuidance(provider);
    const response: ConnectedFinanceProviderErrorDetails = {
      statusCode: 503,
      code: 'PROVIDER_NOT_CONFIGURED',
      provider,
      message: `${provider} backend provider is not configured in this environment.`,
      userMessage: guidance.body,
      missingConfig,
    };

    super(response, options);
  }
}
