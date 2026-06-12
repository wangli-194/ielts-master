import { useState } from "react";
import { ApiKeyProvider, useApiKey } from "./utils/apiKey";
import SetupScreen from "./components/Setup/SetupScreen";
import Layout from "./components/Layout/Layout";
import Dashboard from "./components/Dashboard/Dashboard";
import Speaking from "./components/Speaking/Speaking";
import Reading from "./components/Reading/Reading";
import Vocab from "./components/Vocab/Vocab";
import Writing from "./components/Writing/Writing";
import Progress from "./components/Progress/Progress";

function AppInner() {
  const { configured } = useApiKey();
  const [currentView, setCurrentView] = useState("dashboard");

  if (!configured) return <SetupScreen />;

  const views = {
    dashboard: <Dashboard onNavigate={setCurrentView} />,
    speaking:  <Speaking />,
    reading:   <Reading />,
    vocab:     <Vocab />,
    writing:   <Writing />,
    progress:  <Progress />,
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {views[currentView]}
    </Layout>
  );
}

export default function App() {
  return (
    <ApiKeyProvider>
      <AppInner />
    </ApiKeyProvider>
  );
}
