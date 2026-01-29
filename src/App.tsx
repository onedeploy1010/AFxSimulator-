import { useState, useEffect } from 'react';

function App() {
  const [error, setError] = useState<string | null>(null);
  const [Dashboard, setDashboard] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import('./pages/dashboard')
      .then((module) => {
        setDashboard(() => module.Dashboard);
      })
      .catch((err) => {
        console.error('Failed to load Dashboard:', err);
        setError(err.message || 'Failed to load Dashboard');
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error Loading App</h1>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!Dashboard) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading AFx Simulator...</h1>
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
