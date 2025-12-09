import { Outlet } from "react-router-dom";
import GovtSidebar from "@/components/govt/GovtSidebar";

const GovtLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <GovtSidebar />
      <main className="flex-1 p-0">
        <div className="bg-primary text-primary-foreground py-2 px-6 text-xs border-b border-primary/20">
          Government of India | Ministry of Agriculture and Farmers Welfare
        </div>
        <div className="p-6">
          <Outlet />
        </div>
        <footer className="mt-8 p-4 border-t border-border bg-muted text-center text-xs text-muted-foreground">
          Content on this website is published and managed by TraceSafe Platform | National Informatics Centre
        </footer>
      </main>
    </div>
  );
};

export default GovtLayout;
