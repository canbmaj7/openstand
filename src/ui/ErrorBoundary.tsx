import { Component, type ReactNode } from 'react'
import { reportError } from '../errorReports'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    reportError(error, 'react')
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="error-boundary" role="alert">
        <p>Something went wrong. Reload the page.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
