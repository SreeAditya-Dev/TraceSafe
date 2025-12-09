import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold">TraceSafe</h1>
          <p className="text-sm text-primary-foreground/80">Food Traceability Platform - Admin Dashboard</p>
        </div>
      </header>

      <div className="bg-govt-blue-light border-b border-border py-2 px-6">
        <p className="text-xs text-center text-muted-foreground max-w-6xl mx-auto">
          Government of India | Ministry of Agriculture and Farmers Welfare | Department of Food Safety
        </p>
      </div>

      <main className="max-w-6xl mx-auto p-6">
        <div className="govt-section">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-border">Administration Panel</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select a module from the options below to access government integration dashboards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/govt/enam" className="block no-underline">
              <div className="border border-border p-4 hover:bg-muted/50">
                <h3 className="font-semibold text-primary mb-2">e-NAM Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Access commodity price information and batch tracking data synchronized with the electronic National Agriculture Market.
                </p>
              </div>
            </Link>

            <Link to="/govt/agristack" className="block no-underline">
              <div className="border border-border p-4 hover:bg-muted/50">
                <h3 className="font-semibold text-govt-green mb-2">AgriStack Registry</h3>
                <p className="text-sm text-muted-foreground">
                  View farmer registry information and verification status linked with the AgriStack digital infrastructure.
                </p>
              </div>
            </Link>

            <Link to="/govt/fssai" className="block no-underline">
              <div className="border border-border p-4 hover:bg-muted/50">
                <h3 className="font-semibold text-govt-orange mb-2">FSSAI Compliance</h3>
                <p className="text-sm text-muted-foreground">
                  Check food safety compliance status, license verification, and recall notices from FSSAI.
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="govt-section mt-6">
          <h2 className="text-base font-semibold mb-3 pb-2 border-b border-border">Quick Links</h2>
          <ul className="list-none p-0 m-0 space-y-2">
            <li>
              <Link to="/govt/enam" className="text-sm text-primary hover:underline">
                e-NAM Commodity & Batch Information Dashboard
              </Link>
            </li>
            <li>
              <Link to="/govt/agristack" className="text-sm text-primary hover:underline">
                AgriStack Farmer Registry Overview
              </Link>
            </li>
            <li>
              <Link to="/govt/fssai" className="text-sm text-primary hover:underline">
                FSSAI Food Traceability Compliance View
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-muted border border-border">
          <h3 className="text-sm font-semibold mb-2">Important Notice</h3>
          <p className="text-xs text-muted-foreground">
            This platform is a demonstration interface for the TraceSafe Food Traceability System. 
            All data displayed is for demonstration purposes only. For official government services, 
            please visit the respective government portals.
          </p>
        </div>
      </main>

      <footer className="mt-8 p-4 border-t border-border bg-muted text-center">
        <p className="text-xs text-muted-foreground">
          Content on this website is published and managed by TraceSafe Platform | National Informatics Centre
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Last Updated: 09-12-2024
        </p>
      </footer>
    </div>
  );
};

export default Index;
