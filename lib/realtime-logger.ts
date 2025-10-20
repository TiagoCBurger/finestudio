/**
 * Structured logging utility for Supabase Realtime
 * Provides consistent logging format with environment-based log levels
 */

type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

class RealtimeLogger {
    private isDevelopment: boolean;
    private prefix = '🔴 [REALTIME]';

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    /**
     * Log info messages (only in development)
     */
    info(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            if (context) {
                console.log(`${this.prefix} ${message}`, context);
            } else {
                console.log(`${this.prefix} ${message}`);
            }
        }
    }

    /**
     * Log warning messages (always shown)
     */
    warn(message: string, context?: LogContext) {
        if (context) {
            console.warn(`${this.prefix} ⚠️ ${message}`, context);
        } else {
            console.warn(`${this.prefix} ⚠️ ${message}`);
        }
    }

    /**
     * Log error messages (always shown)
     */
    error(message: string, context?: LogContext) {
        if (context) {
            console.error(`${this.prefix} ❌ ${message}`, context);
        } else {
            console.error(`${this.prefix} ❌ ${message}`);
        }
    }

    /**
     * Log success messages (only in development)
     */
    success(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            if (context) {
                console.log(`${this.prefix} ✅ ${message}`, context);
            } else {
                console.log(`${this.prefix} ✅ ${message}`);
            }
        }
    }

    /**
     * Get the appropriate Supabase log level based on environment
     */
    getSupabaseLogLevel(): 'info' | 'error' {
        return this.isDevelopment ? 'info' : 'error';
    }

    /**
     * Create a timestamped context object
     */
    createContext(data: LogContext = {}): LogContext {
        return {
            ...data,
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
export const realtimeLogger = new RealtimeLogger();