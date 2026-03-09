import React from 'react'

interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
            <h2 className="text-red-600 text-xl font-bold mb-4">页面崩溃了</h2>
            <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 overflow-auto whitespace-pre-wrap">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              className="mt-4 btn-primary"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
