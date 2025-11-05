import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Home, Users, BarChart3, FileText, LogOut } from "lucide-react";

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login"); // redirect to login page after logout
  };

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col justify-between">
      {/* Top Navigation */}
      <div>
        <div className="p-6 text-2xl font-bold text-gray-800">Cloud Agency</div>
        <nav className="flex flex-col space-y-2 px-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <Home size={18} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/clients")}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <Users size={18} />
            <span>Clients</span>
          </button>
          <button
            onClick={() => navigate("/campaigns")}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <BarChart3 size={18} />
            <span>Campaigns</span>
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <FileText size={18} />
            <span>Reports</span>
          </button>
        </nav>
      </div>

      {/* Bottom Profile/Logout Section */}
      <div className="border-t px-4 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}