
// @ts-nocheck
import React from "react";
import { Table, Tag, Button, Popconfirm, Popover } from "antd";
import { FaEdit, FaRegEye } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import { Tooltip } from "antd";

const SubjectDatatable = ({ onEdit, onDelete, onView, data = [], loading = false, onChangePageParams, currentPage, pageSize, total, editingId }) => {
  const handleTableChange = (pag: any) => {
    if (typeof onChangePageParams === 'function') {
      onChangePageParams({ page: pag.current, pageSize: pag.pageSize });
    }
  };

  const columns: any[] = [
    {
      title: <span className="font-semibold">Book</span>,
      dataIndex: "title",
      key: "title",
      width: 220,
      render: (title: string) => <span className="font-local2 font-semibold">{title}</span>
    },
    {
      title: <span className="font-semibold">Subject</span>,
      dataIndex: "subject",
      key: "subject",
      width: 140,
      render: (subject: string) => <Tag color="blue" className="font-local2 bg-blue-100">{subject}</Tag>
    },
    {
      title: <span className="font-semibold">Class</span>,
      dataIndex: "class",
      key: "class",
      width: 100,
      render: (cls: string) => <Tag className="font-local2 bg-gray-100">{cls}</Tag>
    },
    {
      title: <span className="font-semibold">Chapters</span>,
      dataIndex: "chapters",
      key: "chapters",
      width: 260,
      render: (chapters: string[]) => {
        const maxInline = 2;
        const hasMore = chapters.length > maxInline;
        const inline = chapters.slice(0, maxInline);
        const content = (
          <div className="max-w-xs">
            {chapters.map((ch, idx) => (
              <Tag key={idx} className="mb-1 font-local2" color="purple">{ch}</Tag>
            ))}
          </div>
        );
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {inline.map((ch, idx) => (
              <Tag key={idx} className="font-local2" color="purple">{ch}</Tag>
            ))}
            {hasMore && (
              <Popover content={content} title="All Chapters">
                <Tag className="cursor-pointer font-local2" color="default">+{chapters.length - maxInline} more</Tag>
              </Popover>
            )}
          </div>
        );
      }
    },
    {
      title: <span className="font-semibold">Actions</span>,
      key: "actions",
      width: 150,
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button
            type="link"
            icon={<FaRegEye color="black" size={18} />}
            size="small"
            onClick={() => onView(record)}
            title="View"
          />
          <Button
            type="link"
            icon={<FaEdit color="orange" size={18}/>}
            size="small"
            loading={editingId === record.id}
            onClick={() => onEdit(record)}
            title="Edit"
          />
          <Popconfirm
            title="Are you sure you want to delete these chapters?"
            onConfirm={() => onDelete(record.id)}
            okText="Yes, Delete"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
             <Tooltip title="Delete Chapters">
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

  return (
    <div className="mt-4">
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: currentPage || 1,
          pageSize: pageSize || 10,
          total: typeof total === 'number' ? total : (Array.isArray(data) ? data.length : 0),
          showSizeChanger: true,
          showQuickJumper: false,
          showTotal: (total: any, range: any) => `${range[0]}-${range[1]} of ${total} items`,
          pageSizeOptions: ["5", "10", "20", "50"],
        }}
        onChange={handleTableChange}
        scroll={{ x: 1500 }}
        size="middle"
        className="font-local2"
        rowKey="id"
      />
    </div>
  );
};

export default SubjectDatatable;