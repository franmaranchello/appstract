import { useState } from "react";
import { vendorLaunchContext } from "./launch";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { NewVendorPage } from "../features/intake/NewVendorPage";
import { VendorDetailPage } from "../features/vendors/VendorDetailPage";
import { VendorsPage } from "../features/vendors/VendorsPage";
import { useVendorStore } from "../state/VendorStore";

export function App() {
  const [launch] = useState(() => vendorLaunchContext(window.location.href));
  const { storageUnavailable } = useVendorStore();
  return (
    <div className="app-shell">
      <header className="masthead">
        <Link className="wordmark" to="/vendors">
          <span className="brand-shape" />
          BAUHAUS
        </Link>
        <span className="product-label">Vendor approval / Procurement</span>
      </header>
      <nav className="appstract-context" aria-label="Appstract">
        <a href={launch.returnTo}>← Back to Appstract</a>
        <span>Vendor approval · v1 · From Dana’s vendor review pattern</span>
        <span>Sample data · Simulated research · {storageUnavailable ? "Unsaved session" : "Saved in this browser"}</span>
      </nav>
      {storageUnavailable && (
        <p role="alert" className="notice">
          Browser storage is unavailable or full. Changes stay in this tab and will be lost when you reload or close it.
        </p>
      )}
      {launch.invalid && (
        <p role="alert" className="appstract-launch-error">
          This launch is not supported. Showing the sample vendor app. Return to
          Appstract to open v1.
        </p>
      )}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/vendors" replace />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendors/new" element={<NewVendorPage />} />
          <Route path="/vendors/:vendorId" element={<VendorDetailPage />} />
          <Route path="*" element={<Navigate to="/vendors" replace />} />
        </Routes>
      </main>
    </div>
  );
}
