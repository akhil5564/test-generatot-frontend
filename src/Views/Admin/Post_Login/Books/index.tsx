// @ts-nocheck
import { useEffect, useState } from "react";
import { Button, Modal, Form, Input, Popconfirm, Card, Row, Col, Switch, Select,message } from "antd";
import PageHeader from "../../../../Components/common/PageHeader";
import Datatable from "./components/datatable";
import { IoIosSearch, IoMdRefresh } from "react-icons/io";
import { API, GET, POST, PUT, DELETE as DELETE_REQ } from "../../../../Components/common/api";
const { TextArea } = Input;

const Books = () => {
  

  const CLASS_OPTIONS = [
    "0",
    "LKG",
    "UKG",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [form] = Form.useForm();
  const [viewRecord, setViewRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [filterClass, setFilterClass] = useState<string | undefined>(undefined);
  const [filterSubject, setFilterSubject] = useState<string | undefined>(undefined);
  // Open Modal for Create
  const showModal = () => {
    setViewRecord(null);
    setEditingRecord(null);
    setIsModalOpen(true);
    form.resetFields();
  };

  // Open Modal for Edit
  const showEditModal = (record: any) => {
    setViewRecord(null);
    setEditingRecord(record);
    setIsModalOpen(true);
    form.setFieldsValue({
      book: record.book,
      code: record.bookCode,
      subject: record.subject,
      class: record.class,
    });
  };

  // Close Form Modal
  const handleCancel = () => {
    setIsModalOpen(false);
    setViewRecord(null);
    setEditingRecord(null);
    form.resetFields();
  };
  const handleRefresh = () => {
    setSearchValue("");
    setFilterClass(undefined);
    setFilterSubject(undefined);
    fetchBooks({ pageSize: 10, page: 1 });
  };

  // Save Form
  const handleOk = async () => {
    try {
      if (submitting) return;
      setSubmitting(true);
      const values = await form.validateFields();
      
      if (editingRecord) {
        // Update existing book
        await PUT(`${API.BOOKS}/${editingRecord.id}`, values);
        message.success("Book updated successfully!");
      } else {
        // Create new book
        await POST(API.BOOKS, values);
        message.success("Book created successfully!");
      }
      
      setIsModalOpen(false);
      setViewRecord(null);
      setEditingRecord(null);
      form.resetFields();
      // Refresh table data after create/update
      fetchBooks({
        pageSize,
        page: currentPage,
        q: searchValue.trim() || undefined,
        cls: filterClass,
        subj: filterSubject,
      });
    } catch (error) {
      console.log("Validation Failed:", error);
    }
    finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDelete = async (id: string | number) => {
    try {
      await DELETE_REQ(`${API.BOOKS}/${id}`);
      message.success(`Book deleted successfully!`);
      fetchBooks({
        pageSize,
        page: currentPage,
        q: searchValue.trim() || undefined,
        cls: filterClass,
        subj: filterSubject,
      });
    } catch (e: any) {
      message.error(e?.message || 'Failed to delete book');
    }
  };

  // Handle View Click
  const handleView = (record: any) => {
    setViewRecord(record);
    setIsViewOpen(true);
  };
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const data = await GET(API.ALL_SUBJECTS);
      const subjectsList = Array.isArray(data?.results)
        ? data.results.map((s: any) => ({ value: s.subject, label: s.subject }))
        : Array.isArray(data?.subjects)
          ? data.subjects.map((s: any) => ({ value: s.name ?? s.subject, label: s.name ?? s.subject }))
          : [];
      setSubjects(subjectsList);
    } catch (e) {
      console.log("Failed to fetch subjects:", e);
      // Fallback to empty options
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchBooks = async (opts?: { pageSize?: number, page?: number, q?: string, cls?: string, subj?: string }) => {
    try {
      setLoading(true);
      const size = opts?.pageSize ?? pageSize ?? 10;
      const page = opts?.page ?? currentPage ?? 1;
      const query: any = { pageSize: size, page: page };
      // Backend expects search key as 'quesryname'
      if (opts?.q) query.book= opts.q;
      if (opts?.cls) query.class = opts.cls;
      if (opts?.subj) query.subject = opts.subj;
      const data = await GET(API.ALL_BOOKS, query);
      const rows = Array.isArray(data?.results)
        ? data.results.map((r: any) => ({
            id: r._id || r.id,
            key: r._id || r.id,
            book: r.book || r.title || "",
            bookCode: r.code || r.bookCode || "",
            subject: r.subject,
            class: String(r.class ?? ""),
          }))
        : [];
      setTableData(rows);
      setTotal(data?.total || data?.count || rows.length);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks({ pageSize: 10 });
    fetchSubjects();
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
    fetchBooks({ pageSize, page: currentPage, q: debouncedSearch || undefined, cls: filterClass, subj: filterSubject });
  }, [debouncedSearch, filterClass, filterSubject]);

  return (
    <>
      <PageHeader title="Books" backButton={true}>
      <Select
              placeholder="Filter by Class"
              allowClear
              showSearch
              style={{ width: 150, marginRight: 8 }}
              onChange={(value) => {
                setFilterClass(value);
                setCurrentPage(1);
                fetchBooks({ pageSize, page: 1, q: searchValue.trim() || undefined, cls: value, subj: filterSubject });
              }}
              className="font-local2"
              options={CLASS_OPTIONS.map((cls) => ({ value: cls, label: cls }))}
            />
      <Select
              placeholder="Filter by Subject"
              allowClear
              showSearch
              style={{ width: 180, marginRight: 8 }}
              onChange={(value) => {
                setFilterSubject(value);
                setCurrentPage(1);
                fetchBooks({ pageSize, page: 1, q: searchValue.trim() || undefined, cls: filterClass, subj: value });
              }}
              className="font-local2"
              options={subjects}
              loading={subjectsLoading}
            />
      <Input
              placeholder="Search by Book"
              prefix={<IoIosSearch className="text-gray-400" />}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
              className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none w-56"
              style={{
                backgroundColor: '#f9fafb',
                color: '#374151',
                border: '1px solid #d1d5db'
              }}
            />
        <Button
          type="primary"
          style={{ backgroundColor: "#007575", color: "white" }}
          className="font-local2"
          onClick={showModal}
        >
          Create Book
        </Button>
        
      </PageHeader>

      <Datatable
        onDelete={handleDelete}
        onView={handleView}
        onEdit={showEditModal}
        data={tableData}
        currentPage={currentPage}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onChangePageParams={({ page, pageSize: ps }) => {
          const newPageSize = ps || pageSize;
          const newPage = page || currentPage;
          
          if (ps && ps !== pageSize) {
            setPageSize(ps);
          }
          if (page && page !== currentPage) {
            setCurrentPage(page);
          }
          
          fetchBooks({ pageSize: newPageSize, page: newPage, q: debouncedSearch || undefined, cls: filterClass, subj: filterSubject });
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingRecord ? "Edit Book" : "Create Book"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={submitting}
        okText={editingRecord ? "Update" : "Submit"}
        cancelText="Cancel"
        centered
        width={700}
        okButtonProps={{
          style: {
            backgroundColor: "#007575",
            borderColor: "#007575",
          },
        }}
      >
        <Form form={form} layout="vertical">
        
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item 
                name="book" 
                label="Book" 
                required={false}
                rules={[{ required: true, message: 'Please enter book name' }]}
              >
                <Input placeholder="Enter book name" size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item 
                name="code" 
                label="Book Code" 
                required={false}
                rules={[{ required: true, message: 'Please enter book code!' }]}
              >
                <Input placeholder="Enter book code" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
          <Col span={12}>
              <Form.Item 
               required={false}
                name="class" 
                label="Class"
                rules={[{ required: true, message: 'Please select class!' }]}
              >
                <Select placeholder="Select class"
                 allowClear
                 showSearch
                size="large">
                  {CLASS_OPTIONS.map((cls) => (
                    <Select.Option key={cls} value={cls}>{cls}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
               required={false}
                name="subject" 
                label="Subject"
                rules={[{ required: true, message: 'Please select subject!' }]}
              >
                <Select placeholder="Select subject"
                 allowClear
                 showSearch
                options={subjects} size="large" />
              </Form.Item>
            </Col>
           
          </Row>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="Book Details"
        open={isViewOpen}
        footer={null}
        onCancel={() => setIsViewOpen(false)}
        centered
        width={600}
      >
        {viewRecord && (
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Title:</span>
                <span className="font-local2 text-lg text-gray-900">{viewRecord.title}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Subject:</span>
                <span className="font-local2 text-lg text-gray-900">{viewRecord.subject}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Class:</span>
                <span className="font-local2 text-lg text-gray-900">{viewRecord.class}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Books;
