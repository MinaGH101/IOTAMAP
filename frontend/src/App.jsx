import { useState } from "react";
import MapView from "./MapView";
import UploadPage from "./UploadPage";
import "./App.css";

function App() {
  const [showMap, setShowMap] = useState(false);
  const [mapReloadKey, setMapReloadKey] = useState(0);

  function openMap() {
    setMapReloadKey((current) => current + 1);
    setShowMap(true);
  }

  return (
    <div className="app">
      {showMap ? (
        <MapView reloadKey={mapReloadKey} />
      ) : (
        <UploadPage onOpenMap={openMap} />
      )}
    </div>
  );
}

export default App;
