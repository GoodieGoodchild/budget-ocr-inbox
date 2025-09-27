import React from 'react'
import { log } from '../lib/logger'

export default class ErrorBoundary extends React.Component<{children: React.ReactNode},{hasError: boolean}> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: any, info: any) {
    log.error('React render error', { error: String(error), info })
  }
  render() {
    if (this.state.hasError) {
      return <div className="card border-red-300">⚠️ Something went wrong. Check Logs tab.</div>
    }
    return this.props.children
  }
}
