import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
} else {
  document.body.innerHTML = '<h1 style="color:red;padding:20px;">Error: Root element not found</h1>';
}
