export type ConsumptionMode = 'AHORRO' | 'NORMAL' | 'INTENSIVO';

export interface ConsumptionBudget {
  maxReportsPerWeek: number;
  maxManualReportsPerDay: number;
  maxConcurrentAiRequests: number;
  maxRetriesPerAxis: number;
  maxSearchQueriesPerReport: number;
  maxAiCallsPerReport: number;
  maxOutputTokensPerAxis: number;
  maxFinalReportOutputTokens: number;
  targetCostPerReportEur: number;
  targetMonthlyCostEur: number;
}

export interface ReportConsumptionMetrics {
  aiCallsUsed: number;
  searchQueriesUsed: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  totalTokensUsed: number;
  retryCount: number;
  estimatedCostEur: number;
}

// Pre-defined budgets per mode with strict central limits
export const CONSUMPTION_BUDGETS: Record<ConsumptionMode, ConsumptionBudget> = {
  AHORRO: {
    maxReportsPerWeek: 1,
    maxManualReportsPerDay: 1,
    maxConcurrentAiRequests: 1,
    maxRetriesPerAxis: 1,
    maxSearchQueriesPerReport: 35,
    maxAiCallsPerReport: 12,
    maxOutputTokensPerAxis: 2500,
    maxFinalReportOutputTokens: 6000,
    targetCostPerReportEur: 0.25,
    targetMonthlyCostEur: 1.00,
  },
  NORMAL: {
    maxReportsPerWeek: 2,
    maxManualReportsPerDay: 2,
    maxConcurrentAiRequests: 1,
    maxRetriesPerAxis: 2,
    maxSearchQueriesPerReport: 50,
    maxAiCallsPerReport: 18,
    maxOutputTokensPerAxis: 4000,
    maxFinalReportOutputTokens: 8000,
    targetCostPerReportEur: 0.50,
    targetMonthlyCostEur: 2.00,
  },
  INTENSIVO: {
    maxReportsPerWeek: 4,
    maxManualReportsPerDay: 4,
    maxConcurrentAiRequests: 2,
    maxRetriesPerAxis: 3,
    maxSearchQueriesPerReport: 70,
    maxAiCallsPerReport: 25,
    maxOutputTokensPerAxis: 6000,
    maxFinalReportOutputTokens: 12000,
    targetCostPerReportEur: 1.00,
    targetMonthlyCostEur: 5.00,
  },
};

// Model pricing lookup table (Prices in EUR)
// Gemini 3.8 Flash / Flash Latest: ~$0.15/1M in (~0.14€), ~$0.60/1M out (~0.56€)
// Google Search Grounding: ~$35 / 1000 search queries (~32€ / 1000 searches = 0.032€/search)
export const MODEL_PRICING: Record<
  string,
  { inputPerMillionEur: number; outputPerMillionEur: number; searchPerThousandEur: number }
> = {
  'gemini-3.8-flash': {
    inputPerMillionEur: 0.14,
    outputPerMillionEur: 0.56,
    searchPerThousandEur: 32.0,
  },
  'gemini-flash-latest': {
    inputPerMillionEur: 0.14,
    outputPerMillionEur: 0.56,
    searchPerThousandEur: 32.0,
  },
  'gemini-3.1-flash-lite': {
    inputPerMillionEur: 0.07,
    outputPerMillionEur: 0.28,
    searchPerThousandEur: 32.0,
  },
  default: {
    inputPerMillionEur: 0.14,
    outputPerMillionEur: 0.56,
    searchPerThousandEur: 32.0,
  },
};

/**
 * Calculates estimated cost in Euros based on tokens and search queries
 */
export function calculateEstimatedCostEur(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  searchQueries: number
): number {
  const pricing = MODEL_PRICING[modelName] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillionEur;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillionEur;
  const searchCost = (searchQueries / 1_000) * pricing.searchPerThousandEur;
  const total = inputCost + outputCost + searchCost;
  return Math.round(total * 10000) / 10000; // 4 decimals precision
}

/**
 * Central tracker for active report generation consumption
 */
export class ExecutionMetricsTracker {
  public aiCallsUsed = 0;
  public searchQueriesUsed = 0;
  public inputTokensUsed = 0;
  public outputTokensUsed = 0;
  public retryCount = 0;
  public modelName: string;

  constructor(modelName = 'gemini-3.8-flash') {
    this.modelName = modelName;
  }

  public recordAiCall(options: {
    inputTokens?: number;
    outputTokens?: number;
    searchQueries?: number;
    isRetry?: boolean;
    modelUsed?: string;
  }): void {
    this.aiCallsUsed++;
    if (options.inputTokens && options.inputTokens > 0) {
      this.inputTokensUsed += options.inputTokens;
    }
    if (options.outputTokens && options.outputTokens > 0) {
      this.outputTokensUsed += options.outputTokens;
    }
    if (options.searchQueries && options.searchQueries > 0) {
      this.searchQueriesUsed += options.searchQueries;
    }
    if (options.isRetry) {
      this.retryCount++;
    }
    if (options.modelUsed) {
      this.modelName = options.modelUsed;
    }
  }

  public canMakeRequest(
    budget: ConsumptionBudget,
    isSynthesis = false
  ): { allowed: boolean; reason?: string } {
    if (this.aiCallsUsed >= budget.maxAiCallsPerReport) {
      return {
        allowed: false,
        reason: `Límite de llamadas a Gemini alcanzado (${this.aiCallsUsed}/${budget.maxAiCallsPerReport}).`,
      };
    }

    if (!isSynthesis && this.searchQueriesUsed >= budget.maxSearchQueriesPerReport) {
      return {
        allowed: false,
        reason: `Límite de consultas de búsqueda alcanzado (${this.searchQueriesUsed}/${budget.maxSearchQueriesPerReport}).`,
      };
    }

    return { allowed: true };
  }

  public getSnapshot(): ReportConsumptionMetrics {
    const totalTokens = this.inputTokensUsed + this.outputTokensUsed;
    const estimatedCost = calculateEstimatedCostEur(
      this.modelName,
      this.inputTokensUsed,
      this.outputTokensUsed,
      this.searchQueriesUsed
    );

    return {
      aiCallsUsed: this.aiCallsUsed,
      searchQueriesUsed: this.searchQueriesUsed,
      inputTokensUsed: this.inputTokensUsed,
      outputTokensUsed: this.outputTokensUsed,
      totalTokensUsed: totalTokens,
      retryCount: this.retryCount,
      estimatedCostEur: estimatedCost,
    };
  }
}
