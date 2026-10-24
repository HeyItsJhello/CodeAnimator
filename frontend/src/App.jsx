import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AppPage from "./pages/AppPage";
import DownloadsPage from "./pages/DownloadsPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/downloads" element={<DownloadsPage />} />
    </Routes>
  );
}

export default App;
