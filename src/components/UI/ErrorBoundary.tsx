import React from 'react';

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen bg-gray-950 text-white p-8">
                    <div className="text-center max-w-md space-y-4">
                        <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
                        <p className="text-sm text-gray-400">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
