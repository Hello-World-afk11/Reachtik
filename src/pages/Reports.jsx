import React from "react";

export default function Reports() {
  console.log("✅ Reports component mounted");
  return (
    <div style={{ padding: "40px", backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "32px", color: "#222" }}>✅ Reports Page Working!</h1>
      <p>If you see this, the route and render are connected.</p>
    </div>
  );
}