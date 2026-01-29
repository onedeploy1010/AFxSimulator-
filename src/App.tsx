import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          AFx 模拟计算器
        </h1>
        <p className="text-gray-600 mb-8">
          多参数经济模型验证工具
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">系统状态</h2>
          <p className="text-green-600">✓ React 正常运行</p>
          <p className="text-green-600">✓ Tailwind CSS 正常</p>
        </div>
      </div>
    </div>
  );
}

export default App;
