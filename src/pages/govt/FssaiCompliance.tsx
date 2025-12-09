import { useState } from "react";
import GovtBreadcrumb from "@/components/govt/GovtBreadcrumb";
import GovtTable from "@/components/govt/GovtTable";
import { fssaiLicenseData, batchComplianceData, recallNotices } from "@/data/govtData";

const FssaiCompliance = () => {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [showLicenseResult, setShowLicenseResult] = useState(false);

  const handleLicenseCheck = () => {
    setShowLicenseResult(true);
  };

  const complianceColumns = [
    { key: "batchId", header: "Batch ID" },
    { key: "commodity", header: "Commodity" },
    {
      key: "riskAssessment",
      header: "Risk Assessment",
      render: (value: string) => {
        const colorClass = value === "Low" ? "text-accent" : value === "High" ? "text-destructive" : "text-warning";
        return <span className={colorClass}>{value}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => {
        let className = "";
        if (value === "Compliant") className = "status-compliant";
        else if (value === "Non-Compliant") className = "status-non-compliant";
        else className = "status-under-review";
        return <span className={className}>{value}</span>;
      },
    },
    { key: "lastUpdated", header: "Last Updated" },
  ];

  return (
    <div>
      <GovtBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Government Modules", href: "/govt/fssai" },
          { label: "FSSAI Compliance" },
        ]}
      />

      <div className="govt-header bg-govt-orange">
        <h1 className="text-xl font-semibold m-0">FSSAI – Food Traceability Compliance View</h1>
      </div>

      <div className="govt-info-box" style={{ backgroundColor: "hsl(var(--govt-orange-light))", borderColor: "hsl(var(--govt-orange) / 0.3)" }}>
        <p className="m-0 text-sm">
          Food Safety and Standards Authority of India (FSSAI) Traceability Compliance Module. 
          This interface provides compliance status of food batches tracked through the TraceSafe platform.
        </p>
      </div>

      <div className="govt-section">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">License Verification Panel</h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="block text-sm mb-1 font-medium">FSSAI License Number</label>
            <input
              type="text"
              className="govt-input"
              placeholder="Enter 14-digit FSSAI License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
          </div>
          <button className="govt-btn bg-govt-orange hover:bg-govt-orange/90" onClick={handleLicenseCheck}>
            Submit
          </button>
        </div>

        {showLicenseResult && (
          <div className="mt-4 p-4 border border-border bg-muted/30">
            <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-border">License Verification Result</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex">
                <span className="font-medium w-36 text-sm">License Number:</span>
                <span className="text-sm">{fssaiLicenseData.licenseNumber}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-36 text-sm">Entity Name:</span>
                <span className="text-sm">{fssaiLicenseData.entityName}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-36 text-sm">Entity Type:</span>
                <span className="text-sm">{fssaiLicenseData.entityType}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-36 text-sm">Status:</span>
                <span className="text-sm status-compliant font-medium">{fssaiLicenseData.status}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-36 text-sm">Issue Date:</span>
                <span className="text-sm">{fssaiLicenseData.issueDate}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-36 text-sm">Expiry Date:</span>
                <span className="text-sm">{fssaiLicenseData.expiryDate}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-36 text-sm">State:</span>
                <span className="text-sm">{fssaiLicenseData.state}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="govt-section">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <h2 className="text-base font-semibold m-0">Batch Compliance Status</h2>
          <div>
            <button className="govt-btn-secondary mr-2">Print Report</button>
            <button className="govt-btn-secondary">Download CSV</button>
          </div>
        </div>
        <GovtTable columns={complianceColumns} data={batchComplianceData} />
        <p className="text-xs text-muted-foreground mt-2">
          Compliance data synchronized from TraceSafe platform | Last Updated: 09-12-2024
        </p>
      </div>

      <div className="govt-section">
        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border text-destructive">
          Recall Notices
        </h2>
        <div className="space-y-0">
          {recallNotices.map((notice, index) => (
            <div key={index} className="p-3 border border-border border-t-0 first:border-t bg-muted/20">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-sm">Batch {notice.batchId}:</span>
                  <span className="text-sm ml-2">{notice.notice}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{notice.date}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          For detailed recall information, contact the concerned Food Safety Officer.
        </p>
      </div>

      <div className="mt-6 p-3 bg-muted border border-border text-center">
        <p className="text-xs text-muted-foreground m-0">
          This module is a simplified demonstration interface. For official FSSAI services, visit foscos.fssai.gov.in
        </p>
      </div>
    </div>
  );
};

export default FssaiCompliance;
