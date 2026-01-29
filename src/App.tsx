import React, { useEffect, useState } from 'react';
import { Dashboard } from './pages/dashboard';

// 清除损坏的 localStorage 数据
function clearCorruptedStorage() {
  try {
    const data = localStorage.getItem('afx-simulation-storage');
    if (data) {
      const parsed = JSON.parse(data);
      // 检查数据结构是否完整
      if (!parsed?.state?.config?.tierConfigs || !parsed?.state?.lpPool) {
        console.log('Clearing corrupted storage data');
        localStorage.removeItem('afx-simulation-storage');
        return true;
      }
    }
  } catch (e) {
    console.log('Clearing invalid storage data');
    localStorage.removeItem('afx-simulation-storage');
    return true;
  }
  return false;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    localStorage.removeItem('afx-simulation-storage');
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'system-ui', textAlign: 'center' }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <p style={{ marginTop: '20px' }}>{this.state.error?.message}</p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              fontSize: '16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            清除数据并重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    // 启动时检查并清除损坏的数据
    if (clearCorruptedStorage()) {
      setKey(k => k + 1);
    }
  }, []);

  return (
    <ErrorBoundary key={key} onReset={() => setKey(k => k + 1)}>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
