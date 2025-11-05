import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from "recharts";
import { getGeminiInsight } from "@/lib/gemini";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // === State Variables ===
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [averageROI, setAverageROI] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [roiData, setRoiData] = useState([]);
  const [budgetRevenueData, setBudgetRevenueData] = useState([]);
  const [campaignPerformance, setCampaignPerformance] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [decliningClients, setDecliningClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [aiInsights, setAiInsights] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiChartData, setAiChartData] = useState([]);
  const [trendAlerts, setTrendAlerts] = useState({
    topTrending: [],
    declining: [],
    summary: "",
  });
  const [aiPrediction, setAiPrediction] = useState("");

  // --- REPORTS specific states (ADDED) ---
  const [clientCampaigns, setClientCampaigns] = useState([]);
  const [clientAIInsight, setClientAIInsight] = useState("");
  const [loadingClientAI, setLoadingClientAI] = useState(false);
  const reportRef = useRef(null);

  // === Fetch Data ===
  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const { data: campaignData } = await supabase.from("campaigns").select("*");
    const { data: clientData } = await supabase.from("clients").select("*");

    if (campaignData) {
      setCampaigns(campaignData);
      calculateMetrics(campaignData);
      calculateCharts(campaignData);
      generateAIInsights(campaignData);
      generateAIChartData(campaignData);
      detectTrendsAndAlerts(campaignData);
      generateAIPrediction(campaignData);
    }

    if (clientData) {
      const enriched = clientData.map((client) => {
        const clientCampaigns = campaignData.filter(
          (c) => c.client_id === client.id
        );
        const totalRevenue = clientCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const totalBudget = clientCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
        const roi = clientCampaigns.length > 0
          ? ((clientCampaigns.reduce(
              (sum, c) => sum + ((c.revenue - c.budget) / c.budget) * 100 || 0,
              0
            ) / clientCampaigns.length)).toFixed(2)
          : 0;
        return { ...client, totalRevenue, totalBudget, roi, campaigns: clientCampaigns };
      });

      const sorted = [...enriched].sort((a, b) => b.roi - a.roi);
      setClients(enriched);
      setTopClients(sorted.slice(0, 2));
      setDecliningClients(sorted.slice(-2));
    }
  }

  // === Core Calculations ===
  function calculateMetrics(data) {
    const totalRev = data.reduce((sum, c) => sum + (c.revenue || 0), 0);
    const totalBud = data.reduce((sum, c) => sum + (c.budget || 0), 0);
    const avgROI = data.length > 0
      ? (data.reduce((sum, c) => sum + ((c.revenue - c.budget) / c.budget) * 100 || 0, 0) / data.length).toFixed(2)
      : 0;
    const active = data.filter((c) => c.status === "Ongoing").length;

    setTotalRevenue(totalRev);
    setTotalBudget(totalBud);
    setAverageROI(avgROI);
    setActiveCampaigns(active);
  }

  function calculateCharts(data) {
    const roi = data.map((c, i) => ({
      name: c.name || `Campaign ${i + 1}`,
      roi: ((c.revenue - c.budget) / c.budget) * 100 || 0,
    }));
    setRoiData(roi);

    const budgetVsRevenue = data.map((c, i) => ({
      name: c.name || `Campaign ${i + 1}`,
      budget: c.budget,
      revenue: c.revenue,
    }));
    setBudgetRevenueData(budgetVsRevenue);

    const performance = Object.values(
      data.reduce((acc, c) => {
        const platform = c.platform || "Unknown";
        if (!acc[platform]) acc[platform] = { platform, budget: 0, revenue: 0 };
        acc[platform].budget += c.budget || 0;
        acc[platform].revenue += c.revenue || 0;
        return acc;
      }, {})
    );
    setCampaignPerformance(performance);
  }

  async function generateAIInsights(data = campaigns) {
    if (!data || data.length === 0) return;
    setLoadingAI(true);
    try {
      const total = data.length;
      const avgROI = total > 0
        ? (data.reduce((sum, c) => sum + ((c.revenue - c.budget) / c.budget) * 100 || 0, 0) / total).toFixed(2)
        : 0;
      const top = [...data].sort((a, b) => b.roi - a.roi)[0];
      const worst = [...data].sort((a, b) => a.roi - b.roi)[0];

      const prompt = `
You are an AI marketing strategist. Analyze these metrics:
- Total campaigns: ${total}
- Average ROI: ${avgROI}%
- Best performer: ${top?.name || "N/A"}
- Lowest performer: ${worst?.name || "N/A"}
Write 3–4 sentences suggesting improvement strategies.`;

      const insight = await getGeminiInsight(prompt);
      setAiInsights(insight || "No insight generated.");
    } catch {
      setAiInsights("⚠️ Unable to generate insights at the moment.");
    } finally {
      setLoadingAI(false);
    }
  }

  async function generateAIPrediction(data = campaigns) {
    if (!data.length) return;
    try {
      const avgROI = (
        data.reduce((sum, c) => sum + ((c.revenue - c.budget) / c.budget) * 100, 0) /
        data.length
      ).toFixed(2);
      const prompt = `
Analyze this marketing data and forecast the ROI trend for next month.
Average ROI now: ${avgROI}%. Predict the next month's ROI range and one short suggestion to improve.`;
      const prediction = await getGeminiInsight(prompt);
      setAiPrediction(prediction);
    } catch (err) {
      console.error(err);
      setAiPrediction("⚠️ Prediction unavailable.");
    }
  }

  function detectTrendsAndAlerts(data) {
    if (!data || data.length === 0) return;
    const enriched = data.map((c) => ({
      ...c,
      roi: ((c.revenue - c.budget) / c.budget) * 100 || 0,
    }));
    const topTrending = [...enriched].sort((a, b) => b.roi - a.roi).slice(0, 2);
    const declining = [...enriched].sort((a, b) => a.roi - b.roi).slice(0, 2);
    const summary = `Top campaigns: ${topTrending.map((c) => c.name).join(", ")} are performing well. 
However, ${declining.map((c) => c.name).join(", ")} show underperformance. Focus on improving creative strategy.`;
    setTrendAlerts({ topTrending, declining, summary });
  }

  function generateAIChartData(data) {
    const summary = data.map((c, i) => ({
      name: c.name || `Campaign ${i + 1}`,
      roi: ((c.revenue - c.budget) / c.budget) * 100 || 0,
      budget: c.budget,
    }));
    setAiChartData(summary);
  }

  // === Reports helpers (ADDED) ===
  async function generateClientAIInsight(client, campaignsForClient = []) {
    setLoadingClientAI(true);
    setClientAIInsight("Generating AI insight...");
    try {
      const totalCampaigns = campaignsForClient.length;
      const avgROI =
        totalCampaigns > 0
          ? (
              campaignsForClient.reduce((sum, c) => {
                const b = c.budget || 0;
                const r = c.revenue || 0;
                return sum + (b ? ((r - b) / b) * 100 : 0);
              }, 0) / totalCampaigns
            ).toFixed(2)
          : "0.00";

      const campaignSummaries = campaignsForClient
        .map(
          (c) =>
            `- ${c.name || "unnamed"} (${c.platform || "Unknown"}): budget ${c.budget || 0}, revenue ${c.revenue || 0}, ROI ${
              c.budget ? ((((c.revenue || 0) - c.budget) / c.budget) * 100).toFixed(2) : "0.00"
            }%`
        )
        .join("\n");

      const prompt = `
You are an AI marketing analyst. Provide a crisp client-level insight (3-4 short sentences) for the client:
Name: ${client.name}
Email: ${client.email}
Total campaigns: ${totalCampaigns}
Average ROI: ${avgROI}%

Their campaigns:
${campaignSummaries}

Give:
1) A short summary of performance,
2) Two practical recommendations to improve ROI (one tactical, one strategic).
Keep it short and copy-friendly.
      `;

      let insight = "No insight generated.";
      if (typeof getGeminiInsight === "function") {
        try {
          insight = (await getGeminiInsight(prompt)) || insight;
        } catch (err) {
          console.error("getGeminiInsight error:", err);
          insight = "⚠️ AI error generating insight. Check API/key.";
        }
      } else {
        insight = "AI helper not found. Add getGeminiInsight in /lib/gemini to enable live AI insights.";
      }

      setClientAIInsight(insight);
    } catch (err) {
      console.error("generateClientAIInsight error:", err);
      setClientAIInsight("⚠️ Failed to generate AI insight.");
    } finally {
      setLoadingClientAI(false);
    }
  }

  // Download PDF for selected client (includes charts + AI insight)
  const downloadPdfForClient = async () => {
    if (!selectedClient) {
      alert("Please select a client first.");
      return;
    }
    try {
      const el = reportRef.current;
      if (!el) {
        alert("Report element not found.");
        return;
      }

      // ensure charts are fully rendered; wait shortly
      await new Promise((res) => setTimeout(res, 250));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      let heightLeft = imgHeight - (pageHeight - margin * 2);

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - heightLeft;
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      const safeName = (selectedClient.name || "client").replace(/\s+/g, "-");
      pdf.save(`${safeName}_Report.pdf`);
    } catch (err) {
      console.error("downloadPdfForClient error:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  // === UI Layout ===
  return (
    <div className="p-6 space-y-6">
      {/* ==== Tabs ==== */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: "overview", label: "Overview" },
          { id: "performance", label: "Performance" },
          { id: "ai", label: "AI Insights" },
          { id: "reports", label: "Reports" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              activeTab === tab.id
                ? "bg-purple-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== Overview Tab ===== */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500">Total Budget</p>
              <p className="text-2xl font-semibold">${totalBudget.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500">Average ROI</p>
              <p className="text-2xl font-semibold text-purple-600">{averageROI}%</p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-semibold text-orange-600">{activeCampaigns}</p>
            </div>
          </div>

          {/* ROI Chart + Budget vs Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-4 bg-white rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-2">ROI Trend</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={roiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="roi" stroke="#8884d8" name="ROI (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-2">Campaign Budget vs Revenue</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={budgetRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Performance Tab ===== */}
      {activeTab === "performance" && (
        <>
          {/* Campaign Performance Breakdown */}
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Campaign Performance Breakdown</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={campaignPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Summary Cards */}
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Platform Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignPerformance.map((p, i) => {
                const avgROI = p.budget > 0 ? (((p.revenue - p.budget) / p.budget) * 100).toFixed(2) : 0;
                return (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 border shadow-sm hover:shadow-md">
                    <h3 className="font-semibold">{p.platform}</h3>
                    <p>Budget: ${p.budget.toLocaleString()}</p>
                    <p>Revenue: ${p.revenue.toLocaleString()}</p>
                    <p>ROI: {avgROI}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client Overview */}
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Client Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...topClients, ...decliningClients].map((client, i) => (
                <div
                  key={`${client.id || i}-${client.name}`}
                  className={`p-4 rounded-lg ${
                    topClients.includes(client)
                      ? "bg-green-50 hover:bg-green-100"
                      : "bg-red-50 hover:bg-red-100"
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.email}</p>
                  <p className="text-sm">ROI: {client.roi}%</p>
                  <p className="text-sm">Revenue: ${client.totalRevenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== AI Insights Tab ===== */}
      {activeTab === "ai" && (
        <>
          {/* AI Insights */}
          <div className="p-6 bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-sm border border-purple-100">
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-semibold text-purple-700">AI Insights</h2>
              <button
                onClick={() => {
                  generateAIInsights();
                  generateAIChartData(campaigns);
                  generateAIPrediction();
                }}
                disabled={loadingAI}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  loadingAI
                    ? "bg-purple-200 text-gray-600 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {loadingAI ? "Generating..." : "Regenerate"}
              </button>
            </div>
            <div className="text-gray-700 bg-white rounded-xl p-4 border mb-4">
              <p>{aiInsights || "No insights yet."}</p>
            </div>

            {/* AI Summary Chart */}
            <div className="h-[250px] bg-white rounded-xl p-3 border">
              <ResponsiveContainer width="99%" height="100%">
                <LineChart data={aiChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="roi" stroke="#8b5cf6" name="ROI (%)" />
                  <Line type="monotone" dataKey="budget" stroke="#06b6d4" name="Budget ($)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Trend Prediction */}
          <div className="p-6 bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-sm border border-blue-100">
            <h2 className="text-lg font-semibold text-blue-700 mb-2">
              🔮 AI Trend Prediction
            </h2>
            <p className="text-gray-700 whitespace-pre-line">
              {aiPrediction || "Analyzing next month's ROI trend..."}
            </p>
          </div>

          {/* Trends & Alerts */}
          <div className="p-6 bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-sm border border-blue-100">
            <h2 className="text-lg font-semibold text-blue-700 mb-3">📊 Trends & Alerts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-green-600">Top Trending</h3>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  {trendAlerts.topTrending.map((c) => (
                    <li key={c.name}>{c.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-red-600">Declining Campaigns</h3>
                <ul className="text-sm text-gray-700 list-disc ml-4">
                  {trendAlerts.declining.map((c) => (
                    <li key={c.name}>{c.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-gray-700">{trendAlerts.summary}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Reports Tab (ADDED, lives inside Dashboard) ===== */}
      {activeTab === "reports" && (
        <div ref={reportRef} className="space-y-6">
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-3">📄 Generate Client Report</h2>
            <select
              className="border rounded-lg p-2 w-full mb-4"
              value={selectedClient?.id || ""}
              onChange={(e) => {
                const client = clients.find((c) => String(c.id) === String(e.target.value));
                setSelectedClient(client || null);
                const campaignsForClient = campaigns.filter((c) => String(c.client_id) === String(e.target.value));
                setClientCampaigns(campaignsForClient);
                setClientAIInsight("");
              }}
            >
              <option value="">Select a Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedClient && (
              <>
                <div className="bg-gray-50 p-4 rounded-xl mb-4 border">
                  <h3 className="text-xl font-semibold">{selectedClient.name}</h3>
                  <p>Email: {selectedClient.email}</p>
                  <p>Total Budget: ${selectedClient.totalBudget?.toLocaleString()}</p>
                  <p>Total Revenue: ${selectedClient.totalRevenue?.toLocaleString()}</p>
                  <p>ROI: {selectedClient.roi}%</p>
                </div>

                {/* Campaign Data */}
                <div className="p-4 bg-white rounded-2xl shadow-sm border">
                  <h3 className="font-semibold mb-2">Client Campaigns</h3>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {clientCampaigns.map((c) => {
                      const roi = c.budget ? (((c.revenue || 0) - c.budget) / c.budget) * 100 : 0;
                      return (
                        <li key={c.id}>
                          {c.name} — {c.platform} | Budget: ${c.budget || 0} | Revenue: ${(c.revenue || 0)} | ROI:{" "}
                          {roi.toFixed(2)}%
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Chart */}
                <div className="p-4 bg-white rounded-2xl shadow-sm border">
                  <h3 className="font-semibold mb-2">ROI Chart</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="99%" height="100%">
                      <LineChart data={clientCampaigns.map((c, i) => ({
                        name: c.name || `Campaign ${i + 1}`,
                        roi: c.budget ? (((c.revenue || 0) - c.budget) / c.budget) * 100 : 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="roi" stroke="#8b5cf6" name="ROI (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="p-4 bg-white rounded-2xl shadow-sm border">
                  <div className="flex justify-between mb-3">
                    <h3 className="font-semibold text-purple-700">
                      AI Insight for {selectedClient.name}
                    </h3>
                    <button
                      onClick={() => generateClientAIInsight(selectedClient, clientCampaigns)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      {loadingClientAI ? "Generating..." : "Generate Insight"}
                    </button>
                  </div>
                  <p className="text-gray-700 whitespace-pre-line">
                    {clientAIInsight || "No insight yet."}
                  </p>
                </div>

                {/* Download Button */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={downloadPdfForClient}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Download Report (PDF)
                  </button>
                </div>
              </>
            )}

            {!selectedClient && (
              <div className="text-gray-600 mt-2">
                Choose a client to preview and download a personalized report (includes charts + AI insights).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}