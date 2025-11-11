import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    platform: "",
    budget: "",
    revenue: "",
    status: "Ongoing",
    start_date: "",
    end_date: "",
    client_id: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
  }, []);

  // Fetch all clients for dropdown
  async function fetchClients() {
    const { data, error } = await supabase.from("clients").select("id, name");
    if (error) console.error("Error fetching clients:", error);
    else setClients(data);
  }

  // Fetch all campaigns with client names
  async function fetchCampaigns() {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, platform, budget, revenue, status, start_date, end_date, clients(name)")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching campaigns:", error);
    } else {
      setCampaigns(
        data.map((c) => ({
          ...c,
          client_name: c.clients?.name || "Unknown",
        }))
      );
    }
    setLoading(false);
  }

  // Add a new campaign
  async function addCampaign(e) {
    e.preventDefault();

    const { name, platform, budget, revenue, status, start_date, end_date, client_id } = newCampaign;
    if (!name || !platform || !budget || !start_date || !client_id) {
      alert("Please fill in all required fields.");
      return;
    }

    const insertData = {
      name,
      platform,
      budget: parseFloat(budget),
      revenue: status === "Ongoing" ? null : parseFloat(revenue || 0),
      status,
      start_date,
      end_date: end_date || null,
      client_id,
    };

    const { error } = await supabase.from("campaigns").insert([insertData]);
    if (error) {
      console.error("Error adding campaign:", error);
      alert("Failed to add campaign.");
    } else {
      alert("Campaign added successfully!");
      setNewCampaign({
        name: "",
        platform: "",
        budget: "",
        revenue: "",
        status: "Ongoing",
        start_date: "",
        end_date: "",
        client_id: "",
      });
      fetchCampaigns();
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Campaigns</h1>

      {/* Add Campaign Form */}
      <form onSubmit={addCampaign} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Campaign Name"
          value={newCampaign.name}
          onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
          className="p-2 border rounded w-full"
          required
        />
        <input
          type="text"
          placeholder="Platform"
          value={newCampaign.platform}
          onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
          className="p-2 border rounded w-full"
          required
        />
        <input
          type="number"
          placeholder="Budget"
          value={newCampaign.budget}
          onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
          className="p-2 border rounded w-full"
          required
        />
        <input
          type="number"
          placeholder="Revenue"
          value={newCampaign.revenue}
          onChange={(e) => setNewCampaign({ ...newCampaign, revenue: e.target.value })}
          className="p-2 border rounded w-full"
          disabled={newCampaign.status === "Ongoing"}
        />

        <select
          value={newCampaign.status}
          onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
          className="p-2 border rounded w-full"
        >
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={newCampaign.client_id}
          onChange={(e) => setNewCampaign({ ...newCampaign, client_id: e.target.value })}
          className="p-2 border rounded w-full"
          required
        >
          <option value="">Select Client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={newCampaign.start_date}
          onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
          className="p-2 border rounded w-full"
          required
        />
        <input
          type="date"
          value={newCampaign.end_date}
          onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
          className="p-2 border rounded w-full"
          placeholder="End Date (optional)"
        />

        <button
          type="submit"
          className="col-span-1 md:col-span-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Add Campaign
        </button>
      </form>

      {/* Campaigns Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {loading ? (
          <p className="p-4">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="p-4">No campaigns found.</p>
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3 border">Campaign Name</th>
                <th className="p-3 border">Platform</th>
                <th className="p-3 border">Client</th>
                <th className="p-3 border">Budget</th>
                <th className="p-3 border">Revenue</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Start Date</th>
                <th className="p-3 border">End Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{c.name}</td>
                  <td className="p-3 border">{c.platform}</td>
                  <td className="p-3 border">{c.client_name}</td>
                  <td className="p-3 border">${c.budget}</td>
                  <td className="p-3 border">{c.revenue ? `$${c.revenue}` : "-"}</td>
                  <td className="p-3 border">{c.status}</td>
                  <td className="p-3 border">{c.start_date}</td>
                  <td className="p-3 border">{c.end_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}