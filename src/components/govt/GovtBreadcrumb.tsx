import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface GovtBreadcrumbProps {
  items: BreadcrumbItem[];
}

const GovtBreadcrumb = ({ items }: GovtBreadcrumbProps) => {
  return (
    <div className="govt-breadcrumb">
      {items.map((item, index) => (
        <span key={index}>
          {item.href ? (
            <Link to={item.href}>{item.label}</Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-2">&gt;</span>}
        </span>
      ))}
    </div>
  );
};

export default GovtBreadcrumb;
