
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Form, Input, Select, Button, Card, Row, Col, Space, Divider, InputNumber, Upload, message, Modal, Spin } from "antd";
import { PlusOutlined, MinusCircleOutlined, UploadOutlined, DeleteOutlined, SettingOutlined } from "@ant-design/icons";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/Components/common/PageHeader";
import axios from "axios";
import { API, GET, POST, PUT, DELETE, BASE_URL } from "@/Components/common/api";
import MathInput from "./MathInput";
// Cropping functionality removed

const { Option } = Select;
const { TextArea } = Input;

// Helper to detect Math/Maths subject (case/space insensitive)
const isMathSubjectValue = (subject: string | undefined): boolean => {
  if (!subject) return false;
  const s = subject.toLowerCase().replace(/\s/g, '');
  return s.includes('math') || s.includes('physics') || s.includes('chem') || s.includes('science') || s.includes('biology') || s.includes('evs');
};


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
  const [customTitles, setCustomTitles] = React.useState<Record<string, Array<{ name: string; _id: string }>>>({});
  const [isManageModalVisible, setIsManageModalVisible] = React.useState(false);
  const [currentManageType, setCurrentManageType] = React.useState<string>("");
  const [deletingTitle, setDeletingTitle] = React.useState<string | null>(null);
  const [isTitleModalVisible, setIsTitleModalVisible] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [currentQuestionForTitle, setCurrentQuestionForTitle] = React.useState<number | null>(null);
  const [savingTitle, setSavingTitle] = React.useState(false);

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

  // Fetch custom titles from backend
  const fetchCustomTitles = async () => {
    try {
      const response = await GET(API.QUESTION_TITLES);
      if (Array.isArray(response)) {
        // Group titles by type
        const grouped = response.reduce((acc: Record<string, Array<{ name: string; _id: string }>>, curr: any) => {
          if (!acc[curr.type]) acc[curr.type] = [];
          acc[curr.type].push({ name: curr.name, _id: curr._id });
          return acc;
        }, {});
        setCustomTitles(grouped);
      }
    } catch (error) {
      console.error('Failed to fetch custom titles:', error);
    }
  };

  React.useEffect(() => {
    fetchSubjects();
    fetchCustomTitles();
  }, []);




  const [questionTypeChangeKey, setQuestionTypeChangeKey] = React.useState(0);

  // Robust helper to ensure we resolve strings from objects (used in both rehydration and submission)
  const resolveToString = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') {
      return String(val.text || val.question || val.qtitle || val.title || val.name || val.label || val.choices || val.value || val.content || '');
    }
    return String(val);
  };

  // Mapping from internal question type keys to display labels
  const QUESTION_TYPE_LABELS: Record<string, string> = {
    mcq: 'Multiple Choice',
    fillblank: 'Direct Questions',
    shortanswer: 'Answer the following questions',
    image: 'Picture questions',
  };

  // Question title options based on question type
  const DEFAULT_TITLES: Record<string, string[]> = {
    mcq: [
      "Choose the correct answer from the brackets and fill in the blanks",
      "Tick the correct answers",
      "Choose the correct answers",
    ],
    fillblank: [
      "Fill in the blanks with correct answers",
      "Write true or false",
      "Name the following",
      "Tick the odd one in the following",
      "Match the following",
      "Give one word of the following",
    ],
    shortanswer: [
      "Define the following",
      "Short Answer Questions",
      "Long Answer Questions",
      "Paragraph Writing",
      "Essay Writing",
      "Letter Writing",
    ],
    image: [
      "Identify the pictures",
      "Look at the pictures and answer the following",
      "Describe the following picture",
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
      const normalizedQuestions = questions.map((q: any, index: number) => {
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

        // For all questions with subQuestions array
        if (Array.isArray(q?.subQuestions) && q.subQuestions.length > 0) {
          const subTexts = q.subQuestions
            .map((sq: any) => resolveToString(sq?.text).trim())
            .filter((t: string) => t.length > 0);

          // Set question for first sub-question (required by backend)
          if (subTexts.length > 0) {
            normalized.question = subTexts[0];
          } else if (q?.question) {
            normalized.question = resolveToString(q.question);
          } else {
            // For image questions, we allow a space as a placeholder to satisfy backend validation
            // while remaining invisible in the UI.
            normalized.question = internalType === 'image' ? ' ' : 'No question text provided';
          }

          // Set question1, question2, etc. for remaining sub-questions
          for (let i = 1; i < subTexts.length; i++) {
            normalized[`question${i}`] = subTexts[i];
          }

          normalized.subQuestions = q.subQuestions.map((sq: any) => ({ 
            text: resolveToString(sq?.text).trim() || (internalType === 'image' ? ' ' : '') 
          }));
        } else if (
          internalType === 'fillblank' &&
          q?.questionTitle === 'Tick the odd one in the following'
        ) {
          // Backend requires question field; set a placeholder when not provided
          normalized.question = 'Tick the odd one in the following';
        } else {
          // Fallback for single question
          normalized.question = q?.question || (internalType === 'image' ? ' ' : 'No question text provided');
        }

        const typeLower = String(normalized.questionType || '').toLowerCase();
        const isMcq = internalType === 'mcq' || typeLower === 'multiple choice' || typeLower === 'mcq';
        const needsOptions =
          isMcq ||
          (internalType === 'fillblank' &&
            (q?.questionTitle === 'Tick the odd one in the following' ||
              q?.questionTitle === 'Match the following'));

        if (needsOptions) {
          // With Form.List, q.options is guaranteed to be a standard array of objects
          const rawOptions = q.options || [];
          const reconstructedOptions = rawOptions
            .map((o: any) => ({ 
              text: resolveToString(o && typeof o === 'object' ? o.text : o).trim(),
              isCorrect: false 
            }))
            .filter((o: any) => o.text.length > 0);

          const correctIndices = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map(v => Number(v))
            : q.correctAnswer !== undefined ? [Number(q.correctAnswer)] : [];

          // Map isCorrect into the options
          normalized.options = reconstructedOptions.map((opt, idx) => ({
            ...opt,
            isCorrect: correctIndices.includes(idx)
          }));

          // Validation: MCQ must have at least 2 options
          if (isMcq && normalized.options.length < 2) {
            throw new Error(`Question ${index + 1}: Multiple Choice must have at least 2 non-empty options.`);
          }

          // Ensure options is at least an empty array
          if (!normalized.options) normalized.options = [];

          // Also keep correctAnswer for backward compatibility
          normalized.correctAnswer = correctIndices;
        }

        // Final override for special cases
        if (internalType === 'fillblank' && q?.questionTitle === 'Tick the odd one in the following') {
          normalized.questionType = 'Multiple Choice';
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
      console.log('Original Form Values:', values);
      console.log('Normalized Questions:', normalizedQuestions);

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
      const errorData = error?.response?.data;
      const description = errorData?.message || error?.message || "Something went wrong";

      // If there are validation details, format them nicely
      let detailedMessage = `Failed to submit questions: ${description}`;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const details = errorData.details
          .map((d: any) => typeof d === 'string' ? d : `${d.field}: ${d.message}`)
          .join('\n');
        detailedMessage += `\n\nDetails:\n${details}`;
      } else if (errorData?.error) {
        detailedMessage += `\nError: ${errorData.error}`;
      }

      message.error({
        content: detailedMessage,
        style: { whiteSpace: 'pre-wrap' },
        duration: 5
      });
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
      options: isMcq ? [{ text: '', id: 'init-0' }, { text: '', id: 'init-1' }] : undefined,
      subQuestions: [{ text: '' }], // Always initialize with one sub-question
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
          : [{ text: '', id: 'init-0' }, { text: '', id: 'init-1' }];
    }

    const nextSubQuestions =
      Array.isArray(current.subQuestions) && current.subQuestions.length > 0
        ? current.subQuestions
        : [{ text: '' }];

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
                const isMath = isMathSubjectValue(isEdit ? selectedSubject : questionData.subject);
                const isOddOneOutFillBlank =
                  internalType === 'fillblank' &&
                  questionTitle === 'Tick the odd one in the following';

                const rawQuestion = q.question;
                const resolvedQuestion = typeof rawQuestion === 'object' ? (rawQuestion.text || rawQuestion.question || rawQuestion.title || '') : (rawQuestion || '');
                const mappedQuestion: any = {
                  questionType: internalType,
                  questionTitle: questionTitle,
                  question: isMath
                    ? unescapeLatex(resolvedQuestion)
                    : resolvedQuestion,
                  marks: q.marks,
                };

                // Include section field if present (for English subjects)
                if (q?.section) {
                  mappedQuestion.section = q.section;
                }

                const isImageLike =
                  internalType === 'image' ||
                  (internalType === 'fillblank' &&
                    questionTitle === 'Match the following');

                // Handle MCQ-like options (including odd-one-out direct questions)
                if ((internalType === 'mcq' || isOddOneOutFillBlank) && q.options) {
                  mappedQuestion.options = q.options.map((opt: any, idx: number) => {
                    const resolvedOpt = resolveToString(opt);
                    const text = isMath ? unescapeLatex(resolvedOpt) : resolvedOpt;
                    return {
                      text,
                      id: `init-${idx}`
                    };
                  });
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

                // Rehydrate subQuestions for all types that use them
                const usesSubQuestions = !isOddOneOutFillBlank;

                if (usesSubQuestions) {
                  if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                    mappedQuestion.subQuestions = q.subQuestions.map((sq: any) => {
                      const rawSq = typeof sq === 'object' ? (sq.text || sq.question || sq.title || sq.label || sq) : sq;
                      const resolvedSq = typeof rawSq === 'object' ? '' : String(rawSq || '');
                      return {
                        text: isMath ? unescapeLatex(resolvedSq) : resolvedSq
                      };
                    });
                  } else if (typeof q.question === 'string' && q.question.trim().length > 0) {
                    // Fallback: populate subQuestions from the individual question fields
                    mappedQuestion.subQuestions = [{
                      text: isMath ? unescapeLatex(q.question) : q.question
                    }];

                    // Also check for question1, question2, etc.
                    for (let i = 1; i <= 5; i++) {
                      const extraField = q[`question${i}`];
                      if (extraField && extraField.trim()) {
                        mappedQuestion.subQuestions.push({
                          text: isMath ? unescapeLatex(extraField) : extraField
                        });
                      }
                    }
                  } else {
                    // Always have at least one empty sub-question for the UI
                    mappedQuestion.subQuestions = [{ text: '' }];
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
              questions: [{
                subQuestions: [{ text: '' }],
                options: [{ text: '', id: 'init-0' }, { text: '', id: 'init-1' }],
                marks: 1
              }]
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
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key: fieldKey, name, ...restField }) => (
                    <Card
                      key={fieldKey}
                      size="small"
                      className="mb-4"
                      style={{ backgroundColor: '#f8f9fa' }}
                      extra={
                        fields.length > 1 && (
                          <Button 
                            type="text" 
                            danger 
                            icon={<MinusCircleOutlined />} 
                            onClick={() => remove(name)}
                          >
                            Remove Question
                          </Button>
                        )
                      }
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
                            <div className="flex items-center gap-2">
                              <Select
                                size="large"
                                placeholder="Select question title"
                                className="flex-grow"
                                onChange={(value) => handleQuestionTitleChange(name, value)}
                                disabled={
                                  !form.getFieldValue(['questions', name, 'questionType'])
                                }
                                options={[
                                  ...(DEFAULT_TITLES[form.getFieldValue(['questions', name, 'questionType'])] || []).map(t => ({ value: t, label: t })),
                                  ...(customTitles[form.getFieldValue(['questions', name, 'questionType'])] || []).map(t => ({ value: t.name, label: t.name }))
                                ]}
                                allowClear
                              />
                              <Button
                                icon={<SettingOutlined />}
                                size="large"
                                style={{
                                  backgroundColor: "#52c41a",
                                  borderColor: "#52c41a",
                                  color: "white"
                                }}
                                onClick={() => {
                                  const type = form.getFieldValue(['questions', name, 'questionType']);
                                  if (!type) {
                                    message.warning("Please select a question type first!");
                                    return;
                                  }
                                  setCurrentManageType(type);
                                  setIsManageModalVisible(true);
                                }}
                              />
                              <Button
                                icon={<PlusOutlined />}
                                size="large"
                                style={{
                                  backgroundColor: "#007575",
                                  borderColor: "#007575",
                                  color: "white"
                                }}
                                onClick={() => {
                                  const type = form.getFieldValue(['questions', name, 'questionType']);
                                  if (!type) {
                                    message.warning("Please select a question type first!");
                                    return;
                                  }
                                  setCurrentQuestionForTitle(name);
                                  setIsTitleModalVisible(true);
                                }}
                              />
                            </div>
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
                          {/* 1. Questions Block: Show subQuestions list except for Odd-one-out */}
                          {!(form.getFieldValue(['questions', name, 'questionType']) === 'fillblank' &&
                            form.getFieldValue(['questions', name, 'questionTitle']) === 'Tick the odd one in the following') && (
                            <Form.List name={[name, 'subQuestions']}>
                              {(subFields, { add: addSub, remove: removeSub }) => (
                                <>
                                  {/* Image upload for specific types */}
                                  {(form.getFieldValue(['questions', name, 'questionType']) === 'image' ||
                                    (form.getFieldValue(['questions', name, 'questionType']) === 'fillblank' &&
                                      form.getFieldValue(['questions', name, 'questionTitle']) === 'Match the following')) && (
                                      <Row gutter={16}>
                                        <Col span={24}>
                                          <Form.Item
                                            name={[name, 'imageFileList']}
                                            label="Upload Image"
                                            rules={[{ required: true, message: 'Please upload image!' }]}
                                          >
                                            <Upload
                                              listType="picture-card"
                                              maxCount={1}
                                              beforeUpload={(file) => {
                                                handleImageSelect(file, name);
                                                return false; 
                                              }}
                                              defaultFileList={form.getFieldValue(['questions', name, 'imageFileList'])}
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
                                                  <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                    <div className="mt-2 text-xs">Uploading...</div>
                                                  </div>
                                                ) : (
                                                  <div className="flex flex-col items-center">
                                                    <UploadOutlined />
                                                    <div className="mt-2 text-xs">Upload</div>
                                                  </div>
                                                )}
                                              </div>
                                            </Upload>
                                          </Form.Item>
                                        </Col>
                                      </Row>
                                    )}

                                  {subFields.map(({ key: subKey, name: subName }) => (
                                    <Row key={subKey} gutter={16} align="middle" style={{ marginBottom: 16 }}>
                                      <Col span={22}>
                                        <Form.Item
                                          name={[subName, 'text']}
                                          label={subName === 0 ? 'Questions' : undefined}
                                          rules={[
                                            {
                                              required: form.getFieldValue(['questions', name, 'questionType']) !== 'image',
                                              message: 'Please enter question!'
                                            }
                                          ]}
                                        >
                                          {isMathSubjectValue(isEdit ? selectedSubject : form.getFieldValue('subject')) ? (
                                            <MathInput rows={2} placeholder="Enter your question" />
                                          ) : (
                                            <TextArea rows={2} placeholder="Enter your question" />
                                          )}
                                        </Form.Item>
                                      </Col>
                                      <Col span={2}>
                                        {subFields.length > 1 && (
                                          <Button
                                            type="text"
                                            icon={<MinusCircleOutlined />}
                                            onClick={() => removeSub(subName)}
                                            danger
                                          />
                                        )}
                                      </Col>
                                    </Row>
                                  ))}
                                  
                                  {/* Sub-question adding removed as per request to have separate parent questions */}
                                </>
                              )}
                            </Form.List>
                          )}

                          {/* 2. Options Block: Show for any MCQ-like type */}
                          <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => {
                              const pType = prev.questions?.[name]?.questionType;
                              const cType = curr.questions?.[name]?.questionType;
                              const pTitle = prev.questions?.[name]?.questionTitle;
                              const cTitle = curr.questions?.[name]?.questionTitle;
                              const pOpts = prev.questions?.[name]?.options?.length;
                              const cOpts = curr.questions?.[name]?.options?.length;
                              return pType !== cType || pTitle !== cTitle || pOpts !== cOpts;
                            }}
                          >
                            {() => {
                              const qType = form.getFieldValue(['questions', name, 'questionType']);
                              const qTitle = form.getFieldValue(['questions', name, 'questionTitle']);
                              const isOddOneOut = qType === 'fillblank' && qTitle === 'Tick the odd one in the following';
                              const effectiveType = isOddOneOut ? 'mcq' : qType;

                              if (effectiveType === 'mcq') {
                                const subject = isEdit ? selectedSubject : form.getFieldValue('subject');
                                const isMath = isMathSubjectValue(subject);
                                const rawOptions = form.getFieldValue(['questions', name, 'options']) || [];
                                const options = Array.isArray(rawOptions) ? rawOptions : Object.values(rawOptions);

                                return (
                                  <div className="mt-4 border-t pt-4">
                                    <Form.List name={[name, 'options']}>
                                      {(optFields, { add: addOpt, remove: removeOpt }) => (
                                        <Form.Item label="Options" required>
                                          {optFields.map(({ key: optKey, name: optName }) => (
                                            <Row key={optKey} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                                              <Col flex="auto">
                                                <Form.Item
                                                  name={[optName, 'text']}
                                                  noStyle
                                                  rules={[{ required: true, message: 'Please enter option text!' }]}
                                                >
                                                  {isMath ? (
                                                    <MathInput rows={1} placeholder={`Option ${optName + 1}`} />
                                                  ) : (
                                                    <Input placeholder={`Option ${optName + 1}`} />
                                                  )}
                                                </Form.Item>
                                              </Col>
                                              <Col>
                                                <Button
                                                  type="text"
                                                  danger
                                                  icon={<MinusCircleOutlined />}
                                                  onClick={() => removeOpt(optName)}
                                                  disabled={optFields.length <= 2}
                                                />
                                              </Col>
                                            </Row>
                                          ))}
                                          <Button
                                            type="dashed"
                                            onClick={() => addOpt({ text: '', id: Date.now() + Math.random() })}
                                            block
                                            icon={<PlusOutlined />}
                                            style={{ marginTop: 8 }}
                                          >
                                            Add Option
                                          </Button>
                                        </Form.Item>
                                      )}
                                    </Form.List>

                                    <Form.Item
                                      name={[name, 'correctAnswer']}
                                      label="Correct Answer(s)"
                                      rules={[{ required: true, message: 'Please select correct answer!' }]}
                                    >
                                      <Select
                                        mode="multiple"
                                        placeholder="Select correct option(s)"
                                        style={{ width: "100%" }}
                                        options={options.map((opt: any, i: number) => {
                                          const currentText = resolveToString(opt?.text) || '';
                                          return {
                                            label: `Option ${i + 1}: ${currentText}`,
                                            value: i
                                          };
                                        })}
                                      />
                                    </Form.Item>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          </Form.Item>

                          <Button
                            type="dashed"
                            onClick={() => {
                              const currentQ = form.getFieldValue(['questions', name]);
                              add({
                                questionType: currentQ?.questionType,
                                questionTitle: currentQ?.questionTitle,
                                section: currentQ?.section,
                                subQuestions: [{ text: '' }],
                                options: currentQ?.questionType === 'mcq' || (currentQ?.questionType === 'fillblank' && currentQ?.questionTitle === 'Tick the odd one in the following')
                                  ? [{ text: '', id: Date.now() }, { text: '', id: Date.now() + 1 }]
                                  : undefined,
                                marks: currentQ?.marks || 1
                              });
                            }}
                            icon={<PlusOutlined />}
                            className="w-full mt-4"
                            style={{ 
                              color: '#007575', 
                              borderColor: '#007575',
                              height: '45px',
                              fontSize: '16px',
                              fontWeight: '500'
                            }}
                          >
                            Add Another Question
                          </Button>
                        </>
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
      {/* Custom Title Modal */}
      <Modal
        title="Add Custom Question Title"
        open={isTitleModalVisible}
        onCancel={() => {
          setIsTitleModalVisible(false);
          setNewTitle("");
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsTitleModalVisible(false);
            setNewTitle("");
          }}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            style={{ backgroundColor: "#007575", borderColor: "#007575" }}
            loading={savingTitle}
            onClick={async () => {
              if (!newTitle.trim()) {
                message.warning("Please enter a title");
                return;
              }
              const type = form.getFieldValue(['questions', currentQuestionForTitle!, 'questionType']);

              setSavingTitle(true);
              try {
                // Call backend to save new title
                await POST(API.QUESTION_TITLES, { name: newTitle, type: type });

                // Refresh titles from backend
                await fetchCustomTitles();

                // Select the newly added title
                const questions = form.getFieldValue('questions');
                questions[currentQuestionForTitle!].questionTitle = newTitle;
                form.setFieldValue('questions', questions);

                message.success("Title added successfully!");
                setIsTitleModalVisible(false);
                setNewTitle("");
              } catch (error: any) {
                const errMsg = error?.message || "Failed to save title";
                message.error(errMsg);
              } finally {
                setSavingTitle(false);
              }
            }}
          >
            Save Title
          </Button>
        ]}
      >
        <div className="py-4">
          <Input
            placeholder="Enter custom question title"
            size="large"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPressEnter={() => {
              // Trigger save if enter is pressed
            }}
          />
        </div>
      </Modal>
      {/* Manage Titles Modal */}
      <Modal
        title={`Manage ${QUESTION_TYPE_LABELS[currentManageType] || ''} Titles`}
        open={isManageModalVisible}
        onCancel={() => setIsManageModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsManageModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {(customTitles[currentManageType] || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              No custom titles found for this type.
            </div>
          ) : (
            <div className="space-y-2">
              {(customTitles[currentManageType] || []).map((title) => (
                <div
                  key={title._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}
                >
                  <span>{title.name}</span>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deletingTitle === title._id}
                    onClick={async () => {
                      setDeletingTitle(title._id);
                      try {
                        await DELETE(`${API.QUESTION_TITLES}/${title._id}`);
                        message.success("Title deleted successfully!");
                        await fetchCustomTitles();
                      } catch (error: any) {
                        const errMsg = error?.message || "Failed to delete title";
                        message.error(errMsg);
                      } finally {
                        setDeletingTitle(null);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default QuestionForm;