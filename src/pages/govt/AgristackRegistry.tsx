import { useState } from "react";
import GovtBreadcrumb from "@/components/govt/GovtBreadcrumb";
import GovtTable from "@/components/govt/GovtTable";
import { farmerRegistry, sampleFarmer, stateOptions, farmerRecords } from "@/data/govtData";

const AgristackRegistry = () => {
  const [farmerId, setFarmerId] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [showResult, setShowResult] = useState(false);

  const handleSearch = () => {
    setShowResult(true);
  };

  const registryStatsColumns = [
    { key: "metric", header: "Metric" },
    { key: "value", header: "Count" },
  ];

  const registryStatsData = [
    { metric: "Total Farmers Registered", value: farmerRegistry.totalRegistered.toLocaleString() },
    { metric: "Total Verified", value: farmerRegistry.totalVerified.toLocaleString() },
    { metric: "Pending Verification", value: farmerRegistry.pendingVerification.toLocaleString() },
    { metric: "Linked to TraceSafe", value: farmerRegistry.linkedToTraceSafe.toLocaleString() },
  ];

  return (
    <div>
      <GovtBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Government Modules", href: "/govt/agristack" },
          { label: "AgriStack Registry" },
        ]}
      />

      <div className="govt-header bg-govt-green">
        <h1 className="text-xl font-semibold m-0">AgriStack – Farmer Registry Overview</h1>
      </div>

      <div className="govt-info-box" style={{ backgroundColor: "hsl(var(--govt-green-light))", borderColor: "hsl(var(--govt-green) / 0.3)" }}>
        <p className="m-0 text-sm">
          AgriStack is the unified digital infrastructure for agriculture in India. This page provides access to farmer registry 
          information linked with the TraceSafe traceability platform.
        </p>
      </div>

      <div className="govt-section">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">Farmer Search Panel</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">Farmer ID</label>
            <input
              type="text"
              className="govt-input"
              placeholder="Enter Farmer ID"
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">State</label>
            <select
              className="govt-select w-full"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Select State</option>
              {stateOptions.slice(1).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">District</label>
            <input
              type="text"
              className="govt-input"
              placeholder="Enter District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Village</label>
            <input
              type="text"
              className="govt-input"
              placeholder="Enter Village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="govt-btn bg-govt-green hover:bg-govt-green/90" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>
      </div>

      {showResult && (
        <div className="govt-section">
          <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">Farmer Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Farmer ID:</span>
                <span className="text-sm">{sampleFarmer.farmerId}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Name:</span>
                <span className="text-sm">{sampleFarmer.name}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">State:</span>
                <span className="text-sm">{sampleFarmer.state}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">District:</span>
                <span className="text-sm">{sampleFarmer.district}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Village:</span>
                <span className="text-sm">{sampleFarmer.village}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Landholding:</span>
                <span className="text-sm">{sampleFarmer.landholding}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Crops:</span>
                <span className="text-sm">{sampleFarmer.crops}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Registration Status:</span>
                <span className="text-sm status-verified">{sampleFarmer.registrationStatus}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Verification Status:</span>
                <span className="text-sm status-verified">{sampleFarmer.verificationStatus}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Registration Date:</span>
                <span className="text-sm">{sampleFarmer.registrationDate}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="govt-btn-secondary">Print Profile</button>
            <button className="govt-btn-secondary">Download PDF</button>
          </div>
        </div>
      )}

      <div className="govt-section">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <h2 className="text-base font-semibold m-0">Registry Statistics</h2>
          <div>
            <button className="govt-btn-secondary">Export Data</button>
          </div>
        </div>
        <GovtTable columns={registryStatsColumns} data={registryStatsData} />
        <p className="text-xs text-muted-foreground mt-2">
          Statistics as of 09-12-2024 | Data Source: AgriStack Portal
        </p>
      </div>

      <div className="govt-section">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <h2 className="text-base font-semibold m-0">Registered Farmers List</h2>
          <div>
            <button className="govt-btn-secondary">Download List</button>
          </div>
        </div>
        <GovtTable
          columns={[
            { key: "farmer_id", header: "Farmer ID" },
            { key: "name", header: "Name" },
            { key: "land", header: "Land" },
            { key: "crops", header: "Crops" },
            { key: "verified", header: "Verified" },
            { key: "registry_status", header: "Registry Status" },
          ]}
          data={farmerRecords.map(f => ({ ...f, verified: f.verified ? "Yes" : "No" }))}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Showing {farmerRecords.length} records | Data Source: AgriStack Portal
        </p>
      </div>

      <div className="mt-6 p-3 bg-muted border border-border">
        <p className="text-xs text-muted-foreground m-0 italic">
          Generated for demonstration only. Actual farmer data is protected under data privacy regulations.
        </p>
      </div>
    </div>
  );
};

export default AgristackRegistry;
