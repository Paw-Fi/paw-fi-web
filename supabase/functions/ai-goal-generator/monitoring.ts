// AI Goal Generator Monitoring - PRODUCTION BULLETPROOF VERSION
// Comprehensive monitoring, metrics, and alerting system

interface OperationMetrics {
  operationId: string;
  goalType: string;
  userId: string | null;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'failure' | 'in_progress';
  errorCategory?: string;
  errorMessage?: string;
  businessMetrics?: {
    targetAmount: number;
    monthsToGoal: number;
    monthlyRequired: number;
    milestonesCount: number;
    insightsCount: number;
  };
  validationMetrics?: {
    normalizationTime: number;
    businessValidationTime: number;
    structuralValidationTime: number;
    normalizationIssues: number;
    businessWarnings: number;
    structuralErrors: number;
  };
  aiMetrics?: {
    geminiResponseTime: number;
    functionCallUsed: boolean;
    responseSize: number;
    tokenEstimate: number;
  };
  databaseMetrics?: {
    profileCreationTime: number;
    goalCreationTime: number;
    milestonesCreationTime: number;
    insightsCreationTime: number;
    totalDbTime: number;
  };
}

class MonitoringSystem {
  private static instance: MonitoringSystem;
  private operations: Map<string, OperationMetrics> = new Map();
  private successCount = 0;
  private failureCount = 0;
  private readonly version = "bulletproof-v2.0";

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  // Start operation tracking
  startOperation(goalType: string, userId: string | null): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metrics: OperationMetrics = {
      operationId,
      goalType,
      userId: userId || 'guest',
      startTime: Date.now(),
      status: 'in_progress'
    };

    this.operations.set(operationId, metrics);
    
    console.log(`📊 [MONITOR] Operation started: ${operationId}`, {
      goalType,
      userId: userId || 'guest',
      timestamp: new Date().toISOString(),
      version: this.version
    });

    return operationId;
  }

  // Track AI generation metrics
  trackAIGeneration(operationId: string, metrics: {
    responseTime: number;
    functionCallUsed: boolean;
    responseSize: number;
    tokenEstimate: number;
  }): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.aiMetrics = {
        geminiResponseTime: metrics.responseTime,
        functionCallUsed: metrics.functionCallUsed,
        responseSize: metrics.responseSize,
        tokenEstimate: metrics.tokenEstimate
      };

      console.log(`🤖 [MONITOR] AI generation tracked: ${operationId}`, {
        responseTime: `${metrics.responseTime}ms`,
        functionCallUsed: metrics.functionCallUsed,
        responseSize: `${metrics.responseSize} chars`,
        tokenEstimate: metrics.tokenEstimate,
        performance: this.categorizePerformance(metrics.responseTime, 'ai_generation')
      });
    }
  }

  // Track validation metrics
  trackValidation(operationId: string, metrics: {
    normalizationTime: number;
    businessValidationTime: number;
    structuralValidationTime: number;
    normalizationIssues: number;
    businessWarnings: number;
    structuralErrors: number;
  }): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.validationMetrics = metrics;

      const totalValidationTime = metrics.normalizationTime + 
                                 metrics.businessValidationTime + 
                                 metrics.structuralValidationTime;

      console.log(`✅ [MONITOR] Validation tracked: ${operationId}`, {
        normalizationTime: `${metrics.normalizationTime}ms`,
        businessValidationTime: `${metrics.businessValidationTime}ms`,
        structuralValidationTime: `${metrics.structuralValidationTime}ms`,
        totalTime: `${totalValidationTime}ms`,
        issues: {
          normalization: metrics.normalizationIssues,
          businessWarnings: metrics.businessWarnings,
          structuralErrors: metrics.structuralErrors
        },
        performance: this.categorizePerformance(totalValidationTime, 'validation')
      });

      // Alert on high normalization issues
      if (metrics.normalizationIssues > 5) {
        this.triggerAlert('high_normalization_issues', operationId, {
          issueCount: metrics.normalizationIssues,
          operation: operation
        });
      }

      // Alert on structural errors
      if (metrics.structuralErrors > 0) {
        this.triggerAlert('structural_validation_failure', operationId, {
          errorCount: metrics.structuralErrors,
          operation: operation
        });
      }
    }
  }

  // Track database operations
  trackDatabase(operationId: string, metrics: {
    profileCreationTime: number;
    goalCreationTime: number;
    milestonesCreationTime: number;
    insightsCreationTime: number;
  }): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      const totalDbTime = metrics.profileCreationTime + 
                          metrics.goalCreationTime + 
                          metrics.milestonesCreationTime + 
                          metrics.insightsCreationTime;

      operation.databaseMetrics = { ...metrics, totalDbTime };

      console.log(`💾 [MONITOR] Database operations tracked: ${operationId}`, {
        profileCreation: `${metrics.profileCreationTime}ms`,
        goalCreation: `${metrics.goalCreationTime}ms`,
        milestonesCreation: `${metrics.milestonesCreationTime}ms`,
        insightsCreation: `${metrics.insightsCreationTime}ms`,
        totalTime: `${totalDbTime}ms`,
        performance: this.categorizePerformance(totalDbTime, 'database')
      });

      // Alert on slow database operations
      if (totalDbTime > 5000) { // 5 seconds
        this.triggerAlert('slow_database_operations', operationId, {
          totalTime: totalDbTime,
          operation: operation
        });
      }
    }
  }

  // Track business metrics
  trackBusinessMetrics(operationId: string, metrics: {
    targetAmount: number;
    monthsToGoal: number;
    monthlyRequired: number;
    milestonesCount: number;
    insightsCount: number;
  }): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.businessMetrics = metrics;

      console.log(`📈 [MONITOR] Business metrics tracked: ${operationId}`, {
        targetAmount: `$${metrics.targetAmount.toLocaleString()}`,
        timeline: `${metrics.monthsToGoal} months`,
        monthlyRequired: `$${metrics.monthlyRequired.toLocaleString()}`,
        milestonesCount: metrics.milestonesCount,
        insightsCount: metrics.insightsCount,
        goalCategory: this.categorizeGoalAmount(metrics.targetAmount),
        savingsRate: this.categorizeSavingsRate(metrics.monthlyRequired, operation.goalType)
      });
    }
  }

  // Complete operation successfully
  completeOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.status = 'success';
      this.successCount++;

      console.log(`🎉 [MONITOR] Operation completed successfully: ${operationId}`, {
        duration: `${operation.duration}ms`,
        goalType: operation.goalType,
        targetAmount: operation.businessMetrics?.targetAmount,
        performance: this.categorizePerformance(operation.duration, 'total_operation'),
        successRate: this.getSuccessRate(),
        version: this.version
      });

      // Generate comprehensive success summary
      this.logSuccessMetrics(operation);

      // Alert on slow operations
      if (operation.duration > 30000) { // 30 seconds
        this.triggerAlert('slow_operation', operationId, {
          duration: operation.duration,
          operation: operation
        });
      }

      // Clean up completed operation after logging
      setTimeout(() => {
        this.operations.delete(operationId);
      }, 60000); // Keep for 1 minute for debugging
    }
  }

  // Handle operation failure
  failOperation(operationId: string, errorCategory: string, errorMessage: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.status = 'failure';
      operation.errorCategory = errorCategory;
      operation.errorMessage = errorMessage;
      this.failureCount++;

      console.error(`🚨 [MONITOR] Operation failed: ${operationId}`, {
        duration: `${operation.duration}ms`,
        errorCategory,
        errorMessage,
        goalType: operation.goalType,
        userId: operation.userId,
        failureRate: this.getFailureRate(),
        version: this.version
      });

      // Generate comprehensive failure analysis
      this.logFailureMetrics(operation);

      // Trigger alerts based on error category
      this.triggerErrorAlert(errorCategory, operationId, operation);

      // Clean up failed operation after logging
      setTimeout(() => {
        this.operations.delete(operationId);
      }, 300000); // Keep for 5 minutes for debugging
    }
  }

  // Get current system health
  getSystemHealth(): any {
    const successRate = this.getSuccessRate();
    const currentOperations = this.operations.size;
    const avgDuration = this.getAverageOperationDuration();

    const health = {
      status: this.determineHealthStatus(successRate, currentOperations),
      metrics: {
        successRate: `${successRate.toFixed(2)}%`,
        totalOperations: this.successCount + this.failureCount,
        successCount: this.successCount,
        failureCount: this.failureCount,
        currentOperations,
        averageDuration: `${avgDuration.toFixed(0)}ms`
      },
      alerts: this.getActiveAlerts(),
      version: this.version,
      timestamp: new Date().toISOString()
    };

    console.log(`❤️ [MONITOR] System health check:`, health);
    return health;
  }

  // Private helper methods
  private categorizePerformance(duration: number, operationType: string): string {
    const thresholds = {
      ai_generation: { excellent: 2000, good: 5000, slow: 10000 },
      validation: { excellent: 100, good: 500, slow: 1000 },
      database: { excellent: 1000, good: 3000, slow: 5000 },
      total_operation: { excellent: 5000, good: 15000, slow: 30000 }
    };

    const threshold = thresholds[operationType as keyof typeof thresholds] || thresholds.total_operation;

    if (duration <= threshold.excellent) return 'excellent';
    if (duration <= threshold.good) return 'good';
    if (duration <= threshold.slow) return 'slow';
    return 'critical';
  }

  private categorizeGoalAmount(amount: number): string {
    if (amount < 10000) return 'small';
    if (amount < 100000) return 'medium';
    if (amount < 500000) return 'large';
    return 'very_large';
  }

  private categorizeSavingsRate(monthlyRequired: number, goalType: string): string {
    // This would ideally use user income, but we'll use reasonable estimates
    const estimatedIncome = 5000; // Default from normalization
    const rate = (monthlyRequired / estimatedIncome) * 100;

    if (rate < 10) return 'conservative';
    if (rate < 20) return 'moderate';
    if (rate < 30) return 'aggressive';
    return 'very_aggressive';
  }

  private getSuccessRate(): number {
    const total = this.successCount + this.failureCount;
    return total > 0 ? (this.successCount / total) * 100 : 100;
  }

  private getFailureRate(): number {
    return 100 - this.getSuccessRate();
  }

  private getAverageOperationDuration(): number {
    const completedOps = Array.from(this.operations.values()).filter(op => op.duration);
    if (completedOps.length === 0) return 0;
    
    const totalDuration = completedOps.reduce((sum, op) => sum + (op.duration || 0), 0);
    return totalDuration / completedOps.length;
  }

  private determineHealthStatus(successRate: number, currentOps: number): string {
    if (successRate >= 95 && currentOps < 10) return 'healthy';
    if (successRate >= 90 && currentOps < 20) return 'good';
    if (successRate >= 80 && currentOps < 50) return 'degraded';
    return 'critical';
  }

  private getActiveAlerts(): string[] {
    // In a real implementation, this would track active alerts
    return [];
  }

  private logSuccessMetrics(operation: OperationMetrics): void {
    console.log(`📊 [MONITOR] SUCCESS METRICS for ${operation.operationId}:`, {
      totalDuration: `${operation.duration}ms`,
      breakdown: {
        aiGeneration: operation.aiMetrics ? `${operation.aiMetrics.geminiResponseTime}ms` : 'N/A',
        validation: operation.validationMetrics ? 
          `${operation.validationMetrics.normalizationTime + operation.validationMetrics.businessValidationTime + operation.validationMetrics.structuralValidationTime}ms` : 'N/A',
        database: operation.databaseMetrics ? `${operation.databaseMetrics.totalDbTime}ms` : 'N/A'
      },
      businessImpact: {
        goalType: operation.goalType,
        targetAmount: operation.businessMetrics?.targetAmount || 'N/A',
        timeline: operation.businessMetrics?.monthsToGoal || 'N/A',
        complexity: {
          milestones: operation.businessMetrics?.milestonesCount || 0,
          insights: operation.businessMetrics?.insightsCount || 0
        }
      },
      quality: {
        normalizationIssues: operation.validationMetrics?.normalizationIssues || 0,
        businessWarnings: operation.validationMetrics?.businessWarnings || 0,
        aiQuality: operation.aiMetrics?.functionCallUsed ? 'structured' : 'unstructured'
      }
    });
  }

  private logFailureMetrics(operation: OperationMetrics): void {
    console.error(`💥 [MONITOR] FAILURE ANALYSIS for ${operation.operationId}:`, {
      failurePoint: operation.errorCategory,
      errorMessage: operation.errorMessage,
      partialProgress: {
        aiGeneration: !!operation.aiMetrics,
        validation: !!operation.validationMetrics,
        database: !!operation.databaseMetrics
      },
      context: {
        goalType: operation.goalType,
        userId: operation.userId,
        duration: `${operation.duration}ms`
      },
      debugInfo: {
        aiMetrics: operation.aiMetrics || 'not_reached',
        validationMetrics: operation.validationMetrics || 'not_reached',
        databaseMetrics: operation.databaseMetrics || 'not_reached'
      }
    });
  }

  private triggerAlert(alertType: string, operationId: string, context: any): void {
    console.warn(`🚨 [MONITOR] ALERT: ${alertType}`, {
      operationId,
      alertType,
      context,
      timestamp: new Date().toISOString(),
      version: this.version
    });

    // In production, this would send to monitoring service
    // Datadog, New Relic, custom webhook, etc.
  }

  private triggerErrorAlert(errorCategory: string, operationId: string, operation: OperationMetrics): void {
    const severity = this.determineErrorSeverity(errorCategory);
    
    console.error(`🔥 [MONITOR] ERROR ALERT: ${errorCategory}`, {
      severity,
      operationId,
      errorCategory,
      operation: {
        goalType: operation.goalType,
        userId: operation.userId,
        duration: operation.duration,
        errorMessage: operation.errorMessage
      },
      systemImpact: {
        currentFailureRate: this.getFailureRate(),
        recentFailures: this.failureCount
      },
      timestamp: new Date().toISOString(),
      version: this.version
    });
  }

  private determineErrorSeverity(errorCategory: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'validation': 'medium',
      'business_logic': 'medium',
      'ai_generation': 'high',
      'database': 'critical',
      'template': 'low',
      'unknown': 'high'
    };

    return severityMap[errorCategory] || 'high';
  }
}

// Export singleton instance
export const monitor = MonitoringSystem.getInstance();

// Export monitoring utilities
export function createOperationTimer() {
  const startTime = Date.now();
  return {
    elapsed: () => Date.now() - startTime,
    elapsedMs: () => `${Date.now() - startTime}ms`
  };
}

export function logPerformanceMetric(operation: string, duration: number, metadata?: any) {
  console.log(`⚡ [PERFORMANCE] ${operation}: ${duration}ms`, metadata || {});
}

export function logBusinessEvent(event: string, data: any) {
  console.log(`📈 [BUSINESS] ${event}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
}