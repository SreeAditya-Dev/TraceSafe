import { useState } from "react";
import GovtBreadcrumb from "@/components/govt/GovtBreadcrumb";
import GovtTable from "@/components/govt/GovtTable";
import {
  enamCommodityPrices,
  enamBatchData,
  commodityOptions,
  stateOptions,
} from "@/data/govtData";

const EnamDashboard = () => {
  const [selectedCommodity, setSelectedCommodity] = useState("All Commodities");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedDate, setSelectedDate] = useState("");

  const priceColumns = [
    { key: "market", header: "Market" },
    { key: "commodity", header: "Commodity" },
    { key: "minPrice", header: "Min Price (Rs/Qtl)" },
    { key: "maxPrice", header: "Max Price (Rs/Qtl)" },
    { key: "modalPrice", header: "Modal Price (Rs/Qtl)" },
    { key: "date", header: "Date" },
  ];

  const batchColumns = [
    { key: "batchId", header: "Batch ID" },
    { key: "commodity", header: "Commodity" },
    { key: "farmerName", header: "Farmer Name" },
    { key: "dispatchDate", header: "Dispatch Date" },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <span className={value === "Received" ? "status-received" : "status-pending"}>
          {value}
        </span>
      ),
    },
  ];

  const filteredPrices = enamCommodityPrices.filter((item) => {
    if (selectedCommodity !== "All Commodities" && item.commodity !== selectedCommodity) {
      return false;
    }
    return true;
  });

  const filteredBatches = enamBatchData.filter((item) => {
    if (selectedCommodity !== "All Commodities" && item.commodity !== selectedCommodity) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <GovtBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Government Modules", href: "/govt/enam" },
          { label: "e-NAM Dashboard" },
        ]}
      />

      <div className="govt-header">
        <h1 className="text-xl font-semibold m-0">e-NAM Commodity & Batch Information Dashboard</h1>
      </div>

      <div className="govt-info-box">
        <p className="m-0 text-sm">
          This page displays traceability data shared with the electronic National Agriculture Market (e-NAM). 
          The information presented is synchronized with the central e-NAM portal for commodity price discovery and batch tracking.
        </p>
      </div>

      <div className="govt-section">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">Filter Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium">Commodity</label>
            <select
              className="govt-select w-full"
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
            >
              {commodityOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">State</label>
            <select
              className="govt-select w-full"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              {stateOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Date</label>
            <input
              type="date"
              className="govt-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="govt-btn">Search</button>
          </div>
        </div>
      </div>

      <div className="govt-section">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <h2 className="text-base font-semibold m-0">Commodity Price Information</h2>
          <div>
            <button className="govt-btn-secondary mr-2">Print</button>
            <button className="govt-btn-secondary">Download</button>
          </div>
        </div>
        <GovtTable columns={priceColumns} data={filteredPrices} />
        <p className="text-xs text-muted-foreground mt-2">
          Source: e-NAM Portal | Last Updated: 09-12-2024
        </p>
      </div>

      <div className="govt-section">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <h2 className="text-base font-semibold m-0">TraceSafe Batch Data</h2>
          <div>
            <button className="govt-btn-secondary mr-2">Print</button>
            <button className="govt-btn-secondary">Download</button>
          </div>
        </div>
        <GovtTable columns={batchColumns} data={filteredBatches} />
        <p className="text-xs text-muted-foreground mt-2">
          Data synchronized from TraceSafe platform
        </p>
      </div>

      <div className="mt-6 p-3 bg-muted border border-border text-center">
        <p className="text-xs text-muted-foreground m-0">
          Data is for demonstration purposes only. This interface simulates integration with e-NAM portal.
        </p>
      </div>
    </div>
  );
};

export default EnamDashboard;
