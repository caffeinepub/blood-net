import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import AMDashboard from "../dashboards/AMDashboard";
import CEODashboard from "../dashboards/CEODashboard";
import DMDashboard from "../dashboards/DMDashboard";
import UserDashboard from "../dashboards/UserDashboard";

export default function DashboardPage() {
  const { session } = useAuth();

  const renderDashboard = () => {
    switch (session?.role) {
      case "ceo":
        return <CEODashboard />;
      case "dm":
        return <DMDashboard />;
      case "am":
        return <AMDashboard />;
      case "user":
        return <UserDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return <Layout>{renderDashboard()}</Layout>;
}
