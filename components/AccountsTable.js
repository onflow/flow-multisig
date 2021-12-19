import React from 'react';
import { SelectableTable } from './SelectableTable';

export const AccountsTable = ({ accountKeys, setSelectedKeys }) => {
  const data = React.useMemo(() => accountKeys, [accountKeys]);
  const columns = React.useMemo(
    () => [
      {
        Header: 'Index',
        accessor: 'index',
      },
      {
        Header: 'Weight',
        accessor: 'weight',
      },
      {
        Header: 'Public Key',
        accessor: 'publicKey',
      },
    ],
    []
  );

  return (
    <SelectableTable
      columns={columns}
      data={data}
      setSelectedRows={setSelectedKeys}
    />
  );
};
