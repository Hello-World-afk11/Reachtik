import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Pencil, Trash2, Check, X } from "lucide-react";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    membership_status: "Silver",
    is_active: true,
  });
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase.from("clients").select("*");

      if (user && user.email === "aarogyakarki8@gmail.com") {
        // Admin view → show all clients
        console.log("[Clients] Admin view — fetching all clients");
        query = query.order("id", { ascending: true });
      } else if (user && user.id) {
        // Client view → only own data
        console.log("[Clients] Client view — fetching clients for:", user.id);
        query = query.eq("profile_id", user.id);
      } else {
        // Fallback (no user logged in)
        console.log("[Clients] No user logged in — showing none");
        query = query.limit(0);
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log("[Clients] fetched rows:", data?.length ?? 0);
      setClients(data || []);
    } catch (err) {
      console.error("[Clients] fetch error:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchClients();
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const clientToInsert = user?.id
        ? { ...newClient, profile_id: user.id }
        : { ...newClient };

      const { error } = await supabase.from("clients").insert([clientToInsert]);
      if (error) throw error;

      setNewClient({
        name: "",
        email: "",
        phone: "",
        company: "",
        membership_status: "Silver",
        is_active: true,
      });
      fetchClients();
    } catch (err) {
      console.error("[Clients] add error:", err);
      alert("Failed to add client — see console for details.");
    }
  };

  const handleUpdateClient = async () => {
    try {
      const { error } = await supabase
        .from("clients")
        .update(editingClient)
        .eq("id", editingClient.id);
      if (error) throw error;
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      console.error("[Clients] update error:", err);
      alert("Update failed — check console.");
    }
  };

  const handleDeleteClient = async (id) => {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      fetchClients();
    } catch (err) {
      console.error("[Clients] delete error:", err);
      alert("Delete failed — check console.");
    }
  };

  const getMembershipStyle = (status) => {
    switch (status) {
      case "Gold":
        return "bg-amber-100 text-amber-700 border border-amber-300";
      case "Diamond":
        return "bg-indigo-100 text-indigo-700 border border-indigo-300";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-300";
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Clients</h2>

      <form
        onSubmit={handleAddClient}
        className="grid grid-cols-7 gap-2 mb-6 bg-white p-4 rounded-lg shadow"
      >
        <input
          type="text"
          placeholder="Name"
          value={newClient.name}
          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
          className="border border-gray-300 rounded-md px-2 py-1"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={newClient.email}
          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          className="border border-gray-300 rounded-md px-2 py-1"
          required
        />
        <input
          type="text"
          placeholder="Phone"
          value={newClient.phone}
          onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
          className="border border-gray-300 rounded-md px-2 py-1"
          required
        />
        <input
          type="text"
          placeholder="Company"
          value={newClient.company}
          onChange={(e) =>
            setNewClient({ ...newClient, company: e.target.value })
          }
          className="border border-gray-300 rounded-md px-2 py-1"
        />
        <select
          value={newClient.membership_status}
          onChange={(e) =>
            setNewClient({ ...newClient, membership_status: e.target.value })
          }
          className="border border-gray-300 rounded-md px-2 py-1"
        >
          <option>Silver</option>
          <option>Gold</option>
          <option>Diamond</option>
        </select>

        <div className="flex items-center justify-center space-x-2">
          <label className="text-sm text-gray-700">Active</label>
          <input
            type="checkbox"
            checked={newClient.is_active}
            onChange={(e) =>
              setNewClient({ ...newClient, is_active: e.target.checked })
            }
            className="h-4 w-4 text-blue-600"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      {loading && <div className="text-sm text-gray-500 mb-2">Loading clients…</div>}

      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-7 font-semibold border-b border-gray-300 px-4 py-2 text-gray-700">
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Company</span>
          <span>Membership</span>
          <span>Status</span>
          <span className="text-center">Actions</span>
        </div>

        {clients.map((client) => (
          <div
            key={client.id}
            className="grid grid-cols-7 items-center gap-2 border-b border-gray-200 px-4 py-2 hover:bg-gray-50 transition"
          >
            {editingClient?.id === client.id ? (
              <>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, name: e.target.value })
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-gray-900 bg-white"
                />
                <input
                  type="email"
                  value={editingClient.email}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      email: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-gray-900 bg-white"
                />
                <input
                  type="text"
                  value={editingClient.phone}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      phone: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-gray-900 bg-white"
                />
                <input
                  type="text"
                  value={editingClient.company}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      company: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-gray-900 bg-white"
                />
                <select
                  value={editingClient.membership_status}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      membership_status: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900"
                >
                  <option>Silver</option>
                  <option>Gold</option>
                  <option>Diamond</option>
                </select>

                <div className="flex items-center justify-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingClient.is_active}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        is_active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600"
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleUpdateClient}
                    className="text-green-600 hover:text-green-800"
                    title="Save"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setEditingClient(null)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-gray-900">{client.name}</span>
                <span className="text-gray-700">{client.email}</span>
                <span className="text-gray-700">{client.phone}</span>
                <span className="text-gray-700">{client.company}</span>
                <span
                  className={`px-2 py-1 rounded-full text-sm font-medium text-center w-fit ${getMembershipStyle(
                    client.membership_status
                  )}`}
                >
                  {client.membership_status}
                </span>
                <span
                  className={`${
                    client.is_active
                      ? "text-green-700 font-medium"
                      : "text-red-700 font-medium"
                  }`}
                >
                  {client.is_active ? "Active" : "Inactive"}
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {clients.length === 0 && !loading && (
          <div className="p-6 text-center text-gray-500">No clients found.</div>
        )}
      </div>
    </div>
  );
}