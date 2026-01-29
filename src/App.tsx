import './index.css';
import { Suspense, lazy } from 'react';

const Dashboard = lazy(() => import('./pages/dashboard').then(m => ({ default: m.Dashboard })));

function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600">AFx 模拟计算器</h1>
        <p className="text-gray-500 mt-2">加载中...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}

export default App;
