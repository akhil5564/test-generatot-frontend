// @ts-nocheck
import { useEffect, useState } from "react";
import { Button, Modal, Form, Input, Row, Col, message } from "antd";
import PageHeader from "../../../../Components/common/PageHeader";
import Datatable from "./components/datatable";
import { IoIosSearch } from "react-icons/io";
import { API, GET, POST, DELETE as DELETE_REQ } from "../../../../Components/common/api";

const Subject = () => {


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Open Modal for Create
  const showModal = () => {
    setIsModalOpen(true);
    form.resetFields();
  };

  // Close Form Modal
  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };


  // Save Form
  const handleOk = async () => {
    try {
      if (submitting) return;
      setSubmitting(true);
      const values = await form.validateFields();
      
      // Prepare payload for API
      const payload = {
        name: values.subjectName,
      };
      await POST(API.SUBJECT, payload);
      message.success("Subject created successfully!");
      setIsModalOpen(false);
      form.resetFields();
      
      // Refresh table data after create
      fetchSubjects();
    } catch (error) {
      console.log("Validation Failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDelete = async (id: string | number) => {
    try {
      await DELETE_REQ(`${API.SUBJECT}/${id}`);
      message.success(`Subject deleted successfully!`);
      fetchSubjects();
    } catch (e: any) {
      message.error(e?.message || 'Failed to delete subject');
    }
  };

  const fetchSubjects = async (opts?: { pageSize?: number, page?: number, q?: string }) => {
    try {
      setLoading(true);
      const size = opts?.pageSize ?? pageSize ?? 10;
      const page = opts?.page ?? currentPage ?? 1;
      const query: any = { pageSize: size, page: page };
      // Backend expects search key as 'name'
      if (opts?.q) query.search = opts.q;
      const data = await GET(API.SUBJECT, query);
      const rows = Array.isArray(data?.subjects)
        ? data.subjects.map((r: any) => ({
            id: r.id,
            key: r.id,
            subjectName: r.name || "",
          }))
        : [];
      setTableData(rows);
      setTotal(data?.total || rows.length);
    } catch (e) {
      console.log(e);
      // Set empty data if API fails
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };


  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  useEffect(() => {
    fetchSubjects({ pageSize: 10 });
  }, []);

  // Trigger search on debounce
  useEffect(() => {
    fetchSubjects({ pageSize, page: currentPage, q: debouncedSearch || undefined });
  }, [debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]);

  return (
    <>
      <PageHeader title="Subjects" backButton={true}>
        <Input
          placeholder="Search by Subject Name"
          prefix={<IoIosSearch className="text-gray-400" />}
          value={searchValue}
          allowClear
          onChange={(e) => handleSearch(e.target.value)}
          className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none w-64"
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
          Create Subject
        </Button>
      </PageHeader>

      <Datatable
        onDelete={handleDelete}
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
          
          fetchSubjects({ pageSize: newPageSize, page: newPage, q: debouncedSearch || undefined });
        }}
      />

      {/* Create Modal */}
      <Modal
        title={"Create New Subject"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={submitting}
        okText="Submit"
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
                name="subjectName" 
                label="Subject Name" 
                required={false}
                rules={[{ required: true, message: 'Please enter subject name' }]}
              >
                <Input 
                  placeholder="Enter subject name" 
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

    </>
  );
};

export default Subject;
