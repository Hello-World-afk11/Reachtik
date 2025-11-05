import Sidebar from "../components/Sidebar"

export default function DashboardLayout({ children }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  )
}