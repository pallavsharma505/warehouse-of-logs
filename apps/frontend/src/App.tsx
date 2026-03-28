import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LogStream from "./pages/LogStream";
import Docs from "./pages/Docs";
import ApiKeys from "./pages/ApiKeys";

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-8">
          <h1 className="text-lg font-bold text-white tracking-tight">
            📦 WarehouseOfLogs
          </h1>
          <div className="flex gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/logs"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`
              }
            >
              Log Stream
            </NavLink>            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`
              }
            >
              Docs
            </NavLink>
            <NavLink
              to="/keys"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`
              }
            >
              API Keys
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<LogStream />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/keys" element={<ApiKeys />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
