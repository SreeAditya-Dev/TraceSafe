import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    section: "Government Modules",
    items: [
      { label: "e-NAM Dashboard", href: "/govt/enam" },
      { label: "AgriStack Registry", href: "/govt/agristack" },
      { label: "FSSAI Compliance", href: "/govt/fssai" },
    ],
  },
  {
    section: "Administration",
    items: [
      { label: "Dashboard Home", href: "/" },
    ],
  },
];

const GovtSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border bg-primary flex items-center gap-3">
        <img src="/android-chrome-192x192.png" alt="TraceSafe Logo" className="h-10 w-10 bg-white rounded-full p-1" />
        <div>
          <h1 className="text-lg font-semibold text-primary-foreground">TraceSafe</h1>
          <p className="text-xs text-primary-foreground/80">Admin Dashboard</p>
        </div>
      </div>
      <nav className="p-0">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-0">
            <div className="px-4 py-3 bg-govt-table-header border-b border-sidebar-border">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {section.section}
              </h2>
            </div>
            <ul className="list-none p-0 m-0">
              {section.items.map((item, itemIndex) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={itemIndex} className="border-b border-sidebar-border">
                    <Link
                      to={item.href}
                      className={`block px-4 py-3 text-sm no-underline ${isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium border-l-4 border-l-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 w-64 p-3 border-t border-sidebar-border bg-sidebar text-xs text-muted-foreground">
        National Informatics Centre
      </div>
    </aside>
  );
};

export default GovtSidebar;
