// Error Handler - Centralized Error Management
// Provides consistent error responses and logging across the application

import { Logger } from "./logger.ts";
import { corsHeaders } from "../shared/cors.ts";

type ErrorCategory = 
  | 'VALIDATION_ERROR'
  | 'AI_SERVICE_ERROR' 
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

interface ErrorDetails {
  category: ErrorCategory;
  message: string;
  statusCode: number;
  requestId?: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  constructor(private logger: Logger) {}

  handleError(
    error: Error | unknown,
    category: ErrorCategory,
    statusCode: number,
    requestId?: string,
    context?: Record<string, any>
  ): Response {
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;

    const errorDetails: ErrorDetails = {
      category,
      message: errorMessage,
      statusCode,
      requestId,
      context
    };

    // Log error with appropriate level
    if (statusCode >= 500) {
      this.logger.error("Internal server error occurred", {
        ...errorDetails,
        stack: errorStack
      });
    } else if (statusCode >= 400) {
      this.logger.warn("Client error occurred", errorDetails);
    }

    // Determine user-friendly message
    const userMessage = this.getUserFriendlyMessage(category, errorMessage);

    // Create error response
    const responseBody = {
      success: false,
      error: {
        category,
        message: userMessage,
        requestId,
        timestamp: new Date().toISOString()
      },
      // Include additional details in development
      ...(Deno.env.get("ENVIRONMENT") === "development" && {
        debug: {
          originalMessage: errorMessage,
          context,
          stack: errorStack
        }
      })
    };

    return new Response(
      JSON.stringify(responseBody),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  private getUserFriendlyMessage(category: ErrorCategory, originalMessage: string): string {
    switch (category) {
      case 'VALIDATION_ERROR':
        return originalMessage; // Validation messages are already user-friendly
      
      case 'AI_SERVICE_ERROR':
        return "Our AI service is temporarily unavailable. Please try again in a few moments.";
      
      case 'DATABASE_ERROR':
        return "We're experiencing database issues. Please try again later.";
      
      case 'NETWORK_ERROR':
        return "Network connectivity issue. Please check your connection and try again.";
      
      case 'TIMEOUT_ERROR':
        return "The request took too long to process. Please try again.";
      
      case 'METHOD_NOT_ALLOWED':
        return "HTTP method not supported for this endpoint.";
      
      case 'INTERNAL_ERROR':
      default:
        return "An unexpected error occurred. Our team has been notified.";
    }
  }

  // Helper method for common validation errors
  createValidationError(errors: string[], requestId?: string): Response {
    return this.handleError(
      new Error(errors.join('; ')),
      'VALIDATION_ERROR',
      400,
      requestId
    );
  }

  // Helper method for AI service errors
  createAIServiceError(error: Error, requestId?: string): Response {
    return this.handleError(
      error,
      'AI_SERVICE_ERROR',
      503,
      requestId
    );
  }

  // Helper method for database errors
  createDatabaseError(error: Error, requestId?: string): Response {
    return this.handleError(
      error,
      'DATABASE_ERROR',
      500,
      requestId
    );
  }
}