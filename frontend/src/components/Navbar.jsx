import { useNavigate } from "react-router-dom";
import { clearTokens } from "../api/auth";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    clearTokens();
    navigate("/");
  };

  return (
    <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-white p-1"
          aria-label="Open menu"
        >
          ☰
        </button>
        <h1 className="text-white text-lg sm:text-xl font-bold truncate">
          Production RAG Chatbot
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={toggleTheme}
          className="text-white p-2 rounded-lg hover:bg-slate-700"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="text-white p-2 rounded-lg hover:bg-slate-700"
          title="Profile & settings"
        >
          👤
        </button>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-3 sm:px-4 py-2 rounded text-white text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
