import { useState, useEffect } from "react";
import GovtBreadcrumb from "@/components/govt/GovtBreadcrumb";
import GovtTable from "@/components/govt/GovtTable";
import { agristackAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const AgristackRegistry = () => {
  const { toast } = useToast();
  const [farmerId, setFarmerId] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [stats, setStats] = useState({
    total_registered: 0,
    total_verified: 0,
    pending_verification: 0,
    linked_to_tracesafe: 0
  });

  const [farmersList, setFarmersList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, farmersRes] = await Promise.all([
        agristackAPI.getStats(),
        agristackAPI.getFarmers({ limit: 10 })
      ]);
      setStats(statsRes.data);
      setFarmersList(farmersRes.data.farmers);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSearch = async () => {
    if (!farmerId) {
      toast({
        title: "Input Required",
        description: "Please enter a Farmer ID to search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setShowResult(true);
    setSearchResult(null);

    try {
      const response = await agristackAPI.verifyFarmer(farmerId);
      if (response.data.exists) {
        setSearchResult(response.data.farmer);
      } else {
        setSearchResult(null);
        toast({
          title: "Not Found",
          description: "Farmer ID not found in registry",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Search failed", error);
      toast({
        title: "Error",
        description: "Failed to search farmer registry",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const registryStatsColumns = [
    { key: "metric", header: "Metric" },
    { key: "value", header: "Count" },
  ];

  const registryStatsData = [
    { metric: "Total Farmers Registered", value: stats.total_registered.toLocaleString() },
    { metric: "Total Verified", value: stats.total_verified.toLocaleString() },
    { metric: "Pending Verification", value: stats.pending_verification.toLocaleString() },
    { metric: "Linked to TraceSafe", value: stats.linked_to_tracesafe.toLocaleString() },
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
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
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
            <button
              className="govt-btn bg-govt-green hover:bg-govt-green/90"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {showResult && searchResult && (
        <div className="govt-section">
          <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">Farmer Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Farmer ID:</span>
                <span className="text-sm">{searchResult.farmer_id}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Name:</span>
                <span className="text-sm">{searchResult.name}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Land:</span>
                <span className="text-sm">{searchResult.land}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Crops:</span>
                <span className="text-sm">{searchResult.crops}</span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Registry Status:</span>
                <span className={`text-sm ${searchResult.verified ? 'status-verified' : 'status-pending'}`}>
                  {searchResult.registry_status}
                </span>
              </div>
              <div className="flex border-b border-border pb-2">
                <span className="font-medium w-40 text-sm">Verification:</span>
                <span className={`text-sm ${searchResult.verified ? 'status-verified' : 'status-pending'}`}>
                  {searchResult.verified ? 'Verified' : 'Pending'}
                </span>
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
          Statistics as of {new Date().toLocaleDateString()} | Data Source: AgriStack Portal
        </p>
      </div>

      <div className="govt-section">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <h2 className="text-base font-semibold m-0">Registered Farmers List</h2>
          <div>
            <button className="govt-btn-secondary">Download List</button>
          </div>
        </div>
        {isLoadingList ? (
          <div className="text-center py-4">Loading data...</div>
        ) : (
          <GovtTable
            columns={[
              { key: "farmer_id", header: "Farmer ID" },
              { key: "name", header: "Name" },
              { key: "land", header: "Land" },
              { key: "crops", header: "Crops" },
              { key: "verified", header: "Verified" },
              { key: "registry_status", header: "Registry Status" },
            ]}
            data={farmersList.map((f: any) => ({ ...f, verified: f.verified ? "Yes" : "No" }))}
          />
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Showing {farmersList.length} records | Data Source: AgriStack Portal
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
