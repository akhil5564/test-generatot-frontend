
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Form, Input, Select, Button, Card, Row, Col, Space, Divider, InputNumber, Upload, message, Modal, Spin } from "antd";
import { PlusOutlined, MinusCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/Components/common/PageHeader";
import axios from "axios";
import { API, GET, BASE_URL } from "@/Components/common/api";
import MathInput from "./MathInput";
// Cropping functionality removed

const { Option } = Select;
const { TextArea } = Input;

const QuestionForm = () => {
  const [form] = Form.useForm();
  const { id: quizId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = quizId && quizId !== 'new';
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedClass, setSelectedClass] = React.useState<string | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = React.useState<string | undefined>(undefined);
  const [booksOptions, setBooksOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [subjectsOptions, setSubjectsOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = React.useState<boolean>(false);
  const [booksLoading, setBooksLoading] = React.useState<boolean>(false);
  const [selectedBook, setSelectedBook] = React.useState<string | undefined>(undefined);
  const [selectedBookName, setSelectedBookName] = React.useState<string | undefined>(undefined);
  const [selectedChapter, setSelectedChapter] = React.useState<string | undefined>(undefined);
  const [chaptersOptions, setChaptersOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [chaptersLoading, setChaptersLoading] = React.useState<boolean>(false);
  const [uploadingImages, setUploadingImages] = React.useState<Record<number, boolean>>({});
  const [loadingQuestionData, setLoadingQuestionData] = React.useState<boolean>(false);

  // Image upload modal states
  const [imageModalVisible, setImageModalVisible] = React.useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState<number | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imgSrc, setImgSrc] = React.useState<string>('');

  // Simple image preview utility
  const onImageLoad = (img: HTMLImageElement) => {
    console.log('Image loaded for preview:', img);
  };

  // Fetch question data for editing
  const fetchQuestionData = async (quizId: string) => {
    try {
      setLoadingQuestionData(true);
      const response = await GET(`${API.QUIZ_ITEMS}/${quizId}`);
      if (response) {
        return response;
      }
    } catch (error) {
      console.error('Failed to fetch question data:', error);
      message.error('Failed to load question data');
    } finally {
      setLoadingQuestionData(false);
    }
    return null;
  };

  // Selector options adapted to Class/Subject/Title/Chapter
  const classOptions = [
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
  ];

  // Helper to detect English subject (case/space insensitive)
  const isEnglishSubjectValue = (subject?: string) => {
    if (!subject) return false;
    return String(subject).trim().toLowerCase() === 'english';
  };

  // Helper to detect Math/Maths subject (case/space insensitive)
  const isMathSubjectValue = (subject?: string) => {
    if (!subject) return false;
    const subjectLower = String(subject).trim().toLowerCase();
    return subjectLower === 'math' || subjectLower === 'maths' || subjectLower === 'mathematics';
  };

  // Helper to unescape LaTeX backslashes from API response
  // API returns: "x^2\\ is\\ a" -> MathInput needs: "x^2\ is\ a"
  const unescapeLatex = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    // Replace double backslashes with single backslash
    return text.replace(/\\\\/g, '\\');
  };

  // Helper to ensure LaTeX format is correct for API
  // MathInput provides: "x^2\ is\ a" -> API expects: "x^2\ is\ a" (JSON.stringify will handle escaping)
  const prepareLatexForApi = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    // Return as-is, JSON.stringify will handle escaping when sending
    return text;
  };

  // Helper to round marks to nearest 0.5 increment
  // Examples: 1.4 → 1.5, 1.6 → 2, 3.2 → 3.5
  const roundMarks = (marks: number | undefined | null): number => {
    if (marks === undefined || marks === null) return 0;
    const num = Number(marks);
    if (isNaN(num)) return 0;
    
    // If it's already a whole number or exactly .5, return as is
    if (num % 1 === 0 || num % 1 === 0.5) {
      return num;
    }
    
    const wholePart = Math.floor(num);
    const decimalPart = num % 1;
    
    // If decimal part <= 0.5, round to wholePart + 0.5
    // If decimal part > 0.5, round to wholePart + 1.0
    if (decimalPart <= 0.5) {
      return wholePart + 0.5;
    } else {
      return wholePart + 1.0;
    }
  };

  // Fetch subjects similar to Chapters form
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

  React.useEffect(() => {
    fetchSubjects();
  }, []);




  // Force re-render state for question type changes
  const [questionTypeChangeKey, setQuestionTypeChangeKey] = React.useState(0);

  // Mapping from internal question type keys to display labels
  const QUESTION_TYPE_LABELS: Record<string, string> = {
    mcq: 'Multiple Choice',
    fillblank: 'Direct Questions',
    shortanswer: 'Answer the following questions',
    image: 'Picture questions',
  };

  // Question title options based on question type
  const questionTitleOptions: Record<string, Array<{ value: string; label: string }>> = {
    mcq: [
      {
        value: "Choose the correct answer from the brackets and fill in the blanks",
        label: "Choose the correct answer from the brackets and fill in the blanks",
      },
      {
        value: "Tick the correct answers",
        label: "Tick the correct answers",
      },
      {
        value: "Choose the correct answers",
        label: "Choose the correct answers",
      },
    ],
    fillblank: [
      {
        value: "Fill in the blanks with correct answers",
        label: "Fill in the blanks with correct answers",
      },
      {
        value: "Write true or false",
        label: "Write true or false",
      },
      {
        value: "Name the following",
        label: "Name the following",
      },
      {
        value: "Tick the odd one in the following",
        label: "Tick the odd one in the following",
      },
      {
        value: "Match the following",
        label: "Match the following",
      },
      {
        value: "Give one word of the following",
        label: "Give one word of the following",
      },
    ],
    shortanswer: [
      {
        value: "Define the following",
        label: "Define the following",
      },
      {
        value: "Short Answer Questions",
        label: "Short Answer Questions",
      },
      {
        value: "Long Answer Questions",
        label: "Long Answer Questions",
      },
      {
        value: "Paragraph Writing",
        label: "Paragraph Writing",
      },
      {
        value: "Essay Writing",
        label: "Essay Writing",
      },
      {
        value: "Letter Writing",
        label: "Letter Writing",
      },
    ],
    image: [
      {
        value: "Identity the pictures",
        label: "Identity the pictures",
      },
      {
        value: "Look at the pictures and answer the following",
        label: "Look at the pictures and answer the following",
      },
      {
        value: "Describe the following picture.",
        label: "Describe the following picture.",
      },
    ],
  };

  const handleFinish = async (values: any) => {
    try {
      setSubmitting(true);

      // Validate image questions have images
      const questions = values?.questions || [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const isImageLike =
          q?.questionType === 'image' ||
          (q?.questionType === 'fillblank' &&
            q?.questionTitle === 'Match the following');

        if (isImageLike) {
          const hasImage =
            q?.imageFileList?.[0]?.url ||
            q?.imageFileList?.[0]?.thumbUrl ||
            q?.imageUrl;
          if (!hasImage) {
            message.error(`Please upload an image for question ${i + 1}`);
            setSubmitting(false);
            return;
          }
        }
      }

      // Normalize questions
      const normalizedQuestions = questions.map((q: any) => {
        const internalType = q?.questionType;
        const normalized: any = {
          // Send the user-facing label in the API
          questionType: QUESTION_TYPE_LABELS[internalType] || internalType,
          qtitle: q?.questionTitle,
          marks: roundMarks(q?.marks),
        };

        // Include section field if present (for English subjects)
        if (q?.section) {
          normalized.section = q.section;
        }

        const isMultiQuestionMcq =
          internalType === 'mcq' &&
          q?.questionTitle === 'Choose the correct answers';

        // For picture questions (and multi-question MCQ), send separate question fields (question, question1, question2, etc.)
        if ((internalType === 'image' || isMultiQuestionMcq) && Array.isArray(q?.subQuestions) && q.subQuestions.length > 0) {
          const subTexts = q.subQuestions
            .map((sq: any) => (sq?.text || '').trim())
            .filter((t: string) => t.length > 0);

          // Set question for first sub-question
          if (subTexts.length > 0) {
            normalized.question = subTexts[0];
          }

          // Set question1, question2, etc. for remaining sub-questions
          for (let i = 1; i < subTexts.length; i++) {
            normalized[`question${i}`] = subTexts[i];
          }

          normalized.subQuestions = q.subQuestions.map((sq: any) => ({ text: sq?.text || '' }));
        } else if (
          internalType === 'fillblank' &&
          q?.questionTitle === 'Tick the odd one in the following'
        ) {
          // Backend requires question field; set a placeholder when not provided
          normalized.question = 'Tick the odd one in the following';
        } else {
          // For other questions, set the question field normally
          normalized.question = q?.question;
        }

        if (
          internalType === 'mcq' ||
          (internalType === 'fillblank' &&
            q?.questionTitle === 'Tick the odd one in the following')
        ) {
          normalized.options = (q?.options || []).map((opt: any) => ({ text: opt?.text || '' }));
          normalized.correctAnswer = q?.correctAnswer;
        }

        if (
          (internalType === 'fillblank' &&
            q?.questionTitle !== 'Tick the odd one in the following') ||
          internalType === 'shortanswer' ||
          internalType === 'essay'
        ) {
          normalized.correctAnswer = q?.correctAnswer;
        }

        const isImageLike =
          internalType === 'image' ||
          (internalType === 'fillblank' &&
            q?.questionTitle === 'Match the following');

        if (isImageLike) {
          const fileUrl =
            q?.imageFileList?.[0]?.url ||
            q?.imageFileList?.[0]?.thumbUrl ||
            q?.image ||
            null;
          normalized.imageUrl = fileUrl;
        } else {
          normalized.imageUrl = null;
        }

        return normalized;
      });

      // Resolve book name (send name, not id)
      const resolvedBookName = selectedBookName || (booksOptions.find(b => b.value === values?.book)?.label) || values?.book;

      // Build payload (no examType here, backend doesn't use it)
      const payload = {
        className: isEdit ? selectedClass : values?.className,
        subject: isEdit ? selectedSubject : values?.subject,
        title: isEdit ? selectedBookName : resolvedBookName,
        book: isEdit ? selectedBookName : resolvedBookName,
        chapter: isEdit ? selectedChapter : values?.chapter,
        status: values?.status ?? true,
        questions: normalizedQuestions,
      };

      console.log("REQ BODY >>>", payload);

      if (!isEdit) {
        await axios.post(`${BASE_URL}${API.QUIZ_ITEMS}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success("Questions created successfully!");

        // Reset only questions, keep class, subject, book, and chapter selected
        form.setFieldsValue({
          questions: [{}]
        });

        // Keep the form values for class, subject, book, and chapter
        // They are already set in the form, so no need to reset them
      } else {
        await axios.put(`${BASE_URL}${API.QUIZ_ITEMS}/${quizId}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success("Questions updated successfully!");

        // For edit mode, navigate back to questions list
        const q = searchParams.get('q');
        navigate(`/questions${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      }
    } catch (error: any) {
      console.error("Failed to submit questions", error);
      const description =
        error?.response?.data?.message || error?.message || "Something went wrong";
      message.error(`Failed to submit questions: ${description}`);
    } finally {
      setSubmitting(false);
    }
  };


  const handleCancel = () => {
    const q = searchParams.get('q');
    navigate(`/questions${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  // Removed dependency handlers; selectors are independent now





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
          if (typeof item === 'string') {
            return { value: item, label: item };
          }
          const label = item?.book || item?.title || item?.name || "";
          const value = item?._id || item?.id || item?.code || label;
          return label ? { value: String(value), label: String(label) } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;
      setBooksOptions(options);
    } catch (e) {
      setBooksOptions([]);
    } finally {
      setBooksLoading(false);
    }
  };

  const onChangeClass = (value: string) => {
    setSelectedClass(value);
    form.setFieldValue('book', undefined);
    setBooksOptions([]);
    if (value && selectedSubject) {
      fetchBooks(value, selectedSubject);
    }
  };

  const onChangeSubject = (value: string) => {
    setSelectedSubject(value);
    form.setFieldValue('book', undefined);
    setBooksOptions([]);
    if (selectedClass && value) {
      fetchBooks(selectedClass, value);
    }
    // reset chapter when dependency changes
    form.setFieldValue('chapter', undefined);
    setChaptersOptions([]);
  };

  const fetchChapters = async (cls?: string, subj?: string, bookId?: string) => {
    if (!cls || !subj || !bookId) return;
    try {
      setChaptersLoading(true);
      setChaptersOptions([]);
      // Using GET helper with direct path
      const data = await GET('/chaptersr', { class: cls, subject: subj, book: bookId });
      // Expected shape (per sample): { results: [{ chapters: [{ chapterName, _id }, ...] }] }
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

  const onChangeBook = (value: string, option: any) => {
    setSelectedBook(value);
    const bookName = option?.label ?? value;
    setSelectedBookName(bookName);
    // reset chapter when book changes
    form.setFieldValue('chapter', undefined);
    setChaptersOptions([]);
    if (selectedClass && selectedSubject && value) {
      fetchChapters(selectedClass, selectedSubject, value);
    }
  };

  // Chapters are fetched only when book changes



  // Handle image selection - open modal for cropping
  const handleImageSelect = (file: File, questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex);
    setSelectedFile(file);

    // Create image URL for preview
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result as string);
      setImageModalVisible(true);
    });
    reader.readAsDataURL(file);

    return false; // Prevent default upload
  };

  // Handle modal cancel - clear image selection
  const handleModalCancel = () => {
    setImageModalVisible(false);
    setCurrentQuestionIndex(null);
    setSelectedFile(null);
    setImgSrc('');

    // Clear the image from form if modal was cancelled
    if (currentQuestionIndex !== null) {
      const questions = form.getFieldValue('questions') || [];
      if (questions[currentQuestionIndex]) {
        questions[currentQuestionIndex] = {
          ...questions[currentQuestionIndex],
          imageUrl: null,
          imageFileList: []
        };
        form.setFieldValue('questions', questions);
      }
    }
  };

  // Handle final image upload
  const handleImageUpload = async () => {
    if (!selectedFile || currentQuestionIndex === null) {
      message.error('Please select an image');
      return;
    }

    try {
      setUploadingImages(prev => ({ ...prev, [currentQuestionIndex]: true }));

      // Create form data with original image
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await axios.post(`${BASE_URL}${API.UPLOAD}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        // Update the form with the uploaded image URL
        const questions = form.getFieldValue('questions') || [];
        if (questions[currentQuestionIndex]) {
          questions[currentQuestionIndex] = {
            ...questions[currentQuestionIndex],
            imageUrl: response.data.url,
            imageFileList: [{
              uid: selectedFile.name,
              name: selectedFile.name,
              status: 'done',
              url: response.data.url,
            }]
          };
          form.setFieldValue('questions', questions);
        }
        message.success('Image uploaded successfully!');

        // Close modal and reset state
        setImageModalVisible(false);
        setCurrentQuestionIndex(null);
        setSelectedFile(null);
        setImgSrc('');
      }
    } catch (error: any) {
      console.error('Image upload failed:', error);
      message.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImages(prev => ({ ...prev, [currentQuestionIndex]: false }));
    }
  };

  // Handle image removal
  const handleImageRemove = (questionIndex: number) => {
    const questions = form.getFieldValue('questions') || [];
    if (questions[questionIndex]) {
      questions[questionIndex] = {
        ...questions[questionIndex],
        imageUrl: null,
        imageFileList: []
      };
      form.setFieldValue('questions', questions);
    }
  };


  // Handle question type change to force re-render
  const handleQuestionTypeChange = (questionIndex: number, questionType: string) => {
    // Clear existing answer data when question type changes
    const questions = form.getFieldValue('questions') || [];
    const isMcq = questionType === 'mcq';
    const isImage = questionType === 'image';

    questions[questionIndex] = {
      ...questions[questionIndex],
      questionType,
      questionTitle: undefined,
      options: isMcq ? [{ text: '' }, { text: '' }] : undefined,
      subQuestions: isImage ? [{ text: '' }] : undefined,
      correctAnswer: undefined
    };
    form.setFieldValue('questions', questions);

    // Force re-render
    setQuestionTypeChangeKey(prev => prev + 1);
  };

  // Handle question title change (for special behaviours like odd-one-out)
  const handleQuestionTitleChange = (questionIndex: number, title: string) => {
    const questions = form.getFieldValue('questions') || [];
    const current = questions[questionIndex] || {};
    const questionType = current.questionType;

    const isOddOneOutFillBlank =
      questionType === 'fillblank' &&
      title === 'Tick the odd one in the following';

    const isMcqMultiQuestion =
      questionType === 'mcq' &&
      title === 'Choose the correct answers';

    // Ensure options exist for MCQ and for Direct Questions with odd-one-out title
    let nextOptions = current.options;
    if (questionType === 'mcq' || isOddOneOutFillBlank) {
      nextOptions =
        Array.isArray(current.options) && current.options.length > 0
          ? current.options
          : [{ text: '' }, { text: '' }];
    }

    const nextSubQuestions =
      isMcqMultiQuestion
        ? (Array.isArray(current.subQuestions) && current.subQuestions.length > 0
          ? current.subQuestions
          : [{ text: '' }])
        : (questionType === 'image'
          ? (Array.isArray(current.subQuestions) && current.subQuestions.length > 0
            ? current.subQuestions
            : [{ text: '' }])
          : undefined);

    questions[questionIndex] = {
      ...current,
      questionTitle: title,
      options: nextOptions,
      subQuestions: nextSubQuestions,
      // Clear correctAnswer on any title change
      correctAnswer: undefined,
    };

    form.setFieldValue('questions', questions);

    // Force re-render so MCQ-like UI appears/disappears correctly
    setQuestionTypeChangeKey(prev => prev + 1);
  };

  // Set initial values if editing
  React.useEffect(() => {
    const loadQuestionData = async () => {
      if (isEdit && quizId) {
        try {
          const questionData = await fetchQuestionData(quizId);
          if (questionData) {
            // Set form values with real API data
            const formData = {
              className: questionData.className,
              subject: questionData.subject,
              book: questionData.book || questionData.title,
              chapter: questionData.chapter,
              status: questionData.status ?? true,
              questions: (questionData.questions || []).map((q: any) => {
                // Map backend questionType (which may be a label) back to internal key
                const backendType: string = q.questionType;
                const internalType =
                  Object.entries(QUESTION_TYPE_LABELS).find(
                    ([, label]) => label === backendType,
                  )?.[0] || backendType;

                // Map qtitle (API field) back to questionTitle (form field)
                const questionTitle = q.qtitle || q.questionTitle;

                const mappedQuestion: any = {
                  questionType: internalType,
                  questionTitle: questionTitle,
                  question: isMathSubjectValue(isEdit ? selectedSubject : questionData.subject)
                    ? unescapeLatex(q.question)
                    : q.question,
                  marks: q.marks,
                };

                // Include section field if present (for English subjects)
                if (q?.section) {
                  mappedQuestion.section = q.section;
                }

                const isOddOneOutFillBlank =
                  internalType === 'fillblank' &&
                  questionTitle === 'Tick the odd one in the following';

                const isImageLike =
                  internalType === 'image' ||
                  (internalType === 'fillblank' &&
                    questionTitle === 'Match the following');

                // Handle MCQ-like options (including odd-one-out direct questions)
                if ((internalType === 'mcq' || isOddOneOutFillBlank) && q.options) {
                  const isMath = isMathSubjectValue(isEdit ? selectedSubject : questionData.subject);
                  mappedQuestion.options = q.options.map((opt: any) => ({
                    text: isMath && opt.text ? unescapeLatex(opt.text) : (opt.text || opt)
                  }));
                  mappedQuestion.correctAnswer = q.correctAnswer;
                }

                // Handle text-based answers (exclude odd-one-out which is MCQ-like)
                if (
                  ['fillblank', 'shortanswer', 'essay'].includes(internalType) &&
                  !(internalType === 'fillblank' && questionTitle === 'Tick the odd one in the following')
                ) {
                  mappedQuestion.correctAnswer = q.correctAnswer;
                }

                // Handle image questions (including Direct Questions with "Match the following")
                if (isImageLike && q.imageUrl) {
                  mappedQuestion.imageUrl = q.imageUrl;
                  mappedQuestion.imageFileList = [{
                    uid: '-1',
                    name: 'question-image',
                    status: 'done',
                    url: q.imageUrl,
                  }];
                }

                // For picture questions, rehydrate subQuestions if present,
                // or split the main question text by lines as a fallback.
                const isMath = isMathSubjectValue(isEdit ? selectedSubject : questionData.subject);
                if (internalType === 'image') {
                  if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                    mappedQuestion.subQuestions = q.subQuestions.map((sq: any) => ({
                      text: isMath ? unescapeLatex(sq?.text) : (sq?.text || '')
                    }));
                  } else if (typeof q.question === 'string' && q.question.trim().length > 0) {
                    const parts = q.question.split('\n').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
                    if (parts.length > 0) {
                      mappedQuestion.subQuestions = parts.map((t: string) => ({
                        text: isMath ? unescapeLatex(t) : t
                      }));
                    }
                  }
                } else if (
                  internalType === 'mcq' &&
                  questionTitle === 'Choose the correct answers'
                ) {
                  if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                    mappedQuestion.subQuestions = q.subQuestions.map((sq: any) => ({
                      text: isMath ? unescapeLatex(sq?.text) : (sq?.text || '')
                    }));
                  } else if (typeof q.question === 'string' && q.question.trim().length > 0) {
                    const parts = q.question.split('\n').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
                    if (parts.length > 0) {
                      mappedQuestion.subQuestions = parts.map((t: string) => ({
                        text: isMath ? unescapeLatex(t) : t
                      }));
                    }
                  }
                }

                return mappedQuestion;
              }),
            };

            form.setFieldsValue(formData);

            // Set dependent dropdowns
            if (questionData.className) {
              setSelectedClass(questionData.className);
            }
            if (questionData.subject) {
              setSelectedSubject(questionData.subject);
            }
            if (questionData.book || questionData.title) {
              setSelectedBook(questionData.book || questionData.title);
              setSelectedBookName(questionData.book || questionData.title);
            }
            if (questionData.chapter) {
              setSelectedChapter(questionData.chapter);
            }
          }
        } catch (error) {
          console.error('Failed to load question data:', error);
          message.error('Failed to load question data');
        }
      }
    };

    loadQuestionData();
  }, [form, isEdit, quizId]);

  // Render question type specific fields
  const renderQuestionTypeFields = (questionType: string, questionIndex: number) => {
    if (!questionType) return null;

    const questionTitle = form.getFieldValue(['questions', questionIndex, 'questionTitle']);
    const isOddOneOutFillBlank =
      questionType === 'fillblank' &&
      questionTitle === 'Tick the odd one in the following';

    const effectiveType = isOddOneOutFillBlank ? 'mcq' : questionType;

    switch (effectiveType) {
      case 'mcq':
        const isMultiQuestionMcq = questionTitle === 'Choose the correct answers';
        return (
          <div key={`mcq-${questionIndex}-${questionTypeChangeKey}`}>
            {isMultiQuestionMcq && (
              <Form.List name={[questionIndex, 'subQuestions']}>
                {(subFields, { add, remove }) => (
                  <>
                    {subFields.map(({ key: subKey, name: subName, ...subRestField }) => (
                      <Row key={subKey} gutter={16} align="middle" style={{ marginBottom: 16 }}>
                        <Col span={22}>
                          <Form.Item
                            {...subRestField}
                            name={[subName, 'text']}
                            label={subName === 0 ? 'Questions' : undefined}
                            rules={[{ required: true, message: 'Please enter question!' }]}
                          >
                            {isMathSubjectValue(isEdit ? selectedSubject : form.getFieldValue('subject')) ? (
                              <MathInput
                                rows={2}
                                placeholder="Enter your question"
                              />
                            ) : (
                              <TextArea
                                rows={2}
                                placeholder="Enter your question"
                              />
                            )}
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          {subFields.length > 1 && (
                            <Button
                              type="text"
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(subName)}
                              danger
                            />
                          )}
                        </Col>
                      </Row>
                    ))}
                    {subFields.length < 4 && (
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() => add({ text: '' })}
                          icon={<PlusOutlined />}
                          className="w-full"
                        >
                          Add Question
                        </Button>
                      </Form.Item>
                    )}
                  </>
                )}
              </Form.List>
            )}
            <Form.List name={[questionIndex, 'options']}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row key={key} gutter={16} align="middle">
                      <Col span={20}>
                        <Form.Item
                          {...restField}
                          name={[name, 'text']}
                          rules={[{ required: true, message: 'Please enter option text!' }]}
                        >
                          {isMathSubjectValue(isEdit ? selectedSubject : form.getFieldValue('subject')) ? (
                            <MathInput
                              rows={1}
                              placeholder={`Option ${name + 1}`}
                            />
                          ) : (
                            <Input
                              placeholder={`Option ${name + 1}`}
                            />
                          )}
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Button
                          type="text"
                          icon={<MinusCircleOutlined />}
                          onClick={() => {
                            remove(name);
                            // Clear correct answer if it references removed option
                            const currentAnswers = form.getFieldValue(['questions', questionIndex, 'correctAnswer']) || [];
                            const filteredAnswers = currentAnswers.filter((answer: number) => answer !== name);
                            form.setFieldValue(['questions', questionIndex, 'correctAnswer'], filteredAnswers);
                            // Force re-render
                            setQuestionTypeChangeKey(prev => prev + 1);
                          }}
                          danger
                          disabled={fields.length <= 2}
                        />
                      </Col>
                    </Row>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => {
                        add();
                        // Force re-render after adding option
                        setTimeout(() => {
                          setQuestionTypeChangeKey(prev => prev + 1);
                        }, 100);
                      }}
                      icon={<PlusOutlined />}
                      disabled={fields.length >= 6}
                      className="w-full"
                    >
                      Add Option
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

          </div>
        );

      case 'fillblank':
        return null;

      case 'shortanswer':
        return null;

      case 'essay':
        return null;

      case 'image':
        // Extra per-picture-question fields are handled inline in the card
        // (sub-questions list rendered instead of single question textarea)
        return null;

      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader title={isEdit ? "Edit Question" : "Add Question"} backButton={true} />

      <Card className="w-full mt-4 shadow-md">
        <Spin spinning={loadingQuestionData} tip="Loading question data...">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            className="font-local2"
            initialValues={{
              status: true,
              questions: [{}]
            }}
          >
            {/* Basic Information - Only show when creating new question */}
            {!isEdit && (
              <>
                <Row gutter={24}>
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                    <Form.Item
                      required={false}
                      name="className"
                      label="Class"
                      rules={[{ required: true, message: 'Please select a class!' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select class"
                        size="large"
                        options={classOptions}
                        onChange={onChangeClass}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                    <Form.Item
                      required={false}
                      name="subject"
                      label="Subject"
                      rules={[{ required: true, message: 'Please select a subject!' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select subject"
                        size="large"
                        options={subjectsOptions}
                        loading={subjectsLoading}
                        onChange={onChangeSubject}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                    <Form.Item
                      required={false}
                      name="book"
                      label="Book"
                      rules={[{ required: true, message: 'Please select a title!' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select book"
                        size="large"
                        allowClear
                        loading={booksLoading}
                        disabled={!selectedClass || !selectedSubject}
                        options={booksOptions}
                        onChange={onChangeBook}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                    <Form.Item
                      required={false}
                      name="chapter"
                      label="Chapter"
                      rules={[{ required: true, message: 'Please select a chapter!' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select chapter"
                        size="large"
                        allowClear
                        loading={chaptersLoading}
                        disabled={!selectedClass || !selectedSubject || !selectedBook}
                        options={chaptersOptions}
                      />
                    </Form.Item>
                  </Col>
                  {/* <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <Form.Item
                  required={false}
                    name="examType"
                    label="Exam Type"
                    rules={[{ required: true, message: 'Please select an exam type!' }]}
                  >
                    <Select 
                      placeholder="Select exam type" 
                      size="large"
                      options={examTypeOptions}
                    />
                  </Form.Item>
                </Col> */}

                </Row>
              </>
            )}

            <Divider orientation="left">Questions</Divider>

            {/* Dynamic Questions */}
            <Form.List name="questions">
              {(fields) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      className="mb-4"
                      style={{ backgroundColor: '#f8f9fa' }}

                    >
                      <Row gutter={16}>
                        {/* Show Section selector first when subject is English */}
                        {isEnglishSubjectValue(isEdit ? selectedSubject : form.getFieldValue('subject')) && (
                          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                            <Form.Item
                              required={true}
                              {...restField}
                              name={[name, 'section']}
                              label="Section"
                              rules={[{ required: true, message: 'Please select section!' }]}
                            >
                              <Select
                                size="large"
                                placeholder="Select section"
                                options={[
                                  { label: 'Section A (Reading)', value: 'SectionA' },
                                  { label: 'Section B (Writing)', value: 'SectionB' },
                                  { label: 'Section C (Grammer)', value: 'SectionC' },
                                  { label: 'Section D (Textual Questions)', value: 'SectionD' },
                                ]}
                                allowClear
                              />
                            </Form.Item>
                          </Col>
                        )}
                        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                          <Form.Item
                            required={false}
                            {...restField}
                            name={[name, 'questionType']}
                            label="Question Type"
                            rules={[{ required: true, message: 'Please select question type!' }]}
                          >
                            <Select
                              size="large"
                              placeholder="Select type"
                              onChange={(value) => handleQuestionTypeChange(name, value)}
                            >
                              <Option value="mcq">Multiple Choice (MCQ)</Option>
                              <Option value="fillblank">Direct Questions</Option>
                              <Option value="shortanswer">Answer the following questions</Option>
                              <Option value="image">Picture questions</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                          <Form.Item
                            required={true}
                            {...restField}
                            name={[name, 'questionTitle']}
                            label="Question Title"
                            rules={[{ required: true, message: 'Please select question title!' }]}
                          >
                            <Select
                              size="large"
                              placeholder="Select question title"
                              onChange={(value) => handleQuestionTitleChange(name, value)}
                              disabled={
                                !form.getFieldValue(['questions', name, 'questionType']) ||
                                !questionTitleOptions[
                                form.getFieldValue(['questions', name, 'questionType'])
                                ]
                              }
                              options={
                                questionTitleOptions[
                                form.getFieldValue(['questions', name, 'questionType'])
                                ] || []
                              }
                              allowClear
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                          <Form.Item
                            required={false}
                            {...restField}
                            name={[name, 'marks']}
                            label="Marks"
                            rules={[{ required: true, message: 'Please enter marks!' }]}
                          >
                            <InputNumber
                              size="large"
                              placeholder="Enter marks"
                              style={{ width: "100%" }}
                              min={1}
                              max={100}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      {form.getFieldValue(['questions', name, 'questionType']) && (
                        <>
                          {/* For Picture questions, allow multiple sub-questions under the same image */}
                          {form.getFieldValue(['questions', name, 'questionType']) === 'image' ? (
                            <Form.List name={[name, 'subQuestions']}>
                              {(subFields, { add, remove }) => (
                                <>
                                  {subFields.map(({ key: subKey, name: subName, ...subRestField }) => (
                                    <Row key={subKey} gutter={16} align="middle" style={{ marginBottom: 16 }}>
                                      <Col span={22}>
                                        <Form.Item
                                          required={false}
                                          {...subRestField}
                                          name={[subName, 'text']}
                                          label={subName === 0 ? 'Questions' : undefined}
                                          rules={[{ required: true, message: 'Please enter question!' }]}
                                        >
                                          {isMathSubjectValue(isEdit ? selectedSubject : form.getFieldValue('subject')) ? (
                                            <MathInput
                                              rows={2}
                                              placeholder="Enter your question"
                                            />
                                          ) : (
                                            <TextArea
                                              rows={2}
                                              placeholder="Enter your question"
                                            />
                                          )}
                                        </Form.Item>
                                      </Col>
                                      <Col span={2}>
                                        {subFields.length > 1 && (
                                          <Button
                                            type="text"
                                            icon={<MinusCircleOutlined />}
                                            onClick={() => remove(subName)}
                                            danger
                                          />
                                        )}
                                      </Col>
                                    </Row>
                                  ))}
                                  {subFields.length < 4 && (
                                    <Form.Item>
                                      <Button
                                        type="dashed"
                                        onClick={() => add({ text: '' })}
                                        icon={<PlusOutlined />}
                                        className="w-full"
                                      >
                                        Add Question
                                      </Button>
                                    </Form.Item>
                                  )}
                                </>
                              )}
                            </Form.List>
                          ) : form.getFieldValue(['questions', name, 'questionType']) === 'mcq' &&
                            form.getFieldValue(['questions', name, 'questionTitle']) === 'Choose the correct answers' ? null :
                            (form.getFieldValue(['questions', name, 'questionType']) === 'fillblank' &&
                              form.getFieldValue(['questions', name, 'questionTitle']) === 'Tick the odd one in the following') ? null : (
                              <Row gutter={16}>
                                <Col span={24}>
                                  <Form.Item
                                    required={false}
                                    {...restField}
                                    name={[name, 'question']}
                                    label="Question"
                                    rules={[{ required: true, message: 'Please enter question!' }]}
                                  >
                                    {isMathSubjectValue(isEdit ? selectedSubject : form.getFieldValue('subject')) ? (
                                      <MathInput
                                        rows={3}
                                        placeholder="Enter your question"
                                      />
                                    ) : (
                                      <TextArea
                                        rows={3}
                                        placeholder="Enter your question"
                                      />
                                    )}
                                  </Form.Item>
                                </Col>
                              </Row>
                            )}
                        </>
                      )}

                      {/* Image upload is shown for Image type and Direct Questions with "Match the following" title */}
                      {(form.getFieldValue(['questions', name, 'questionType']) === 'image' ||
                        (form.getFieldValue(['questions', name, 'questionType']) === 'fillblank' &&
                          form.getFieldValue(['questions', name, 'questionTitle']) === 'Match the following')) && (
                          <Row gutter={16}>
                            <Col span={24}>
                              <Form.Item
                                {...restField}
                                name={[name, 'imageFileList']}
                                label="Upload Image"
                                rules={[{ required: true, message: 'Please upload image!' }]}
                              >
                                <Upload
                                  listType="picture-card"
                                  maxCount={1}
                                  beforeUpload={(file) => {
                                    handleImageSelect(file, name);
                                    return false; // Prevent default upload
                                  }}
                                  defaultFileList={form.getFieldValue(['questions', name, 'imageFileList'])}
                                  onChange={({ fileList }) => {
                                    // This will be handled by the beforeUpload function
                                  }}
                                  onRemove={() => {
                                    handleImageRemove(name);
                                    return true;
                                  }}
                                  showUploadList={{
                                    showUploadList: true,
                                    showRemoveIcon: true,
                                    showPreviewIcon: false,
                                  }}
                                >
                                  <div>
                                    {uploadingImages[name] ? (
                                      <div>
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                        <div style={{ marginTop: 8 }}>Uploading...</div>
                                      </div>
                                    ) : (
                                      <div>
                                        <UploadOutlined />
                                        <div style={{ marginTop: 8 }}>Upload</div>
                                      </div>
                                    )}
                                  </div>
                                </Upload>
                              </Form.Item>
                            </Col>
                          </Row>
                        )}

                      {/* Render question type specific fields */}
                      {renderQuestionTypeFields(
                        form.getFieldValue(['questions', name, 'questionType']),
                        name
                      )}
                    </Card>
                  ))}

                </>
              )}
            </Form.List>

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
                  disabled={submitting}
                >
                  {isEdit ? "Update Question" : "Submit"}
                </Button>
              </Space>
            </Row>
          </Form>
        </Spin>
      </Card>

      {/* Image Upload Modal */}
      <Modal
        title="Upload Image"
        open={imageModalVisible}
        onCancel={handleModalCancel}
        width={600}
        footer={[
          <Button
            key="cancel"
            onClick={handleModalCancel}
          >
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={currentQuestionIndex !== null && uploadingImages[currentQuestionIndex]}
            onClick={handleImageUpload}
            disabled={!selectedFile}
            style={{
              backgroundColor: "#007575",
              borderColor: "#007575"
            }}
          >
            Upload Image
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center' }}>
          {imgSrc && (
            <img
              alt="Preview"
              src={imgSrc}
              style={{ maxHeight: '400px', maxWidth: '100%', marginBottom: '16px' }}
              onLoad={onImageLoad}
            />
          )}
          <div style={{ color: '#666' }}>
            <p>Preview your selected image. Click "Upload Image" to proceed.</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QuestionForm;