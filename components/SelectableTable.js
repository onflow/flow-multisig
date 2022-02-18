import React, { forwardRef, useEffect, useRef } from "react";
import { useRowSelect, useTable } from "react-table";
import { Table, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";

const IndeterminateCheckbox = forwardRef(function Checkbox(
  { indeterminate, ...rest },
  ref
) {
  const defaultRef = useRef();
  const resolvedRef = ref || defaultRef;

  useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return (
    <>
      <input type="checkbox" ref={resolvedRef} {...rest} />
    </>
  );
});

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
            <span>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </span>
          ),
          // The cell can use the individual row's getToggleRowSelectedProps method
          // to the render a checkbox
          Cell: ({ row }) => (
            <span>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </span>
          ),
        },
        ...columns,
      ]);
    }
  );

  useEffect(() => {
    setSelectedRows(selectedFlatRows.map((r) => r.original));
  }, [selectedFlatRows, setSelectedRows]);

  // Render the UI for your table
  return (
    <>
      <Table {...getTableProps()} size="sm">
        <Thead>
          {headerGroups.map((headerGroup, index) => (
            <Tr key={index} {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, index) => (
                <Td key={index} {...column.getHeaderProps()}>
                  {column.render("Header")}
                </Td>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody {...getTableBodyProps()}>
          {rows.slice().map((row, index) => {
            prepareRow(row);
            return (
              <Tr key={index} {...row.getRowProps()}>
                {row.cells.map((cell, index) => {
                  return (
                    <Td key={index} {...cell.getCellProps()}>
                      {cell.render("Cell")}
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          {footerGroups.map((group, index) => (
            <Tr key={index} {...group.getFooterGroupProps()}>
              <Td colSpan={2}>
                Total Weights Selected:
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
