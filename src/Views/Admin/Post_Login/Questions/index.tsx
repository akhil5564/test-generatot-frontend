/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Card, Button, Table, Tag, Space, Select, Input, message, Modal, Popconfirm, Tooltip, Image } from "antd";
import { FaEdit } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosSearch } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/Components/common/PageHeader";
import { API, GET, DELETE } from "@/Components/common/api";

type QuestionListItem = {
  id: string;
  quizId: string;
  className: string;
  subject: string;
  title: string;
  chapter: string;
  question: string;
  variant: string;
  questionType: string;
  qtitle?: string;
  imageUrl?: string;
  marks?: number;
  options?: Array<{ text: string; isCorrect?: boolean } | string>;
  correctAnswer?: number | number[];
  section?: string;
};

const DUMMY_ITEMS: QuestionListItem[] = [
  { id: "1A", className: "Class 10", subject: "Mathematics", title: "Algebra Basics", chapter: "Chapter 1", variant: "A", question: "What is the solution to the equation 2x + 5 = 13?" },
  { id: "1B", className: "Class 10", subject: "Mathematics", title: "Algebra Basics", chapter: "Chapter 1", variant: "B", question: "Solve: 3x - 7 = 14" },
  { id: "2A", className: "Class 11", subject: "Physics", title: "Mechanics", chapter: "Chapter 2", variant: "A", question: "Which of the following is a valid Python variable name?" },
  { id: "3A", className: "Class 12", subject: "Chemistry", title: "Organic Chemistry", chapter: "Chapter 3", variant: "A", question: "Analyze the theme of revenge in Hamlet and its impact on the main characters." },
  { id: "4A", className: "Class 10", subject: "Biology", title: "Human Anatomy", chapter: "Chapter 4", variant: "A", question: "Which of the following is NOT a current asset?" },
  { id: "5A", className: "Class 11", subject: "Computer Science", title: "Data Structures", chapter: "Chapter 5", variant: "A", question: "Which of the following is NOT guaranteed under Article 19?" },
];

import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper to detect Math/Maths subject (case/space insensitive)
const isMathSubjectValue = (subject?: string): boolean => {
  if (!subject) return false;
  const subjectLower = String(subject).trim().toLowerCase();
  return subjectLower === 'math' || subjectLower === 'maths' || subjectLower === 'mathematics';
};

// Helper to unescape LaTeX backslashes from API response
const unescapeLatex = (text: string | undefined): string => {
  if (!text || typeof text !== 'string') return text || '';
  // Replace double backslashes with single backslash
  return text.replace(/\\\\/g, '\\');
};

// Helper to format marks - converts .5 decimals to fraction format
const formatMarks = (marks: number | undefined | null): string => {
  if (marks === undefined || marks === null) return '0';
  const num = Number(marks);
  if (isNaN(num)) return String(marks);
  
  // Check if it's a whole number
  if (num % 1 === 0) {
    return String(num);
  }
  
  // Check if decimal part is exactly 0.5
  const decimalPart = num % 1;
  if (Math.abs(decimalPart - 0.5) < 0.001) {
    const wholePart = Math.floor(num);
    if (wholePart === 0) {
      return '½';
    }
    return `${wholePart} ½`;
  }
  
  // For other decimals, return as is
  return String(num);
};

const Questions: React.FC = () => {
  const navigate = useNavigate();

  const [filterClass, setFilterClass] = React.useState<string | undefined>(undefined);
  const [filterSubject, setFilterSubject] = React.useState<string | undefined>(undefined);
  const [filterBook, setFilterBook] = React.useState<string | undefined>(undefined);
  const [filterBookName, setFilterBookName] = React.useState<string | undefined>(undefined);
  const [filterChapter, setFilterChapter] = React.useState<string | undefined>(undefined);
  const [searchValue, setSearchValue] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [rows, setRows] = React.useState<QuestionListItem[]>([]);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [total, setTotal] = React.useState<number>(0);
  const [subjectsOptions, setSubjectsOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = React.useState<boolean>(false);
  const [booksOptions, setBooksOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [booksLoading, setBooksLoading] = React.useState<boolean>(false);
  const [chaptersOptions, setChaptersOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [chaptersLoading, setChaptersLoading] = React.useState<boolean>(false);
  const [viewModalVisible, setViewModalVisible] = React.useState(false);
  const [selectedQuestion, setSelectedQuestion] = React.useState<QuestionListItem | null>(null);

  const classOptions = React.useMemo(() => (
    [
      { value: "0", label: "0" },
      { value: "LKG", label: "LKG" },
      { value: "UKG", label: "UKG" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
      { value: "5", label: "5" },
      { value: "6", label: "6" },
      { value: "7", label: "7" },
      { value: "8", label: "8" },
    ]
  ), []);

  const filtered = rows; // server-driven list

  React.useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    fetchQuestions({
      q: undefined,
      cls: undefined,
      subj: undefined,
      book: undefined,
      chapter: undefined,
      page: 1,
      pageSize,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const data = await GET(API.ALL_SUBJECTS);
      const list = Array.isArray(data?.results)
        ? data.results.map((s: any) => ({ value: s.subject, label: s.subject }))
        : Array.isArray(data?.subjects)
          ? data.subjects.map((s: any) => ({ value: s.name ?? s.subject, label: s.name ?? s.subject }))
          : [];
      setSubjectsOptions(list);
    } catch (e) {
      setSubjectsOptions([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchBooks = async (cls?: string, subj?: string) => {
    if (!cls || !subj) { setBooksOptions([]); return; }
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
      const options = (list as any[])
        .map((item: any) => {
          const id = item?.id || item?._id;
          const name = item?.book || item?.title || item?.name;
          return id && name ? { value: String(id), label: String(name) } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;
      setBooksOptions(options);
    } catch (e) {
      setBooksOptions([]);
    } finally {
      setBooksLoading(false);
    }
  };

  const fetchChapters = async (cls?: string, subj?: string, bookId?: string) => {
    if (!cls || !subj || !bookId) { setChaptersOptions([]); return; }
    try {
      setChaptersLoading(true);
      setChaptersOptions([]);
      const data = await GET('/chaptersr', { class: cls, subject: subj, book: bookId });
      const chaptersArray = Array.isArray(data?.results) && data.results.length > 0
        ? data.results[0]?.chapters || []
        : Array.isArray(data?.chapters)
          ? data.chapters
          : Array.isArray(data)
            ? data
            : [];
      const options = (chaptersArray as any[])
        .map((ch: any) => {
          const chapterName = typeof ch === 'string' ? ch : (ch?.chapterName || ch?.name || ch?.title || '');
          return chapterName ? { value: String(chapterName), label: String(chapterName) } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;
      setChaptersOptions(options);
    } catch (e) {
      setChaptersOptions([]);
    } finally {
      setChaptersLoading(false);
    }
  };

  const fetchQuestions = async (opts?: { q?: string; cls?: string; subj?: string; book?: string; chapter?: string; page?: number; pageSize?: number }) => {
    try {
      setLoading(true);
      const size = opts?.pageSize ?? pageSize ?? 10;
      const page = opts?.page ?? currentPage ?? 1;
      const query: any = { limit: size, page };
      if (opts?.q) query.q = opts.q;
      if (opts?.cls) query.className = opts.cls;
      if (opts?.subj) query.subject = opts.subj;
      if (opts?.book) query.book = opts.book;
      if (opts?.chapter) query.chapters = opts.chapter;
      const data = await GET(API.QUESTION, query);
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []));
      const mapped: QuestionListItem[] = list.map((r: any, idx: number) => {
        const id = r?._id || r?.id || `${page}-${idx}`;
        const quizId = r?.quizId || r?._id || r?.id || `${page}-${idx}`;
        const className = r?.className || r?.class || r?.class_name || "";
        const subject = r?.subject || "";
        const title = r?.book || r?.title || "";
        const chapter = r?.chapter || r?.chapterName || "";
        const question = r?.question || r?.questionText || "";
        const questionType = r?.questionType || "";
        const qtitle = r?.qtitle || r?.questionTitle || "";
        const imageUrl = r?.imageUrl || null;
        const marks = r?.marks || 0;
        const options = r?.options || [];
        const correctAnswer = r?.correctAnswer;
        const section = r?.section;

        // Preserve all question fields (question1, question2, etc.) and subQuestions for picture questions
        const baseItem: any = {
          id,
          quizId,
          className,
          subject,
          title,
          chapter,
          question,
          variant: r?.variant || "",
          questionType,
          qtitle,
          imageUrl,
          marks,
          options,
          correctAnswer,
          section
        };

        // Add question1, question2, etc. if they exist
        for (let i = 1; i <= 5; i++) {
          const qKey = `question${i}`;
          if (r[qKey] !== undefined) {
            baseItem[qKey] = r[qKey];
          }
        }

        // Add subQuestions if they exist
        if (r?.subQuestions) {
          baseItem.subQuestions = r.subQuestions;
        }

        return baseItem as QuestionListItem;
      });
      setRows(mapped);
      setTotal(data?.total || data?.count || mapped.length);
    } catch (e: any) {
      setRows([]);
      message.error(e?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  // Handle view question
  const handleViewQuestion = (record: QuestionListItem) => {
    setSelectedQuestion(record);
    setViewModalVisible(true);
  };

  // Handle delete question
  const handleDeleteQuestion = async (quizId: string) => {
    try {
      await DELETE(`${API.QUIZ_ITEMS}/${quizId}`);
      message.success('Question deleted successfully!');
      // Refresh the questions list
      fetchQuestions({
        q: searchValue || undefined,
        cls: filterClass,
        subj: filterSubject,
        book: filterBookName,
        chapter: filterChapter,
        page: currentPage,
        pageSize,
      });
    } catch (error: any) {
      console.error('Failed to delete question:', error);
      message.error('Failed to delete question. Please try again.');
    }
  };

  const columns: any[] = [
    {
      title: "Question",
      dataIndex: "question",
      key: "question",
      width: 450,
      render: (text: string, record: QuestionListItem) => {
        if (!text) return "";
        const isMath = isMathSubjectValue(record.subject);
        if (isMath) {
          try {
            return (
              <div className="math-preview" onClick={(e) => e.stopPropagation()}>
                <InlineMath math={`\\mathrm{${unescapeLatex(text)}}`} />
              </div>
            );
          } catch (e) {
            return text;
          }
        }
        return text;
      }
    },
    {
      title: "Question Type",
      dataIndex: "questionType",
      key: "questionType",
      width: 140,
      render: (value: string) => {
        const normalizedValue = value?.toLowerCase();
        const typeColors: Record<string, string> = {
          'mcq': 'blue',
          'multiple choice': 'blue',
          'fillblank': 'green',
          'direct questions': 'green',
          'shortanswer': 'orange',
          'answer the following questions': 'orange',
          'essay': 'purple',
          'image': 'cyan',
          'picture questions': 'cyan'
        };
        return <Tag color={typeColors[normalizedValue] || typeColors[value] || 'default'}>{value?.toUpperCase()}</Tag>;
      }
    },
    {
      title: "Class",
      dataIndex: "className",
      key: "className",
      width: 120,
      render: (value: string) => <Tag color="geekblue">{value}</Tag>
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      width: 140,
      render: (value: string) => <Tag color="magenta">{value}</Tag>
    },
    {
      title: "Book",
      dataIndex: "title",
      key: "title",
      width: 180,
      render: (value: string) => <Tag color="cyan">{value}</Tag>
    },
    {
      title: "Chapter",
      dataIndex: "chapter",
      key: "chapter",
      width: 160,
      render: (value: string) => <Tag color="purple">{value}</Tag>
    },

    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_: unknown, record: QuestionListItem) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<FaRegEye color="black" size={16} />}
            size="small"
            onClick={() => handleViewQuestion(record)}
            title="View"
          />
          <Button
            type="link"
            icon={<FaEdit color="orange" size={16} />}
            size="small"
            onClick={() => navigate(`/questionform/${record.quizId}`)}
            title="Edit"
          />
          <Popconfirm
            title="Are you sure you want to delete this question?"
            onConfirm={() => handleDeleteQuestion(record.quizId)}
            okButtonProps={{ danger: true }}
            okText="Yes, Delete"
            cancelText="No"

          >
            <Tooltip title="Delete Question">
              <Button
                type="link"
                icon={<MdDeleteOutline size={18} color="red" />}
                size="small"
                title="Delete"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Questions" backButton={true}>
        <Select
          placeholder="Filter by Class"
          allowClear
          showSearch
          style={{ width: 180, marginRight: 8 }}
          onChange={(value) => {
            setFilterClass(value);
            // Reset dependent filters
            setFilterBook(undefined);
            setFilterBookName(undefined);
            setFilterChapter(undefined);
            setBooksOptions([]);
            setChaptersOptions([]);
            // Fetch books if both class and subject are selected
            if (value && filterSubject) {
              fetchBooks(value, filterSubject);
            }
            fetchQuestions({ q: searchValue, cls: value, subj: filterSubject, book: undefined, chapter: undefined, page: 1, pageSize });
            setCurrentPage(1);
          }}
          className="font-local2"
          options={classOptions}
          value={filterClass}
        />
        <Select
          placeholder="Filter by Subject"
          allowClear
          showSearch
          style={{ width: 180, marginRight: 8 }}
          onChange={(value) => {
            setFilterSubject(value);
            // Reset dependent filters
            setFilterBook(undefined);
            setFilterBookName(undefined);
            setFilterChapter(undefined);
            setBooksOptions([]);
            setChaptersOptions([]);
            if (filterClass && value) {
              fetchBooks(filterClass, value);
            }
            fetchQuestions({ q: searchValue, cls: filterClass, subj: value, book: undefined, chapter: undefined, page: 1, pageSize });
            setCurrentPage(1);
          }}
          className="font-local2"
          options={subjectsOptions}
          loading={subjectsLoading}
          value={filterSubject}
        />
        <Select
          placeholder="Filter by Book"
          allowClear
          showSearch
          style={{ width: 200, marginRight: 8 }}
          onChange={(value, option: any) => {
            setFilterBook(value);
            const bookName = option?.label ?? value;
            setFilterBookName(bookName);
            // Reset chapter when book changes
            setFilterChapter(undefined);
            setChaptersOptions([]);
            if (filterClass && filterSubject && value) {
              fetchChapters(filterClass, filterSubject, value);
            }
            fetchQuestions({ q: searchValue, cls: filterClass, subj: filterSubject, book: bookName, chapter: undefined, page: 1, pageSize });
            setCurrentPage(1);
          }}
          className="font-local2"
          options={booksOptions}
          loading={booksLoading}
          disabled={!filterClass || !filterSubject || booksLoading}
          value={filterBook}
        />
        <Select
          placeholder="Filter by Chapter"
          allowClear
          showSearch
          style={{ width: 200, marginRight: 8 }}
          onChange={(value) => {
            setFilterChapter(value);
            fetchQuestions({ q: searchValue, cls: filterClass, subj: filterSubject, book: filterBookName, chapter: value, page: 1, pageSize });
            setCurrentPage(1);
          }}
          className="font-local2"
          options={chaptersOptions}
          loading={chaptersLoading}
          disabled={!filterClass || !filterSubject || !filterBook || chaptersLoading}
          value={filterChapter}
        />
        <Input
          placeholder="Search by name"
          allowClear
          prefix={<IoIosSearch className="text-gray-400" />}
          value={searchValue}
          onChange={(e) => {
            const val = e.target.value;
            setSearchValue(val);
            fetchQuestions({
              q: val,
              cls: filterClass,
              subj: filterSubject,
              book: filterBookName,
              chapter: filterChapter,
              page: 1,
              pageSize,
            });
            setCurrentPage(1);
          }}
          className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none w-56"
          style={{
            backgroundColor: "#f9fafb",
            color: "#374151",
            border: "1px solid #d1d5db",
            marginRight: 8,
          }}
        />

        <Button
          type="primary"
          size="medium"
          style={{ backgroundColor: "#007575", borderColor: "#007575" }}
          onClick={() => navigate(`/questionform/new`)}
        >
          Create new
        </Button>
      </PageHeader>

      <Table
        className="mt-4"
        rowKey={(row: QuestionListItem) => row.id}
        columns={columns as any}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: 1500 }}
        pagination={{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total: any, range: any) => `${range[0]}-${range[1]} of ${total} items`
        }}
        onChange={(pagination) => {
          const newPage = pagination.current || currentPage;
          const newPageSize = pagination.pageSize || pageSize;
          if (newPageSize !== pageSize) setPageSize(newPageSize);
          if (newPage !== currentPage) setCurrentPage(newPage);
          fetchQuestions({
            q: searchValue || undefined,
            cls: filterClass,
            subj: filterSubject,
            book: filterBookName,
            chapter: filterChapter,
            page: newPage,
            pageSize: newPageSize,
          });
        }}
      />

      {/* View Question Modal */}
      <Modal
        title="Question Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedQuestion(null);
        }}
        width={800}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setViewModalVisible(false);
              setSelectedQuestion(null);
            }}
          >
            Close
          </Button>,
        ]}
      >
        {selectedQuestion && (() => {
          // Check if it's a picture question type
          const isPictureQuestion = selectedQuestion.questionType?.toLowerCase() === 'picture questions' ||
            selectedQuestion.questionType?.toLowerCase() === 'image';
          // Check if it's the multi-question MCQ title ("Choose the correct answers")
          const isMultiQuestionMcq = (
            (selectedQuestion.questionType?.toLowerCase() === 'mcq' || selectedQuestion.questionType?.toLowerCase() === 'multiple choice')
            && selectedQuestion.qtitle === 'Choose the correct answers'
          );

          // Collect all questions for picture questions and multi-question MCQ from question, question1, question2, etc. fields
          let allQuestions: string[] = [];
          if (isPictureQuestion || isMultiQuestionMcq) {
            const questions: string[] = [];
            // Add question field if it exists and is not null
            if (selectedQuestion.question && selectedQuestion.question !== null && selectedQuestion.question !== 'null' && String(selectedQuestion.question).trim().length > 0) {
              questions.push(String(selectedQuestion.question));
            }
            // Add question1, question2, etc. if they exist and are not null
            // Access dynamic fields using bracket notation with any type
            const questionData = selectedQuestion as any;
            for (let i = 1; i <= 5; i++) {
              const qKey = `question${i}`;
              const qValue = questionData[qKey];
              if (qValue !== null && qValue !== undefined && qValue !== 'null' && String(qValue).trim().length > 0) {
                questions.push(String(qValue));
              }
            }
            allQuestions = questions;
          }

          const hideSingleQuestion =
            (selectedQuestion.questionType?.toLowerCase() === 'direct questions' ||
              selectedQuestion.questionType?.toLowerCase() === 'fillblank') &&
            selectedQuestion.qtitle === 'Tick the odd one in the following';

          const sectionLabels: Record<string, string> = {
            SectionA: 'Section A (Reading)',
            SectionB: 'Section B (Writing)',
            SectionC: 'Section C (Grammer)',
            SectionD: 'Section D (Textual Questions)',
          };
          const displaySectionLabel = selectedQuestion.section ? (sectionLabels[selectedQuestion.section] || selectedQuestion.section) : null;

          return (
            <div className="space-y-4">
              {/* Section (for English questions that have section) */}

              {/* Display questions - multiple for picture questions, single for others */}
              {(isPictureQuestion || isMultiQuestionMcq) && allQuestions.length > 0 ? (
                <div>
                  <strong>Questions:</strong>
                  <div className="mt-2 space-y-2">
                    {allQuestions.map((q, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <span className="font-medium mr-2">{index + 1}.</span>
                        <span>
                          {isMathSubjectValue(selectedQuestion.subject) ? <InlineMath math={`\\mathrm{${unescapeLatex(q)}}`} /> : q}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (!hideSingleQuestion && selectedQuestion.question && selectedQuestion.question !== 'null' && selectedQuestion.question.trim().length > 0) ? (
                <div>
                  <strong>Question:</strong>
                  <div className="mt-1 p-3 bg-gray-50 rounded">
                    {isMathSubjectValue(selectedQuestion.subject) ? <InlineMath math={`\\mathrm{${unescapeLatex(selectedQuestion.question)}}`} /> : selectedQuestion.question}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Class:</strong>
                  <Tag color="geekblue" className="ml-2">{selectedQuestion.className}</Tag>
                </div>
                <div>
                  <strong>Subject:</strong>
                  <Tag color="magenta" className="ml-2">{selectedQuestion.subject}</Tag>
                </div>
                <div>
                  <strong>Book:</strong>
                  <Tag color="cyan" className="ml-2">{selectedQuestion.title}</Tag>
                </div>
                <div>
                  <strong>Chapter:</strong>
                  <span className="ml-2">{selectedQuestion.chapter}</span>
                </div>
                <div>
                  <strong>Question Type:</strong>
                  <Tag color={
                    (() => {
                      const normalizedType = selectedQuestion.questionType?.toLowerCase();
                      if (normalizedType === 'mcq' || normalizedType === 'multiple choice') return 'blue';
                      if (normalizedType === 'fillblank' || normalizedType === 'direct questions') return 'green';
                      if (normalizedType === 'shortanswer' || normalizedType === 'answer the following questions') return 'orange';
                      if (normalizedType === 'essay') return 'purple';
                      if (normalizedType === 'image' || normalizedType === 'picture questions') return 'cyan';
                      return 'default';
                    })()
                  } className="ml-2">
                    {selectedQuestion.questionType?.toUpperCase()}
                  </Tag>
                </div>
                <div>
                  <strong>Marks:</strong>
                  <span className="ml-2 font-semibold">{formatMarks(selectedQuestion.marks)}</span>
                </div>
                {selectedQuestion.qtitle && (
                  <div className="col-span-2">
                    <strong>Question Title:</strong>
                    <span className="ml-2">{selectedQuestion.qtitle}</span>
                  </div>
                )}
                {displaySectionLabel && (
                  <div>
                    <strong>Section:</strong> <span>{displaySectionLabel}</span>
                  </div>
                )}
              </div>

              {((selectedQuestion.questionType?.toLowerCase() === 'mcq' ||
                selectedQuestion.questionType?.toLowerCase() === 'multiple choice' ||
                selectedQuestion.questionType === 'Multiple Choice' ||
                (selectedQuestion.questionType === 'Direct Questions' && selectedQuestion.qtitle === 'Tick the odd one in the following') ||
                (selectedQuestion.questionType?.toLowerCase() === 'direct questions' && selectedQuestion.qtitle === 'Match the following')) &&
                selectedQuestion.options && selectedQuestion.options.length > 0) && (
                  <div>
                    <strong>Options:</strong>
                    <div className="mt-2 space-y-2">
                      {selectedQuestion.options.map((option: any, index: number) => {
                        // Handle different option structures
                        const optionText = option?.text || option?.label || option || '';
                        const isCorrect = option?.isCorrect ||
                          (Array.isArray(selectedQuestion.correctAnswer) && selectedQuestion.correctAnswer.includes(index)) ||
                          selectedQuestion.correctAnswer === index;

                        return (
                          <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                            <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                            <span className="flex-1">
                              {isMathSubjectValue(selectedQuestion.subject) ? <InlineMath math={`\\mathrm{${unescapeLatex(optionText)}}`} /> : optionText}
                            </span>
                            {isCorrect && (
                              <Tag color="green" size="small">Correct</Tag>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {((selectedQuestion.questionType === 'image' && selectedQuestion.imageUrl) ||
                (selectedQuestion.questionType?.toLowerCase() === 'picture questions' && selectedQuestion.imageUrl) ||
                (selectedQuestion.questionType?.toLowerCase() === 'direct questions' &&
                  selectedQuestion.qtitle === 'Match the following' &&
                  selectedQuestion.imageUrl)) && (
                  <div>
                    <strong>Image:</strong>
                    <div className="mt-2">
                      <Image
                        src={selectedQuestion.imageUrl}
                        alt="Question Image"
                        className="rounded border"
                        style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain' }}
                        preview={{
                          src: selectedQuestion.imageUrl,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>
          );
        })()}
      </Modal>

    </>
  );
};

export default Questions;



