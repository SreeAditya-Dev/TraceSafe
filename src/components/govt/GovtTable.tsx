interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface GovtTableProps {
  columns: Column[];
  data: any[];
  caption?: string;
}

const GovtTable = ({ columns, data, caption }: GovtTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="govt-table">
        {caption && (
          <caption className="text-left text-sm text-muted-foreground mb-2 font-medium">
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GovtTable;
