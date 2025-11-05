import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    name: "",
    platform: "",
    budget: "",
    revenue: "",
    ongoing: false,
    start_date: "",
    end_date: "",
    client_id: "",
  });
  const [editingId, setEditingId] = useState(null);

  // Load campaigns and clients
  useEffect(() => {
    fetchClients();
    fetchCampaigns();
  }, []);

  async function fetchClients() {
    const { data, error } = await supabase.from("clients").select("id, name");
    if (error) console.error("Error fetching clients:", error);
    else setClients(data || []);
  }

  async function fetchCampaigns() {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, platform, budget, revenue, ongoing, start_date, end_date, clients(name)")
      .order("id", { ascending: false });
    if (error) console.error("Error fetching campaigns:", error);
    else setCampaigns(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const campaignData = {
      name: form.name.trim(),
      platform: form.platform.trim(),
      budget: parseFloat(form.budget) || 0,
      revenue: form.ongoing ? null : parseFloat(form.revenue) || 0,
      ongoing: form.ongoing,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      client_id: form.client_id,
    };

    if (editingId) {
      const { error } = await supabase
        .from("campaigns")
        .update(campaignData)
        .eq("id", editingId);
      if (error) console.error("Error updating campaign:", error);
    } else {
      const { error } = await supabase.from("campaigns").insert([campaignData]);
      if (error) console.error("Error adding campaign:", error);
    }

    resetForm();
    fetchCampaigns();
  }

  function resetForm() {
    setForm({
      name: "",
      platform: "",
      budget: "",
      revenue: "",
      ongoing: false,
      start_date: "",
      end_date: "",
      client_id: "",
    });
    setEditingId(null);
  }

  function handleEdit(campaign) {
    setForm({
      name: campaign.name,
      platform: campaign.platform,
      budget: campaign.budget,
      revenue: campaign.revenue || "",
      ongoing: campaign.ongoing,
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
      client_id: campaign.client_id,
    });
    setEditingId(campaign.id);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) console.error("Error deleting campaign:", error);
    fetchCampaigns();
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Campaigns</h2>

      {/* Campaign Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-sm mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Campaign Name"
            className="border p-2 rounded-lg w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Platform"
            className="border p-2 rounded-lg w-full"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Budget"
            className="border p-2 rounded-lg w-full"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Revenue"
            className="border p-2 rounded-lg w-full disabled:bg-gray-100"
            value={form.revenue}
            onChange={(e) => setForm({ ...form, revenue: e.target.value })}
            disabled={form.ongoing}
          />
          <label className="flex items-center space-x-2 col-span-1 md:col-span-3">
            <input
              type="checkbox"
              checked={form.ongoing}
              onChange={(e) => setForm({ ...form, ongoing: e.target.checked })}
            />
            <span>Ongoing Campaign</span>
          </label>
          <input
            type="date"
            className="border p-2 rounded-lg w-full"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
          <input
            type="date"
            className="border p-2 rounded-lg w-full"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            placeholder="End Date"
          />
          <select
            className="border p-2 rounded-lg w-full"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            required
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-4 mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {editingId ? "Update Campaign" : "Add Campaign"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Campaign Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200 rounded-lg shadow-sm text-sm md:text-base">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              {[
                "Name",
                "Client",
                "Platform",
                "Budget",
                "Revenue",
                "Ongoing",
                "Start Date",
                "End Date",
                "Actions",
              ].map((header) => (
                <th key={header} className="border p-3 text-left whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="border p-3">{c.name}</td>
                <td className="border p-3">{c.clients?.name || "N/A"}</td>
                <td className="border p-3">{c.platform}</td>
                <td className="border p-3">${c.budget}</td>
                <td className="border p-3">
                  {c.ongoing ? "—" : `$${c.revenue || 0}`}
                </td>
                <td className="border p-3">
                  {c.ongoing ? "Yes" : "No"}
                </td>
                <td className="border p-3 whitespace-nowrap">
                  {c.start_date || "—"}
                </td>
                <td className="border p-3 whitespace-nowrap">
                  {c.end_date || "—"}
                </td>
                <td className="border p-3 flex flex-wrap gap-2 justify-start">
                  <button
                    onClick={() => handleEdit(c)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  className="text-center p-4 text-gray-500"
                >
                  No campaigns found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}