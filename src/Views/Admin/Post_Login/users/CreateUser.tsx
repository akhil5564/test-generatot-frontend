// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Form, Input, Button, Card, Row, Col, Select, Space, InputNumber, message, Tag, Spin } from "antd";
import PageHeader from "../../../../Components/common/PageHeader";
import { API, GET, POST, PUT } from "../../../../Components/common/api";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const { TextArea } = Input;

// Book options loaded from API.BOOKED on mount

const getTitleColor = (title: string) => {
  switch (title) {
    case "Numbers Workbook":
      return "geekblue";
    case "Alphabets Fun":
      return "volcano";
    case "My First GK":
      return "green";
    case "Basics of Computing":
      return "purple";
    case "Environment Around Us":
      return "cyan";
    case "Malayalam Reader":
      return "magenta";
    default:
      return "default";
  }
};

const getSubjectColor = (_subject: string) => {
  return 'blue';
};

const getClassColor = (_klass: string) => {
  return 'red';
};

const CreateUser: React.FC = () => {
  const [form] = Form.useForm();
  const [titleOptions, setTitleOptions] = useState<{ value: string; label: string }[]>([]);
  const [titlesLoading, setTitlesLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const isEditMode = !!id;
  const record = (location as any)?.state?.record || schoolData;

  // Fetch school data by ID when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchSchoolData = async () => {
        try {
          setLoading(true);
          const data = await GET(`/schools/${id}`);
          setSchoolData(data);
        } catch (error) {
          console.error('Failed to fetch school data:', error);
          message.error('Failed to load school data');
          navigate('/schools');
        } finally {
          setLoading(false);
        }
      };
      fetchSchoolData();
    }
  }, [isEditMode, id, navigate]);

  useEffect(() => {
    if (record && titleOptions.length > 0) {
      // Handle API response structure with schoolDetails
      const schoolDetails = record.schoolDetails || record;
      const books = schoolDetails.books || [];
      
      // Map book objects to IDs for form selection with error handling
      const bookIds = books.map((book: any) => {
        const bookId = book.id || book._id;
        // Check if the book ID exists in available options
        const existsInOptions = titleOptions.some(option => option.value === String(bookId));
        if (!existsInOptions && bookId) {
          console.warn(`Book with ID ${bookId} not found in available options`);
        }
        return bookId;
      }).filter(Boolean);

      form.setFieldsValue({
        schoolName: schoolDetails.schoolName,
        schoolCode: schoolDetails.schoolCode,
        executive: schoolDetails.executive,
        phone1: schoolDetails.phone1,
        phone2: schoolDetails.phone2,
        books: bookIds,
        principalName: schoolDetails.principalName,
        examIncharge: schoolDetails.examIncharge,
        email: schoolDetails.email,
        address: schoolDetails.address,
        username: record.username,
        password: record.password,
        // Only set confirmPassword for create mode
        ...(isEditMode ? {} : { confirmPassword: record.password }),
        status: record.status,
      });
    } else if (!record) {
      form.resetFields();
    }
  }, [record, form, titleOptions, isEditMode]);

  // Load books for "Book Name" select on mount
  useEffect(() => {
    let mounted = true;
    const loadBooks = async () => {
      try {
        setTitlesLoading(true);
        const data = await GET(API.BOOKED);
        const list = Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];
        const options = list
          .map((item: any) => {
            const bookName = item?.book || item?.name || '';
            const klass = item?.class || '';
            const subject = item?.subject || '';
            if (!bookName) return null;
            const labelText = `${bookName} - ${klass}-${subject}`.trim();
            return {
              value: String(item?.id || item?._id || bookName),
              labelText,
              klass,
              subject,
              label: (
                <span>
                  {bookName}
                  <Tag color={getClassColor(klass)} style={{ marginLeft: 8 }}>{klass}</Tag>
                  <Tag color={getSubjectColor(subject)} style={{ marginLeft: 4 }}>{subject}</Tag>
                </span>
              ),
            };
          })
          .filter((opt: any) => !!opt);
        if (mounted) setTitleOptions(options);
      } catch (e: any) {
        message.error(e?.message || 'Failed to load books');
      } finally {
        if (mounted) setTitlesLoading(false);
      }
    };
    loadBooks();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCancel = () => {
    navigate("/schools");
  };

  const handleFinish = async (values: any) => {
    const { confirmPassword, ...rest } = values || {};
    
    const payload: any = {
      schoolName: rest.schoolName,
      schoolCode: rest.schoolCode,
      executive: rest.executive,
      phone1: rest.phone1,
      books: Array.isArray(rest.books) ? rest.books : [], // Send book IDs directly
      principalName: rest.principalName,
      examIncharge: rest.examIncharge,
      email: rest.email,
      address: rest.address,
      username: rest.username,
      password: rest.password,
    };

    // Only include phone2 if it has a value
    if (rest.phone2 && String(rest.phone2).trim() !== '') {
      payload.phone2 = rest.phone2;
    }

    try {
      setSubmitting(true);
      if (isEditMode && id) {
        // Edit mode - make PUT request with school ID
        console.log("Edit User submit:", { id, ...payload });
        await PUT(`/schools/${id}`, payload);
        message.success("School updated successfully!");
      } else {
        // Create mode - make POST request
        await POST("/school-user", payload);
        message.success("School created successfully!");
      }
      navigate("/schools");
    } catch (e: any) {
      const raw = (e && e.message) ? e.message : String(e || '');
      let friendly = raw || 'Failed to submit form';
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.message === 'string') friendly = parsed.message;
      } catch {}
      message.error(friendly || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  // Keep route visible and show an inline spinner over the form content

  return (
    <>
      <PageHeader title={isEditMode ? "Edit School" : "Create School"} backButton={true} />

      <Card className="w-full mt-4 shadow-md">
        <Spin spinning={Boolean(isEditMode) && loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          className="font-local2"
          initialValues={record ? {
            schoolName: record.schoolName,
            schoolCode: record.schoolCode,
            executive: record.executive,
            phone1: record.phone1,
            phone2: record.phone2,
            books: [], // Will be set via useEffect after titleOptions are loaded
            principalName: record.principalName,
            examIncharge: record.examIncharge,
            email: record.email,
            address: record.address,
            username: record.username,
            password: record.password,
            confirmPassword: record.password,
            status: record.status,
          } : {}}
        >
          <Row gutter={24}>
            <Col xs={24} sm={24} md={17} lg={17} xl={17}>
              <Form.Item
                required={false}
                name="schoolName"
                label="School Name"
                rules={[{ required: true, message: "Please enter school name" }]}
              >
                <Input size="large" placeholder="Enter school name" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={7} lg={7} xl={7}>
              <Form.Item
                required={false}
                name="schoolCode"
                label="School Code"
                rules={[{ required: true, message: "Please enter school code" }]}
              >
                <Input size="large" placeholder="Enter school code" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="executive"
                label="Executive"
                rules={[{ required: true, message: "Please enter executive" }]}
              >
                <Input size="large" placeholder="Enter executive" />
              </Form.Item>
            </Col>
             <Col xs={24} sm={12} md={8} lg={8} xl={8}>
               <Form.Item
                 required={false}
                 name="phone1"
                 label="Phone Number 1"
                 validateTrigger={['onChange', 'onBlur']}
                 rules={[
                   { required: true, message: "Please enter phone number" },
                   {
                     validator(_, value) {
                       if (!value) return Promise.resolve();
                       const phoneStr = String(value);
                       if (phoneStr.length < 10) {
                         return Promise.reject(new Error("Phone number must be at least 10 digits"));
                       }
                       return Promise.resolve();
                     }
                   }
                 ]}
               >
                 <InputNumber 
                   size="large" 
                   placeholder="Enter phone number 1" 
                   style={{ width: '100%' }}
                   controls={false}
                   maxLength={10}
                 />
               </Form.Item>
             </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="phone2"
                label="Phone Number 2"
                validateTrigger={['onChange', 'onBlur']}
                 rules={[
                   {
                     validator(_, value) {
                       if (!value) return Promise.resolve();
                       const phoneStr = String(value);
                       if (phoneStr.length < 10) {
                         return Promise.reject(new Error("Phone number must be at least 10 digits"));
                       }
                       return Promise.resolve();
                     }
                   }
                 ]}
              >
                <InputNumber 
                  size="large" 
                  placeholder="Enter phone number 2 (optional)" 
                  style={{ width: '100%' }}
                  controls={false}
                  maxLength={10}
                />
              </Form.Item>
            </Col>
           
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="principalName"
                label="Principal Name"
                rules={[{ required: true, message: "Please enter principal name" }]}
              >
                <Input size="large" placeholder="Enter principal name" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="examIncharge"
                label="Examination Incharge"
                rules={[{ required: true, message: "Please enter examination incharge" }]}
              >
                <Input size="large" placeholder="Enter examination incharge" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input size="large" placeholder="Enter email" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                required={false}
                name="books"
                label="Book Name"
                rules={[{ required: true, message: "Please select book name(s)" }]}
              >
                <Select
                  size="large"
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="Select book name(s)"
                  options={titleOptions}
                  loading={titlesLoading}
                  filterOption={(input, option) => {
                    const text = `${(option as any)?.labelText || ''} ${(option as any)?.klass || ''} ${(option as any)?.subject || ''}`.toLowerCase();
                    return text.includes(input.toLowerCase());
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please enter username" }]}
              >
                <Input size="large" placeholder="Enter username" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item
                required={false}
                name="password"
                label="Password"
                rules={[{ required: true, message: "Please enter password" }]}
              >
                <Input.Password size="large" placeholder="Enter password" />
              </Form.Item>
            </Col>

            {!isEditMode && (
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Item
                  required={false}
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "Please confirm password" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Passwords do not match"));
                      },
                    }),
                  ]}
                >
                  <Input.Password size="large" placeholder="Confirm password" />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                required={false}
                name="address"
                label="Address"
                rules={[{ required: true, message: "Please enter address" }]}
              >
                <TextArea rows={5} placeholder="Enter address" />
              </Form.Item>
            </Col>
          </Row>

         

          {/* Status removed from form per requirement; status is managed via table actions. */}

          <Row justify="end" className="mt-6">
            <Space size="middle">
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ backgroundColor: "#007575", borderColor: "#007575" }}
              >
                {record ? 'Update' : 'Submit'}
              </Button>
            </Space>
          </Row>
        </Form>
        </Spin>
      </Card>
    </>
  );
};

export default CreateUser;


