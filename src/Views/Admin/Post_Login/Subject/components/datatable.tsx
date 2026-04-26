// @ts-nocheck
import React, { useState } from "react";
import { Table, Button, Popconfirm, Tooltip } from "antd";
import { MdDeleteOutline } from "react-icons/md";

const Datatable = ({ onDelete, onView, data: remoteData, onChangePageParams, currentPage, pageSize, total, loading = false }) => {

  const columns: any[] = [
    {
      title: <span className="font-semi">Subject Name</span>,
      dataIndex: "subjectName",
      key: "subjectName",
      width: 300,
      render: (name: string) => (
        <span className="font-local2 font-semibold text-gray-900">{name}</span>
      ),
    },
    {
      title: <span className="font-semi">Actions</span>,
      key: "actions",
      width: 100,
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Popconfirm
            title="Are you sure you want to delete this subject?"
            onConfirm={() => onDelete(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Subject">
              <Button
                type="link"
                icon={<MdDeleteOutline size={18} color="red" />}
                size="small"
                title="Delete"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const handleTableChange = (pag: any) => {
    if (typeof onChangePageParams === 'function') {
      onChangePageParams({ page: pag.current, pageSize: pag.pageSize });
    }
  };

  return (
    <div className="mt-4">
      <Table
        columns={columns}
        dataSource={Array.isArray(remoteData) ? remoteData : []}
        loading={loading}
        pagination={{
          current: currentPage || 1,
          pageSize: pageSize || 10,
          total: total || 0,
          showSizeChanger: true,
          showTotal: (total: any, range: any) => 
            `${range[0]}-${range[1]} of ${total} items`,
          pageSizeOptions: ["5", "10", "20", "50"],
        }}
        onChange={handleTableChange}
        scroll={{ x: 500 }}
        size="middle"
        className="font-local2"
        rowKey="id"
        rowClassName={() => 'hover:bg-blue-50'}
      />
    </div>
  );
};

export default Datatable;
