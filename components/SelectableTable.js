import React, { useEffect } from "react";
import { useRowSelect, useTable } from "react-table";
import { Table, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </>
    );
  }
);

export function SelectableTable({ columns, data, setSelectedRows }) {
  // Use the state and functions returned from useTable to build your UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    footerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
  } = useTable(
    {
      columns,
      data,
    },
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        // Let's make a column for selection
        {
          id: "selection",
          // The header can use the table's getToggleAllRowsSelectedProps method
          // to render a checkbox
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <Td>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </Td>
          ),
          // The cell can use the individual row's getToggleRowSelectedProps method
          // to the render a checkbox
          Cell: ({ row }) => (
            <Td>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </Td>
          ),
        },
        ...columns,
      ]);
    }
  );

  useEffect(() => {
    setSelectedRows(selectedFlatRows.map((r) => r.original));
  }, [selectedFlatRows]);

  // Render the UI for your table
  return (
    <>
      <Table {...getTableProps()} size="sm">
        <Thead>
          {headerGroups.map((headerGroup) => (
            <Tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <Td {...column.getHeaderProps()}>{column.render("Header")}</Td>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody {...getTableBodyProps()}>
          {rows.slice().map((row) => {
            prepareRow(row);
            return (
              <Tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <Td {...cell.getCellProps()}>{cell.render("Cell")}</Td>
                  );
                })}
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          {footerGroups.map((group) => (
            <Tr {...group.getFooterGroupProps()}>
              <Td colSpan={2}>
                <Tr>Total Weights Selected:</Tr>
              </Td>
              <Td>
                {selectedFlatRows.reduce(
                  (acc, { original }) => original.weight + acc,
                  0
                )}
              </Td>
            </Tr>
          ))}
        </Tfoot>
      </Table>
    </>
  );
}
