import React from 'react';
import styles from './Table.module.css'; // To be created
import Spinner from './Spinner'; // For loading state

export interface ColumnDefinition<T> {
  key: keyof T | string; // string for custom/derived columns
  title: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode; // Custom render function for a cell
  className?: string; // Class for the column (applied to th and td)
  headerClassName?: string; // Class specifically for th
  cellClassName?: string; // Class specifically for td
}

export interface TableProps<T extends { id: string | number }> { // Assuming items have an id for key
  columns: ColumnDefinition<T>[];
  data: T[];
  isLoading?: boolean;
  emptyText?: string;
  className?: string; // For the table element
  containerClassName?: string; // For the wrapper div
  // Add props for pagination, sorting, row selection etc. as needed
}

const Table = <T extends { id: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyText = "No data available",
  className = '',
  containerClassName = '',
}: TableProps<T>): React.ReactElement => { // Changed return type
  return (
    <div className={`${styles.tableContainer} ${containerClassName}`}>
      <table className={`${styles.tableBase} ${className}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th 
                key={String(col.key)} 
                className={`${styles.th} ${col.className || ''} ${col.headerClassName || ''}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className={styles.loadingCell}>
                <Spinner size="medium" />
                <span>Loading data...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr key={item.id} className={styles.tr}>
                {columns.map((col) => (
                  <td 
                    key={`${String(item.id)}-${String(col.key)}`}
                    className={`${styles.td} ${col.className || ''} ${col.cellClassName || ''}`}
                  >
                    {col.render 
                      ? col.render(item, rowIndex) 
                      : String(item[col.key as keyof T] ?? '')} 
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
