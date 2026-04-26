
// @ts-nocheck
import React from "react";
import { Form, Input, Select, Button, Card, Row, Col, Space, Divider, Switch, message, Modal, Spin } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "@/Components/common/PageHeader";
import { API, GET, POST, PUT } from "@/Components/common/api";


const { TextArea } = Input;
const { Option } = Select;

// Select options
const SUBJECT_OPTIONS = [
  "Malayalam",
  "English",
  "Maths",
  "GK",
  "Computer",
  "EVS",
  "Social Science",
  "Science",
];

const CLASS_OPTIONS = ["0", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8"];



const Chaptersform = () => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';

  const [selectedClass, setSelectedClass] = React.useState<string | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = React.useState<string | undefined>(undefined);
  const [booksOptions, setBooksOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [subjectsOptions, setSubjectsOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = React.useState<boolean>(false);
  const [booksLoading, setBooksLoading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [selectedBookId, setSelectedBookId] = React.useState<string | undefined>(undefined);
  const [loadingInitial, setLoadingInitial] = React.useState<boolean>(false);

  // Dummy data aligned to Title/Subject/Class/Chapters
  const getDummyData = (id: string) => {
    const books: any = {
      '1': {
        title: "Numbers Workbook",
        subject: "Maths",
        class: "1",
        chapters: [
          { chapterName: "Counting" },
          { chapterName: "Addition" },
          { chapterName: "Subtraction" }
        ]
      },
      '2': {
        title: "Alphabets Fun",
        subject: "English",
        class: "LKG",
        chapters: [
          { chapterName: "A to E" },
          { chapterName: "F to J" },
          { chapterName: "K to O" }
        ]
      },
      '3': {
        title: "My First GK",
        subject: "GK",
        class: "UKG",
        chapters: [
          { chapterName: "Animals" },
          { chapterName: "Fruits" },
          { chapterName: "Vehicles" }
        ]
      },
      '4': {
        title: "Basics of Computing",
        subject: "Computer",
        class: "3",
        chapters: [
          { chapterName: "What is a Computer?" },
          { chapterName: "Input/Output Devices" }
        ]
      }
    };

    return books[id] || null;
  };



  const courseOptions = {
    "Mathematics": [
      { value: "Advanced Algebra", label: "Advanced Algebra" },
      { value: "Calculus", label: "Calculus" },
      { value: "Statistics", label: "Statistics" }
    ],
    "Computer Science": [
      { value: "Python Programming", label: "Python Programming" },
      { value: "Data Science", label: "Data Science" },
      { value: "Web Development", label: "Web Development" }
    ],
    "English Literature": [
      { value: "Shakespeare Studies", label: "Shakespeare Studies" },
      { value: "Modern Literature", label: "Modern Literature" },
      { value: "Poetry Analysis", label: "Poetry Analysis" }
    ],
    "Banking & Finance": [
      { value: "Financial Accounting", label: "Financial Accounting" },
      { value: "Investment Banking", label: "Investment Banking" },
      { value: "Corporate Finance", label: "Corporate Finance" }
    ],
    "UPSC Preparation": [
      { value: "Indian Polity", label: "Indian Polity" },
      { value: "Geography", label: "Geography" },
      { value: "History", label: "History" }
    ],
    "Digital Marketing": [
      { value: "Social Media Marketing", label: "Social Media Marketing" },
      { value: "SEO Optimization", label: "SEO Optimization" },
      { value: "Content Marketing", label: "Content Marketing" }
    ]
  };

  // No module/course now

  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const data = await GET(API.ALL_SUBJECTS);
      const subjectsList = Array.isArray(data?.results)
        ? data.results.map((s: any) => ({ value: s.subject, label: s.subject }))
        : Array.isArray(data?.subjects)
          ? data.subjects.map((s: any) => ({ value: s.name ?? s.subject, label: s.name ?? s.subject }))
          : [];
      setSubjectsOptions(subjectsList);
    } catch (e) {
      setSubjectsOptions(SUBJECT_OPTIONS.map(subj => ({ value: subj, label: subj })));
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchBooks = async (cls?: string, subj?: string) => {
    if (!cls || !subj) return;
    try {
      setBooksLoading(true);
      setBooksOptions([]);
      const data = await GET(API.BOOKS, { class: cls, subject: subj });
      const list = Array.isArray(data?.books)
        ? data.books
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
      const options = list
        .map((item: any) => {
          // Handle the new API response format with id and book fields
          const bookId = item?.id || item?._id;
          const bookName = item?.book || item?.title || item?.name || "";
          return bookId && bookName ? { value: String(bookId), label: String(bookName) } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;
      setBooksOptions(options);
    } catch (e) {
      // fallback: empty options
      setBooksOptions([]);
    } finally {
      setBooksLoading(false);
    }
  };

  const onChangeClass = (value: string) => {
    setSelectedClass(value);
    // reset book when dependency changes
    form.setFieldValue('bookId', undefined);
    setSelectedBookId(undefined);
    setBooksOptions([]);
    if (value && selectedSubject) {
      fetchBooks(value, selectedSubject);
    }
  };

  const onChangeSubject = (value: string) => {
    setSelectedSubject(value);
    // reset book when dependency changes
    form.setFieldValue('bookId', undefined);
    setSelectedBookId(undefined);
    setBooksOptions([]);
    if (selectedClass && value) {
      fetchBooks(selectedClass, value);
    }
  };

  const onChangeBook = (value: string) => {
    setSelectedBookId(value);
  };

  const handleFinish = async (values: any) => {
    if (submitting) return;
    
    // Check if chapters exist and have at least one item
    if (!values?.chapters || values.chapters.length === 0) {
      message.error('At least one chapter is required!');
      return;
    }

    setSubmitting(true);
    // Build clean payload for submission/preview
    const payload = {
      class: values?.class,
      subject: values?.subject,
      bookid: values?.bookId,
      chapters: Array.isArray(values?.chapters)
        ? values.chapters.map((c: any) => ({ chapterName: c?.chapterName }))
        : [],
      status: values?.status ?? true,
      type: values?.type ?? "Public",
    };

    try {
      if (isEdit) {
        // Update only chapters via PUT /chapter/:id
        await PUT(`${API.CHAPTER}/${id}`, { chapters: payload.chapters });
        message.success("Chapter updated successfully!");
      } else {
        await POST(API.CHAPTER, payload);
        message.success("Chapter created successfully!");
      }
      navigate('/chapters');
    } catch (e: any) {
      message.error(e?.message || 'Failed to save chapter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/chapters');
  };


  // Fetch chapter data for editing
  const fetchChapterData = async (chapterId: string) => {
    try {
      setLoadingInitial(true);
      const data = await GET(`${API.CHAPTER}/${chapterId}`);
      if (data) {
        // Set form values from API response
        const formData = {
          class: data.class,
          subject: data.subject,
          bookId: data.bookid || data.bookId,
          chapters: Array.isArray(data.chapters) 
            ? data.chapters.map((ch: any) => ({
                chapterName: typeof ch === 'string' ? ch : (ch?.chapterName || ch?.name || '')
              }))
            : []
        };
        
        form.setFieldsValue(formData);
        
        // Set state values to enable dependent dropdowns
        setSelectedClass(data.class);
        setSelectedSubject(data.subject);
        setSelectedBookId(data.bookid || data.bookId);
        
        // Fetch books if class and subject are available
        if (data.class && data.subject) {
          fetchBooks(data.class, data.subject);
        }
      }
    } catch (e: any) {
      message.error(e?.message || 'Failed to load chapter data');
      // Fallback to dummy data if API fails
      const dummyData = getDummyData(chapterId);
      if (dummyData) {
        form.setFieldsValue(dummyData);
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  // Set initial values if editing
  React.useEffect(() => {
    if (isEdit && id) {
      fetchChapterData(id);
    }
  }, [form, isEdit, id]);

  // Fetch subjects on component mount
  React.useEffect(() => {
    fetchSubjects();
  }, []);

  return (
    <>
      <PageHeader title={isEdit ? "Edit Chapter" : "Create Chapter"} backButton={true} />
      
      <Card 
        className="w-full mt-4 shadow-md"
      >
        <Spin spinning={Boolean(isEdit) && loadingInitial}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          className="font-local2"
          initialValues={{
            status: true,
            type: "Public"
          }}
        >
          {!isEdit && (
            <>
              <Row gutter={24}>
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                  <Form.Item
                    required={false}
                    name="class"
                    label="Class"
                    rules={[{ required: true, message: 'Please select class!' }]}
                  >
                    <Select placeholder="Select class" size="large" onChange={onChangeClass}
                    showSearch
                     allowClear>
                      {CLASS_OPTIONS.map((cls) => (
                        <Option key={cls} value={cls}>{cls}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                  <Form.Item
                    required={false}
                    name="subject"
                    label="Subject"
                    rules={[{ required: true, message: 'Please select subject!' }]}
                  >
                    <Select 
                      placeholder="Select subject" 
                      size="large" 
                      onChange={onChangeSubject} 
                      showSearch
                      allowClear
                      options={subjectsOptions}
                      loading={subjectsLoading}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                  <Form.Item
                    required={false}
                    name="bookId"
                    label="Book"
                    rules={[{ required: true, message: 'Please select book!' }]}
                  >
                    <Select
                      placeholder="Select book"
                      size="large"
                      allowClear
                      showSearch
                      loading={booksLoading}
                      disabled={!selectedClass || !selectedSubject}
                      options={booksOptions}
                      onChange={onChangeBook}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider orientation="left">Chapters</Divider>

          {/* Dynamic Chapters */}
          <Form.List name="chapters">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card 
                    key={key} 
                    size="small" 
                    className="mb-4"
                    style={{ backgroundColor: '#f8f9fa' }}
                    title={`Chapter ${name + 1}`}
                    extra={
                      <Button
                        type="text"
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        danger
                      />
                    }
                  >
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          {...restField}
                          required={false}
                          name={[name, 'chapterName']}
                          label="Chapter Name"
                          rules={[{ required: true, message: 'Please enter chapter name!' }]}
                        >
                          <Input 
                            placeholder="Enter chapter name" 
                            style={{ height: '40px' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    size="large"
                    className="w-full h-12"
                    style={{ maxWidth: '800px' }}
                  >
                    Add Chapter
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          {/* Removed Textbooks section as requested */}

          {/* Action Buttons */}
          <Row justify="end" className="mt-6">
            <Space size="middle">
              <Button size="middle" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="middle"
                style={{ 
                  backgroundColor: "#007575", 
                  borderColor: "#007575" 
                }}
                loading={submitting}
              >
                {isEdit ? "Update" : "Submit"}
              </Button>
            </Space>
          </Row>
        </Form>
        </Spin>
      </Card>
    </>
  );
};

export default Chaptersform;