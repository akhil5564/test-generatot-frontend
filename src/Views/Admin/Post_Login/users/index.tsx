// @ts-nocheck
import { useState, useEffect } from "react";
import { Button, Table, Tag, Input, Modal, Select, Popconfirm, message, Popover } from "antd";
import { FaUserCircle, FaEdit, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";
import { MdDeleteOutline } from "react-icons/md";
import PageHeader from "../../../../Components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { API, GET, PATCH } from "../../../../Components/common/api";
const UsersTable = () => {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [tableData, setTableData] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});

  // Load schools data on mount
  useEffect(() => {
    fetchSchools({ pageSize: 10 });
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]);

  // Trigger search on debounce
  useEffect(() => {
    fetchSchools({ pageSize, page: currentPage, q: debouncedSearch || undefined, status: statusFilter || undefined });
  }, [debouncedSearch, statusFilter]);

  // Handle Edit Click - Navigate with ID
  const handleEdit = (record: any) => {
    navigate(`/schools/edit/${record.id}`);
  };

  // Handle view record
  const handleView = (record: any) => {
    setViewRecord(record);
    setIsViewModalOpen(true);
  };

  // Fetch schools from API
  const fetchSchools = async (opts?: { pageSize?: number, page?: number, q?: string, status?: string }) => {
    try {
      setLoading(true);
      const size = opts?.pageSize ?? pageSize ?? 10;
      const page = opts?.page ?? currentPage ?? 1;
      const query: any = { pageSize: size, page: page };
      
      if (opts?.q) query.schoolName = opts.q;
      if (opts?.status) query.status = opts.status === "true";
      
      const data = await GET("/schools", query);
      const rows = Array.isArray(data?.results)
        ? data.results.map((r: any) => ({
            id: r._id || r.id,
            key: r._id || r.id,
            schoolName: r.schoolDetails?.schoolName || "",
            schoolCode: r.schoolDetails?.schoolCode || "",
            executive: r.schoolDetails?.executive || "",
            phone1: r.schoolDetails?.phone1 || "",
            phone2: r.schoolDetails?.phone2 || "",
            principalName: r.schoolDetails?.principalName || "",
            examIncharge: r.schoolDetails?.examIncharge || "",
            email: r.schoolDetails?.email || "",
            address: r.schoolDetails?.address || "",
            username: r.username || "",
            password: r.password || "",
            titles: Array.isArray(r.schoolDetails?.books) 
              ? r.schoolDetails.books.map((book: any) => book.name || book.book || book.title || "")
              : [],
            status: r.status === true ? "Active" : "Inactive"
          }))
        : [];
      setTableData(rows);
      setTotal(data?.total || data?.count || rows.length);
    } catch (e) {
      console.log(e);
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = () => {
    // Update the user status in the data
    const updatedData = tableData.map(user => 
      user.id === selectedUser.id 
        ? { ...user, status: newStatus }
        : user
    );
    setTableData(updatedData);
    
    // Show success message
    message.success(`Status updated successfully!`);
    
    // Close modal and reset state
    setIsEditModalOpen(false);
    setSelectedUser(null);
    setNewStatus("");
  };

  // Create user handled in dedicated form page

  // Toggle status with API call
  const handleToggleStatus = async (userId: string) => {
    try {
      setStatusLoading(prev => ({ ...prev, [userId]: true }));
      
      const user = tableData.find(u => u.id === userId);
      if (!user) return;
      
      const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
      
      await PATCH(`/schools/${userId}/status`, { status: newStatus === 'Active' });
      
      // Optimistically update UI
      const updatedData = tableData.map(u =>
        u.id === userId
          ? { ...u, status: newStatus }
          : u
      );
      setTableData(updatedData);

      message.success("Status updated successfully!");

      // Refresh list so current filters (e.g., Active only) stay consistent
      fetchSchools({
        pageSize,
        page: currentPage,
        q: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      message.error("Failed to update status. Please try again.");
    } finally {
      setStatusLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  // Handle refresh
  const handleRefresh = () => {
    setSearchValue("");
    setStatusFilter(undefined);
    fetchSchools({ pageSize: 10 });
  };

  const handleTableChange = (pag: any) => {
    const newPageSize = pag.pageSize || pageSize;
    const newPage = pag.current || currentPage;
    
    if (pag.pageSize && pag.pageSize !== pageSize) {
      setPageSize(pag.pageSize);
    }
    if (pag.current && pag.current !== currentPage) {
      setCurrentPage(pag.current);
    }
    
    fetchSchools({ pageSize: newPageSize, page: newPage, q: debouncedSearch || undefined, status: statusFilter || undefined });
  };

  const getRandomColor = (title: string, id?: string) => {
    return 'blue';
  };

  const columns: any[] = [
  	{
  	  title: <span className="font-semi">School Name</span>,
  	  dataIndex: "schoolName",
  	  key: "schoolName",
  	  width: 220,
  	  render: (schoolName: string) => (
  	    <div className="font-local2 text-gray-700">{schoolName}</div>
  	  ),
  	},
  	{
  	  title: <span className="font-semi">Books</span>,
  	  dataIndex: "titles",
  	  key: "titles",
  	  width: 380,
  	  render: (titles: string[], record: any) => {
  	    const maxInline = 2;
  	    const hasMore = Array.isArray(titles) && titles.length > maxInline;
  	    const inline = Array.isArray(titles) ? titles.slice(0, maxInline) : [];
  	    const content = (
  	      <div className="max-w-xs">
  	        {Array.isArray(titles) && titles.map((t, idx) => (
  	          <Tag key={idx} className="mb-1 font-local2" color={getRandomColor(t, `${record.id}-${idx}`)}>{t}</Tag>
  	        ))}
  	      </div>
  	    );
  	    return (
  	      <div className="flex items-center gap-1 flex-wrap">
  	        {inline.map((t, idx) => (
  	          <Tag key={idx} className="font-local2" color={getRandomColor(t, `${record.id}-${idx}`)}>{t}</Tag>
  	        ))}
  	        {hasMore && (
  	          <Popover content={content} title="All Books">
  	            <Tag className="cursor-pointer font-local2" color="default">+{titles.length - maxInline} more</Tag>
  	          </Popover>
  	        )}
  	      </div>
  	    );
  	  },
  	},
  	{
  	  title: <span className="font-semi">Status</span>,
  	  dataIndex: "status",
  	  key: "status",
  	  width: 120,
  	  render: (status: string, record: any) => (
  	    <Tag 
  	      color={status === "Active" ? "green" : "red"} 
  	      className="font-local2 cursor-pointer"
  	      onClick={() => handleToggleStatus(record.id)}
  	      style={{ 
  	        cursor: statusLoading[record.id] ? 'not-allowed' : 'pointer',
  	        opacity: statusLoading[record.id] ? 0.6 : 1
  	      }}
  	    >
  	      {statusLoading[record.id] ? 'Updating...' : status}
  	    </Tag>
  	  ),
  	},
  	{
  	  title: <span className="font-semi">Actions</span>,
  	  key: "actions",
  	  width: 100,
  	  render: (_: any, record: any) => (
  	    <div className="flex items-center gap-2">
          <Button
               type="link"
               icon={<FaEye color="black" size={18} />}
               size="small"
               onClick={() => handleView(record)}
               title="View"
             />
          <Button
            type="link"
            icon={<FaEdit color="orange" size={18} />}
            size="small"
            onClick={() => handleEdit(record)}
            title="Edit"
          />
  	    </div>
  	  ),
  	},
  ];

  return (
    <>
      <PageHeader title="Schools" backButton={true}>
        <div className="flex items-center gap-3 w-full">
        <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            className="w-32"
            style={{
              backgroundColor: '#f9fafb',
              color: '#374151',
             
            }}
          >
            <Select.Option value="true">Active</Select.Option>
            <Select.Option value="false">Inactive</Select.Option>
          </Select>
          <div className="flex-1 max-w-sm sm:max-w-lg">
            <Input
              placeholder="Search by school name"
              prefix={<IoIosSearch className="text-gray-400" />}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none"
              style={{
                backgroundColor: '#f9fafb',
                color: '#374151',
                border: '1px solid #d1d5db'
              }}
            />
          </div>
         
          <Button
            type="primary"
            onClick={() => navigate('/schools/new')}
            className="bg-gradient-to-br from-[#007575] to-[#339999] border-none text-white font-local2 hover:!bg-gradient-to-br hover:!from-[#007575] hover:!to-[#339999]"
          >
            Create School
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6">
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: any, range: any) => `${range[0]}-${range[1]} of ${total} items`,
            pageSizeOptions: ["5", "10", "20", "50"],
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
          size="middle"
          className="font-local2"
          rowKey="id"
        />
      </div>

      {/* Edit Status Modal */}
      <Modal
        title="Update User Status"
        open={isEditModalOpen}
        onOk={handleStatusUpdate}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
          setNewStatus("");
        }}
        okText="Update"
        cancelText="Cancel"
        centered
        okButtonProps={{
          style: {
            backgroundColor: "#007575",
            borderColor: "#007575",
          },
        }}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FaUserCircle size={40} color="gray" />
              <div>
                <h3 className="font-local2 font-semibold text-gray-900">{selectedUser.username}</h3>
                <p className="text-sm text-gray-600">ID: {selectedUser.id}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="font-local2 font-medium text-gray-700 mr-1">Current Status:</label>
              <Tag 
                color={selectedUser.status === "Active" ? "green" : "red"} 
                className="font-local2"
              >
                {selectedUser.status}
              </Tag>
            </div>

            <div className="space-y-2">
              <label className="font-local2 font-medium text-gray-700">New Status:</label>
              <Select
                value={newStatus}
                onChange={setNewStatus}
                className="w-full"
                placeholder="Select new status"
              >
                <Select.Option value="Active">Active</Select.Option>
                <Select.Option value="Inactive">Inactive</Select.Option>
              
              </Select>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Changing user status will affect their access to the platform.
              </p>
            </div>
          </div>
        )}
      </Modal>
      
      {/* View Details Modal */}
      <Modal
        title={viewRecord ? viewRecord.schoolName : 'Details'}
        open={isViewModalOpen}
        footer={null}
        onCancel={() => {
          setIsViewModalOpen(false);
          setViewRecord(null);
        }}
        centered
        width={720}
        bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {viewRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">School Code</div>
                <div className="font-local2 text-base">{viewRecord.schoolCode || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Username</div>
                <div className="font-local2 text-base">{viewRecord.username || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Executive</div>
                <div className="font-local2 text-base">{viewRecord.executive || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Phone 1</div>
                <div className="font-local2 text-base">{viewRecord.phone1 || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Phone 2</div>
                <div className="font-local2 text-base">{viewRecord.phone2 || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Principal</div>
                <div className="font-local2 text-base">{viewRecord.principalName || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Exam Incharge</div>
                <div className="font-local2 text-base">{viewRecord.examIncharge || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Email</div>
                <div className="font-local2 text-base">{viewRecord.email || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 font-semibold mb-2">Status</div>
                <div className="font-local2 text-base">
                  <Tag color={viewRecord.status === 'Active' ? 'green' : 'red'} className="text-sm px-2 py-0.5">{viewRecord.status}</Tag>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 font-semibold mb-2">Address</div>
              <div className="font-local2 text-base">{viewRecord.address || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 font-semibold mb-3">Books</div>
              <div className="flex flex-wrap gap-3">
                {Array.isArray(viewRecord.titles) && viewRecord.titles.map((t: string, idx: number) => (
                  <Tag key={t} color={getRandomColor(t, `${viewRecord.id}-${idx}`)} className="font-local2 text-sm px-2 py-0.5">{t}</Tag>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
      
    </>
  );
};

export default UsersTable;