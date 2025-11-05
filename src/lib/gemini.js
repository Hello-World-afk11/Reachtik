export async function getGeminiInsight(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "⚠️ Unable to connect to Gemini API.";
  }
}