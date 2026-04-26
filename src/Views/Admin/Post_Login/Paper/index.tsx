
// @ts-nocheck
import { useMemo, useRef, useState, useEffect } from 'react';
import { Button, Card, Checkbox, Col, Divider, Form, Input, InputNumber, Modal, Pagination, Row, Select, Typography, message, ConfigProvider, Spin, Popover } from 'antd';
import { Download, ChevronDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API, GET, POST } from "../../../../Components/common/api";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Media, Packer, Paragraph, Table, TableCell, TableRow, TabStopType, TextRun, WidthType } from "docx";
import { saveAs } from "file-saver";
const { Title, Text } = Typography;
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

type QuestionType = 'multiplechoice' | 'direct' | 'answerthefollowing' | 'picture';
type MCQSubtype = 'choose_from_brackets' | 'tick_correct' | 'choose_correct';
type DirectSubtype = 'fill_in_blanks' | 'true_or_false' | 'name_following' | 'tick_odd_one' | 'match_following' | 'give_one_word';
type AnswerFollowingSubtype = 'define_following' | 'short_answer' | 'long_answer' | 'paragraph_writing' | 'essay_writing' | 'letter_writing';
type PictureSubtype = 'identify_pictures' | 'look_and_answer' | 'describe_picture';

interface QuestionItem {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  defaultMarks: number;
  options?: string[];
  mcqSubtype?: MCQSubtype | MCQSubtype[];
  directSubtype?: DirectSubtype | DirectSubtype[];
  answerFollowingSubtype?: AnswerFollowingSubtype | AnswerFollowingSubtype[];
  pictureSubtype?: PictureSubtype | PictureSubtype[];
  qtitle?: string;
  subQuestions?: string[];
  originalQuestionType?: string;
  section?: string;
  chapter?: string;
}

const classOptions = ['0', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];
const examTypes = [
  { label: 'UNIT TEST', value: 'UNIT TEST' },
  { label: 'FIRST MID TERM', value: 'FIRST MID TERM' },
  { label: 'FIRST TERM', value: 'FIRST TERM' },
  { label: 'SECOND MID TERM', value: 'SECOND MID TERM' },
  { label: 'SECOND TERM', value: 'SECOND TERM' },
  { label: 'THIRD MID TERM', value: 'THIRD MID TERM' },
  { label: 'THIRD TERM', value: 'THIRD TERM' }
];

const mcqSubtypeOptions = [
  { label: 'Choose the correct answer from the brackets and fill in the blanks', value: 'choose_from_brackets' },
  { label: 'Tick the correct answers', value: 'tick_correct' },
  { label: 'Choose the correct answers', value: 'choose_correct' }
];

const directSubtypeOptions = [
  { label: 'Fill in the blanks with correct answers', value: 'fill_in_blanks' },
  { label: 'Write true or false', value: 'true_or_false' },
  { label: 'Name the following', value: 'name_following' },
  { label: 'Tick the odd one in the following', value: 'tick_odd_one' },
  { label: 'Match the following', value: 'match_following' },
  { label: 'Give one word of the following', value: 'give_one_word' }
];

const answerFollowingSubtypeOptions = [
  { label: 'Define the following', value: 'define_following' },
  { label: 'Short Answer Questions', value: 'short_answer' },
  { label: 'Long Answer Questions', value: 'long_answer' },
  { label: 'Paragraph Writing', value: 'paragraph_writing' },
  { label: 'Essay Writing', value: 'essay_writing' },
  { label: 'Letter Writing', value: 'letter_writing' }
];

const pictureSubtypeOptions = [
  { label: 'Identity the pictures', value: 'identify_pictures' },
  { label: 'Look at the pictures and answer the following', value: 'look_and_answer' },
  { label: 'Describe the following picture', value: 'describe_picture' }
];

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Convert number to Roman numeral
const toRomanNumeral = (num: number): string => {
  const romanNumerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];

  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

// Helper to detect English subject (case/space insensitive)
const isEnglishSubjectValue = (subject?: string) => {
  if (!subject) return false;
  return String(subject).trim().toLowerCase() === 'english';
};

// Convert minutes to hours and minutes format
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 minutes';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${minutes} minutes`;
  }

  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  }

  // Check if minutes is 30 for "1/2" format
  if (mins === 30) {
    return `${hours} 1/2 ${hours === 1 ? 'hr' : 'hrs'}`;
  }

  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
};

// Get standard label (Roman numeral for numeric classes)
const getStdLabel = (classValue?: string | number) => {
  if (classValue === undefined || classValue === null || classValue === '') return '-';
  const parsed = Number(classValue);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return toRomanNumeral(parsed);
  }
  return String(classValue).toUpperCase();
};

// Get subject display with book name
const getSubjectDisplay = (subject?: string, book?: string) => {
  const cleanSubject = subject?.trim();
  const cleanBook = book?.trim();
  if (cleanSubject && cleanBook) return `${cleanSubject} (${cleanBook})`;
  if (cleanSubject) return cleanSubject;
  if (cleanBook) return cleanBook;
  return '';
};

// Check if class is 4 or below


const Paper = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([]);
  const [showChooser, setShowChooser] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, number>>({});
  const [selectedQuestionsData, setSelectedQuestionsData] = useState<Record<string, QuestionItem>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalFilterTypes, setModalFilterTypes] = useState<QuestionType[]>([]);
  const [subjectsOptions, setSubjectsOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
  const [booksOptions, setBooksOptions] = useState<Array<{ value: string; label: string; code?: string }>>([]);
  const [booksLoading, setBooksLoading] = useState<boolean>(false);
  const [chaptersOptions, setChaptersOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [chaptersLoading, setChaptersLoading] = useState<boolean>(false);
  const [questionsData, setQuestionsData] = useState<QuestionItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState<boolean>(false);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [chooseLoading, setChooseLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [mcqSubtype, setMcqSubtype] = useState<MCQSubtype | MCQSubtype[] | undefined>(undefined);
  const [directSubtype, setDirectSubtype] = useState<DirectSubtype | DirectSubtype[] | undefined>(undefined);
  const [answerFollowingSubtype, setAnswerFollowingSubtype] = useState<AnswerFollowingSubtype | AnswerFollowingSubtype[] | undefined>(undefined);
  const [pictureSubtype, setPictureSubtype] = useState<PictureSubtype | PictureSubtype[] | undefined>(undefined);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [tempFilterSubtypes, setTempFilterSubtypes] = useState<Record<string, string[]>>({});
  const [activeFilterSubtypes, setActiveFilterSubtypes] = useState<Record<string, string[]>>({});
  const chooserRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Get user from Redux
  const user = useSelector((state: any) => state.user.user);

  const totalMarksField = Form.useWatch('totalMarks', form) || 0;
  const formValues = Form.useWatch([], form);
  const selectedClass = Form.useWatch('class', form);
  const selectedSubject = Form.useWatch('subject', form);
  const selectedBook = Form.useWatch('book', form);

  // Ensure clean form state when landing on this page (after navigating back from My Papers, etc.)
  useEffect(() => {
    form.resetFields();
  }, [form]);

  // Fetch subjects from API (same as Chapters module)
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
      // Fallback to default subjects if API fails
      setSubjectsOptions([
        { value: "Malayalam", label: "Malayalam" },
        { value: "English", label: "English" },
        { value: "Maths", label: "Maths" },
        { value: "GK", label: "GK" },
        { value: "Computer", label: "Computer" },
        { value: "EVS", label: "EVS" },
        { value: "Social Science", label: "Social Science" },
        { value: "Science", label: "Science" },
      ]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Fetch books based on class and subject
  const fetchBooks = async (classValue: string, subjectValue: string) => {
    if (!classValue || !subjectValue || !user?.id) {
      setBooksOptions([]);
      return;
    }

    try {
      setBooksLoading(true);
      const query = {
        class: classValue,
        subject: subjectValue,
        userId: user.id
      };
      const data = await GET("/books/filter", query);
      const booksList = Array.isArray(data?.results)
        ? data.results.map((book: any) => ({
          value: book.id || book._id || book.name || book.title,
          label: book.name || book.title || book.book,
          code: book.code
        }))
        : Array.isArray(data?.books)
          ? data.books.map((book: any) => ({
            value: book.id || book._id || book.name || book.title,
            label: book.name || book.title || book.book,
            code: book.code
          }))
          : Array.isArray(data)
            ? data.map((book: any) => ({
              value: book.id || book._id || book.name || book.title,
              label: book.name || book.title || book.book,
              code: book.code
            }))
            : [];
      setBooksOptions(booksList);
    } catch (e) {
      console.error('Failed to fetch books:', e);
      setBooksOptions([]);
      message.error('Failed to load books');
    } finally {
      setBooksLoading(false);
    }
  };

  // Load subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch chapters based on class, subject, and book
  const fetchChapters = async (classValue: string, subjectValue: string, bookId: string) => {
    if (!classValue || !subjectValue || !bookId) {
      setChaptersOptions([]);
      return;
    }

    try {
      setChaptersLoading(true);
      const query = {
        class: classValue,
        subject: subjectValue,
        book: bookId
      };
      const data = await GET("/chaptersr", query);
      const chaptersList = Array.isArray(data?.results)
        ? data.results.map((chapter: any) => ({
          value: chapter.id || chapter._id || chapter.name || chapter.chapterName,
          label: chapter.name || chapter.chapterName || chapter.title
        }))
        : Array.isArray(data?.chapters)
          ? data.chapters.map((chapter: any) => ({
            value: chapter.id || chapter._id || chapter.name || chapter.chapterName,
            label: chapter.name || chapter.chapterName || chapter.title
          }))
          : Array.isArray(data)
            ? data.map((chapter: any) => ({
              value: chapter.id || chapter._id || chapter.name || chapter.chapterName,
              label: chapter.name || chapter.chapterName || chapter.title
            }))
            : [];
      setChaptersOptions(chaptersList);
    } catch (e) {
      console.error('Failed to fetch chapters:', e);
      setChaptersOptions([]);
      message.info('no chapters found');
    } finally {
      setChaptersLoading(false);
    }
  };

  // Watch for class and subject changes to fetch books
  useEffect(() => {
    if (selectedClass && selectedSubject && user?.id) {
      fetchBooks(selectedClass, selectedSubject);
    } else {
      setBooksOptions([]);
      // Clear book and chapters when class or subject is cleared
      if (!selectedClass || !selectedSubject) {
        form.setFieldsValue({
          book: undefined,
          chapters: undefined
        });
      }
    }
  }, [selectedClass, selectedSubject, user?.id, form]);

  // Watch for class, subject, and book changes to fetch chapters
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedBook) {
      fetchChapters(selectedClass, selectedSubject, selectedBook);
    } else {
      setChaptersOptions([]);
      // Clear chapters when book is cleared
      if (!selectedBook) {
        form.setFieldsValue({
          chapters: undefined
        });
      }
    }
  }, [selectedClass, selectedSubject, selectedBook, form]);

  // Watch for changes in required fields to clear questions when fields change
  const selectedChapters = Form.useWatch('chapters', form);
  useEffect(() => {
    // Clear questions data when any required field changes
    // This ensures that when user changes class/subject/book/chapters, 
    // the previously fetched questions are hidden until "Choose Questions" is clicked again
    if (questionsData.length > 0) {
      setQuestionsData([]);
      setTotalQuestions(0);
      setSelectedQuestions({});
      setSelectedQuestionsData({});
      setShowChooser(false);
    }
    // Clear sections when subject changes from English to non-English
    if (!isEnglishSubjectValue(selectedSubject) && selectedSections.length > 0) {
      setSelectedSections([]);
    }
  }, [selectedClass, selectedSubject, selectedBook, selectedChapters]);

  // Also clear questions when question types change
  useEffect(() => {
    if (questionsData.length > 0) {
      setQuestionsData([]);
      setTotalQuestions(0);
      setSelectedQuestions({});
      setSelectedQuestionsData({});
      setShowChooser(false);
    }
  }, [selectedTypes]);

  // Fetch questions when filter types change
  useEffect(() => {
    if (modalFilterTypes.length > 0 && questionsData.length > 0) {
      fetchQuestions();
    }
  }, [modalFilterTypes]);

  // Fetch questions from API
  const fetchQuestions = async (customPage?: number, customPageSize?: number, overrideFilterTypes?: QuestionType[], overrideTitles?: string[]) => {
    const formValues = form.getFieldsValue();
    const english = isEnglishSubjectValue(formValues.subject);
    if (!formValues.class || !formValues.subject || !formValues.book || !formValues.chapters || formValues.chapters.length === 0 || selectedTypes.length === 0) {
      message.error('Please fill all required fields and select question types');
      return;
    }
    if (english && selectedSections.length === 0) {
      message.error('Please select at least one Section');
      return;
    }

    try {
      setQuestionsLoading(true);

      // Get book name from selected book ID
      const selectedBookName = booksOptions.find(book => book.value === formValues.book)?.label || formValues.book;

      // Get chapter names from selected chapter IDs
      const selectedChapterNames = Array.isArray(formValues.chapters)
        ? formValues.chapters.map(chapterId =>
          chaptersOptions.find(chapter => chapter.value === chapterId)?.label || chapterId
        ).join(',')
        : formValues.chapters;

      // Priority: explicit override -> current modalFilterTypes -> selectedTypes
      const filterTypes = (Array.isArray(overrideFilterTypes) && overrideFilterTypes.length > 0)
        ? overrideFilterTypes
        : (modalFilterTypes.length > 0 ? modalFilterTypes : selectedTypes);

      // Human-readable labels for question types (as requested by API)
      const questionTypeLabels: Record<QuestionType, string> = {
        multiplechoice: 'Multiple Choice',
        direct: 'Direct Questions',
        answerthefollowing: 'Answer the following questions',
        picture: 'Picture questions',
      };

      // Collect question titles from selected subtypes (one per type if available)
      const questionTitleLabels: string[] = [];

      if (english) {
        // For English, sections are passed as separate section parameter
        // Don't add to questionTitleLabels for English
      } else {
        const collectLabels = <T extends { label: string; value: string }>(opts: T[], values: string | string[] | undefined) => {
          if (!values) return;
          const arr = Array.isArray(values) ? values : [values];
          arr.forEach(v => {
            const label = opts.find(o => o.value === v)?.label;
            if (label) questionTitleLabels.push(label);
          });
        };

        if (selectedTypes.includes('multiplechoice')) collectLabels(mcqSubtypeOptions, mcqSubtype);
        if (selectedTypes.includes('direct')) collectLabels(directSubtypeOptions, directSubtype);
        if (selectedTypes.includes('answerthefollowing')) collectLabels(answerFollowingSubtypeOptions, answerFollowingSubtype);
        if (selectedTypes.includes('picture')) collectLabels(pictureSubtypeOptions, pictureSubtype);

        // Apply granular filter overrides if present
        const effectiveTitles = overrideTitles || Object.values(activeFilterSubtypes).flat();
        if (effectiveTitles.length > 0) {
          // Apply granular filters
          // If overrides provided, use them directly (clearing previous)
          if (overrideTitles) {
            questionTitleLabels.length = 0;
            questionTitleLabels.push(...overrideTitles);
          } else if (Object.keys(activeFilterSubtypes).length > 0) {
            // Otherwise use active filters if established
            const activeTitles = Object.values(activeFilterSubtypes).flat();
            if (activeTitles.length > 0) {
              questionTitleLabels.length = 0;
              questionTitleLabels.push(...activeTitles);
            }
          }
        }
      }

      const query: any = {
        limit: customPageSize || pageSize,
        page: customPage || page,
        className: formValues.class,
        subject: formValues.subject,
        book: selectedBookName,
        chapters: selectedChapterNames,
        ...(questionTitleLabels.length > 0 ? { qtitle: questionTitleLabels.join(',') } : {}),
        ...(english && selectedSections.length > 0 ? { section: selectedSections.join('&') } : {})
      };
      // Derive from selected question types
      query.questionType = filterTypes.map(type => questionTypeLabels[type] || type).join(',');
      const data = await GET(API.TITLEAPI, query);

      // Map API response types back to new question types
      const mapAPIToType = (apiType: string): QuestionType => {
        const normalizedType = apiType?.toLowerCase().trim() || '';
        if (normalizedType === 'image' || normalizedType === 'picture questions') return 'picture';
        if (normalizedType === 'mcq' || normalizedType === 'multiple choice') return 'multiplechoice';
        if (normalizedType === 'shortanswer' || normalizedType === 'short answer' || normalizedType === 'direct questions') return 'direct';
        if (normalizedType === 'essay' || normalizedType === 'longanswer' || normalizedType === 'long answer' || normalizedType === 'answer the following questions') return 'answerthefollowing';
        // Fallback for any unmatched type
        return 'direct' as QuestionType;
      };

      // Helper function to extract sub-questions from API response
      const extractSubQuestions = (q: any): string[] => {
        const subQuestions: string[] = [];

        // First, try to use subQuestions array if it exists and has items
        if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
          q.subQuestions.forEach((sq: any) => {
            if (sq?.text && sq.text.trim()) {
              subQuestions.push(sq.text.trim());
            }
          });
          // If we got sub-questions from array, return them
          if (subQuestions.length > 0) {
            return subQuestions;
          }
        }

        // If no subQuestions array or it's empty, collect from question, question1, question2, etc.
        // Start with question field
        if (q.question && q.question.trim()) {
          subQuestions.push(q.question.trim());
        }

        // Add question1, question2, etc. if they exist and are not null
        for (let i = 1; i <= 5; i++) {
          const questionField = q[`question${i}`];
          if (questionField && questionField.trim()) {
            subQuestions.push(questionField.trim());
          }
        }

        return subQuestions;
      };

      const questionsList = Array.isArray(data?.data)
        ? data.data.map((q: any) => {
          const subQuestions = extractSubQuestions(q);
          return {
            id: q.questionId || q.id || q._id,
            type: mapAPIToType(q.questionType || q.type || 'direct'),
            text: q.question || q.text || q.title,
            imageUrl: q.imageUrl || q.image,
            defaultMarks: q.marks || q.defaultMarks || 1,
            options: q.options || q.choices,
            mcqSubtype: q.mcqSubtype,
            directSubtype: q.directSubtype,
            answerFollowingSubtype: q.answerFollowingSubtype,
            pictureSubtype: q.pictureSubtype,
            qtitle: q.qtitle || q.questionTitle || '',
            subQuestions: subQuestions.length > 0 ? subQuestions : undefined,
            originalQuestionType: q.questionType || q.type,
            section: q.section,
            chapter: q.chapter || q.chapterName || ''
          };
        })
        : Array.isArray(data?.results)
          ? data.results.map((q: any) => {
            const subQuestions = extractSubQuestions(q);
            return {
              id: q.id || q._id,
              type: mapAPIToType(q.questionType || q.type || 'direct'),
              text: q.question || q.text || q.title,
              imageUrl: q.imageUrl || q.image,
              defaultMarks: q.marks || q.defaultMarks || 1,
              options: q.options || q.choices,
              mcqSubtype: q.mcqSubtype,
              directSubtype: q.directSubtype,
              answerFollowingSubtype: q.answerFollowingSubtype,
              pictureSubtype: q.pictureSubtype,
              qtitle: q.qtitle || q.questionTitle || '',
              subQuestions: subQuestions.length > 0 ? subQuestions : undefined,
              originalQuestionType: q.questionType || q.type,
              section: q.section,
              chapter: q.chapter || q.chapterName || ''
            };
          })
          : Array.isArray(data?.questions)
            ? data.questions.map((q: any) => {
              const subQuestions = extractSubQuestions(q);
              return {
                id: q.id || q._id,
                type: mapAPIToType(q.questionType || q.type || 'direct'),
                text: q.question || q.text || q.title,
                imageUrl: q.imageUrl || q.image,
                defaultMarks: q.marks || q.defaultMarks || 1,
                options: q.options || q.choices,
                mcqSubtype: q.mcqSubtype,
                directSubtype: q.directSubtype,
                answerFollowingSubtype: q.answerFollowingSubtype,
                pictureSubtype: q.pictureSubtype,
                qtitle: q.qtitle || q.questionTitle || '',
                subQuestions: subQuestions.length > 0 ? subQuestions : undefined,
                originalQuestionType: q.questionType || q.type,
                section: q.section,
                chapter: q.chapter || q.chapterName || ''
              };
            })
            : Array.isArray(data)
              ? data.map((q: any) => {
                const subQuestions = extractSubQuestions(q);
                return {
                  id: q.id || q._id,
                  type: mapAPIToType(q.questionType || q.type || 'direct'),
                  text: q.question || q.text || q.title,
                  imageUrl: q.imageUrl || q.image,
                  defaultMarks: q.marks || q.defaultMarks || 1,
                  options: q.options || q.choices,
                  mcqSubtype: q.mcqSubtype,
                  directSubtype: q.directSubtype,
                  answerFollowingSubtype: q.answerFollowingSubtype,
                  pictureSubtype: q.pictureSubtype,
                  qtitle: q.qtitle || q.questionTitle || '',
                  subQuestions: subQuestions.length > 0 ? subQuestions : undefined,
                  originalQuestionType: q.questionType || q.type,
                  section: q.section,
                  chapter: q.chapter || q.chapterName || ''
                };
              })
              : [];
      setQuestionsData(questionsList);
      setTotalQuestions(data?.total || 0);
    } catch (e) {
      console.error('Failed to fetch questions:', e);
      setQuestionsData([]);
      message.error('Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const paginatedQuestions = useMemo(() => {
    // Use server-side filtering instead of frontend filtering
    return questionsData;
  }, [questionsData]);

  // Get question numbering for the current page
  const getQuestionNumber = (questionIndex: number) => {
    const start = (page - 1) * pageSize;
    return start + questionIndex + 1;
  };

  // Scroll to top when page changes
  useEffect(() => {
    if (showChooser && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page, pageSize]);

  // Organize selected questions by type for preview
  const organizedQuestions = useMemo(() => {
    const result: Record<QuestionType, Array<{ question: QuestionItem; marks: number; globalNumber: number }>> = {
      'multiplechoice': [],
      'direct': [],
      'answerthefollowing': [],
      'picture': []
    };

    let globalCounter = 1;

    // Process questions in the desired order of question types for preview/print
    (['multiplechoice', 'direct', 'answerthefollowing', 'picture'] as QuestionType[]).forEach(type => {
      const questionsOfType = Object.entries(selectedQuestions)
        .map(([id, marks]) => ({
          id,
          marks,
          question: selectedQuestionsData[id] || questionsData.find(q => q.id === id)
        }))
        .filter(({ question }) => question && question.type === type)
        .sort((a, b) => a.id.localeCompare(b.id));

      questionsOfType.forEach(({ question, marks }) => {
        if (question) {
          result[type].push({ question, marks, globalNumber: globalCounter++ });
        }
      });
    });

    return result;
  }, [selectedQuestions, selectedQuestionsData, questionsData]);

  const currentSumMarks = useMemo(() => Object.values(selectedQuestions).reduce((a, b) => a + (Number(b) || 0), 0), [selectedQuestions]);

  // --- Preview rendering helpers (match My Papers preview behaviour) ---
  const formatMarks = (marks: number | undefined | null): string => {
    if (marks === undefined || marks === null) return '0';
    const num = Number(marks);
    if (Number.isNaN(num)) return String(marks);
    if (num % 1 === 0) return String(num);
    const decimalPart = num % 1;
    if (Math.abs(decimalPart - 0.5) < 0.001) {
      const wholePart = Math.floor(num);
      return wholePart === 0 ? '½' : `${wholePart} ½`;
    }
    return String(num);
  };

  const renderMaybeMath = (text?: string) => {
    if (!text) return null;
    if (isMathSubjectValue(formValues?.subject)) {
      return (
        <InlineMath
          math={`\\mathrm{${unescapeLatex(String(text))}}`}
          renderError={(error) => <span>{text}</span>}
        />
      );
    }
    return text;
  };

  const getRomanSubIndex = (index: number) => {
    const romans = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
    return romans[index] || `${index + 1}`;
  };

  // Build a "paper-like" questions array from currently selected questions
  const selectedPreviewQuestions = useMemo(() => {
    return Object.entries(selectedQuestions)
      .map(([id, marks]) => {
        const q = selectedQuestionsData[id] || questionsData.find((qq) => qq.id === id);
        if (!q) return null;
        const optionsArray = Array.isArray(q.options)
          ? q.options.map((o: any) => (o?.text ?? o)).filter(Boolean).map((v: any) => String(v))
          : [];
        const subQuestionsArray = Array.isArray(q.subQuestions) ? q.subQuestions : [];
        return {
          id: q.id,
          qtitle: q.qtitle || '',
          question: q.text || '',
          mark: Number(marks) || 0,
          marks: Number(marks) || 0,
          options: optionsArray,
          imageUrl: q.imageUrl,
          section: q.section,
          // My Papers expects subQuestions as array of { text }
          subQuestions: subQuestionsArray.map((t: string) => ({ text: t })),
        };
      })
      .filter(Boolean);
  }, [selectedQuestions, selectedQuestionsData, questionsData]);

  const groupedQuestionsForPreview = useMemo(() => {
    const subject = String(formValues?.subject || '').trim().toLowerCase();
    const isEnglish = subject === 'english';
    const list: any[] = Array.isArray(selectedPreviewQuestions) ? selectedPreviewQuestions : [];
    if (!list.length) return [];

    if (isEnglish) {
      const sectionGroups: Record<string, Record<string, any[]>> = {};
      const sectionOrder: string[] = [];
      const sectionTitleOrder: Record<string, string[]> = {};

      list.forEach((q: any) => {
        const section = q.section || 'Miscellaneous';
        const title = q.qtitle || 'Miscellaneous';
        if (!sectionGroups[section]) {
          sectionGroups[section] = {};
          sectionOrder.push(section);
          sectionTitleOrder[section] = [];
        }
        if (!sectionGroups[section][title]) {
          sectionGroups[section][title] = [];
          sectionTitleOrder[section].push(title);
        }
        sectionGroups[section][title].push(q);
      });

      const sectionPriority: Record<string, number> = {
        SectionA: 1,
        SectionB: 2,
        SectionC: 3,
        SectionD: 4,
      };

      const sortedSectionOrder = sectionOrder.sort((a, b) => (sectionPriority[a] || 999) - (sectionPriority[b] || 999));

      const sectionMap: Record<string, string> = {
        SectionA: 'SECTION - A (READING)',
        SectionB: 'SECTION - B (WRITING)',
        SectionC: 'SECTION - C (GRAMMER)',
        SectionD: 'SECTION - D (TEXTUAL QUESTIONS)',
      };

      const result: Array<{ section?: string; sectionDisplay?: string; title: string; questions: any[] }> = [];
      sortedSectionOrder.forEach((section) => {
        const sectionDisplay = sectionMap[section] || undefined;
        sectionTitleOrder[section].forEach((title) => {
          result.push({
            section,
            sectionDisplay,
            title,
            questions: sectionGroups[section][title],
          });
        });
      });
      return result;
    }

    const groups: Record<string, any[]> = {};
    const titlesOrder: string[] = [];
    list.forEach((q: any) => {
      const title = q.qtitle || 'Miscellaneous';
      if (!groups[title]) {
        groups[title] = [];
        titlesOrder.push(title);
      }
      groups[title].push(q);
    });

    // Custom Order Logic
    const titlePriority = [
      "Choose the correct answer from the brackets and fill in the blanks",
      "Tick the correct answers",
      "Choose the correct answers",
      "Fill in the blanks with correct answers",
      "Write true or false",
      "Name the following",
      "Tick the odd one in the following",
      "Match the following",
      "Give one word of the following",
      "Define the following",
      "Short Answer Questions",
      "Long Answer Questions",
      "Paragraph Writing",
      "Essay Writing",
      "Letter Writing",
      "Identity the pictures",
      "Look at the pictures and answer the following",
      "Describe the following picture"
    ].map(t => t.toLowerCase().trim());

    titlesOrder.sort((a, b) => {
      const lowerA = a.toLowerCase().trim();
      const lowerB = b.toLowerCase().trim();

      // Check if titles start with any of the priority titles
      const indexA = titlePriority.findIndex(p => lowerA === p || lowerA.startsWith(p));
      const indexB = titlePriority.findIndex(p => lowerB === p || lowerB.startsWith(p));

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return lowerA.localeCompare(lowerB);
    });

    return titlesOrder.map((title) => ({ title, questions: groups[title] }));
  }, [selectedPreviewQuestions, formValues?.subject]);

  const renderQuestionSectionLikeMyPapers = (
    group: { section?: string; sectionDisplay?: string; title: string; questions: any[] },
    groupIndex: number,
    previousSection?: string,
  ) => {
    const { section, sectionDisplay, title, questions } = group;
    const sectionRoman = toRomanNumeral(groupIndex + 1);

    const subject = String(formValues?.subject || '').trim().toLowerCase();
    const isEnglish = subject === 'english';
    const showSectionHeader = isEnglish && sectionDisplay && section !== previousSection;

    // Marks breakdown like My Papers
    let markBreakdown = "";
    if (questions.length > 0) {
      const firstMark = questions[0].mark || questions[0].marks || 0;
      const allSame = questions.every((q: any) => (q.mark || q.marks || 0) === firstMark);
      if (allSame && firstMark > 0) {
        const totalMarks = firstMark * questions.length;
        markBreakdown = `[${formatMarks(firstMark)} x ${questions.length} = ${formatMarks(totalMarks)}]`;
      }
    }
    const showIndividualMarks = !markBreakdown;

    const pictureTitles = [
      "describe the following picture",
      "look at the pictures and answer the following",
      "identify the pictures",
      "identity the pictures",
    ];
    const cleanLowerTitle = String(title || '').trim().toLowerCase().replace(/\.$/, '');

    // Picture questions
    if (pictureTitles.some((t) => cleanLowerTitle === t || cleanLowerTitle.startsWith(t))) {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">
            {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
          </h3>
          {questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-4 ml-5">
              <div className="flex justify-between items-start text-lg text-black font-local2 mb-2">
                <div className="flex-1 pr-4">
                  <span className="mr-2">{getRomanSubIndex(idx)})</span>
                </div>
                <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                  {showIndividualMarks && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                </div>
              </div>
              {q.imageUrl && (
                <div className="mb-3 ml-6">
                  <img
                    src={q.imageUrl}
                    alt="Question"
                    className="max-w-full h-auto max-h-[200px] object-contain border border-gray-200 rounded"
                  />
                </div>
              )}
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : []).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 ml-6 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{String.fromCharCode(97 + subIdx)})</span>
                    <span>{renderMaybeMath(subQ.text || '')}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Choose from brackets
    if (String(title).trim() === "Choose the correct answer from the brackets and fill in the blanks") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">
            {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
          </h3>
          {questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-4 ml-5">
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{getRomanSubIndex(idx)})</span>
                    <span>{renderMaybeMath(subQ.text || q.question)}</span>
                    {q.options && q.options.length > 0 && (
                      <span className="ml-4 font-semibold">
                        ({q.options.map((opt: string, i: number) => (
                          <span key={i}>
                            {renderMaybeMath(opt)}
                            {i < q.options.length - 1 ? ', ' : ''}
                          </span>
                        ))})
                      </span>
                    )}
                  </div>
                  <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                    {showIndividualMarks && subIdx === 0 && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Tick correct answers
    if (String(title).trim() === "Tick the correct answers") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">
            {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
          </h3>
          {questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-4 ml-5">
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{getRomanSubIndex(idx)})</span>
                    <span>{renderMaybeMath(subQ.text || q.question)}</span>
                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 ml-4">
                        {q.options.map((opt: string, optIdx: number) => (
                          <span key={optIdx} className="inline-flex items-center gap-2 mr-6">
                            <span className="font-semibold">{String.fromCharCode(97 + optIdx)}.</span>
                            <span className="text-2xl leading-none">☐</span>
                            <span>{renderMaybeMath(opt)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                    {showIndividualMarks && subIdx === 0 && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Choose the correct answers (options block + a,b,c)
    if (String(title).trim() === "Choose the correct answers") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">
            {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
          </h3>
          {questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-6 ml-5">
              <div className="mb-3 font-local2 text-black flex justify-between items-start">
                <div className="flex-1">
                  <span className="mr-2 font-semibold text-lg">{getRomanSubIndex(idx)})</span>
                  <div className="inline-block p-3 bg-gray-50 border border-gray-200 rounded">
                    <span className="font-semibold">
                      ({q.options && q.options.map((opt: string, i: number) => (
                        <span key={i}>
                          {renderMaybeMath(opt)}
                          {i < q.options.length - 1 ? ', ' : ''}
                        </span>
                      ))})
                    </span>
                  </div>
                </div>
                {/* Marks relative to the options block, not the first sub-question */}
                <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                  {showIndividualMarks && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                </div>
              </div>
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 ml-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{String.fromCharCode(97 + subIdx)})</span>
                    <span>{renderMaybeMath(subQ.text || q.question)}</span>
                  </div>
                  {/* Marks removed from here for this specific question type */}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Tick odd one
    if (String(title).trim() === "Tick the odd one in the following") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">
            {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
          </h3>
          {questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-4 ml-5">
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{getRomanSubIndex(idx)})</span>
                    {q.options && q.options.length > 0 && (
                      <span className="inline-flex flex-wrap gap-4">
                        {q.options.map((opt: string, optIdx: number) => (
                          <span key={optIdx} className="inline-flex items-center gap-1">
                            <span className="text-2xl leading-none">☐</span>
                            <span>{renderMaybeMath(opt)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                    {showIndividualMarks && subIdx === 0 && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Match the following
    if (String(title).trim() === "Match the following") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">
            {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
          </h3>
          {questions.map((q: any, idx: number) => (
            <div key={idx} className="mb-4 ml-5">
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 text-lg text-black font-local2 pr-4">
                      <span className="mr-2">{getRomanSubIndex(idx)})</span>
                      <span>{renderMaybeMath(subQ.text || q.question)}</span>
                    </div>
                    <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                      {showIndividualMarks && subIdx === 0 && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                    </div>
                  </div>
                  {q.imageUrl && (
                    <div className="mt-2 ml-6">
                      <img
                        src={q.imageUrl}
                        alt="Match"
                        className="max-w-full h-auto max-h-[200px] object-contain border border-gray-200 rounded"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Default
    return (
      <div key={`${section || ''}-${title}`} className="mb-6">
        {showSectionHeader && (
          <div className="text-center mb-4 mt-4">
            <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
          </div>
        )}
        <h3 className="text-lg font-semibold text-black mb-2 font-local2">
          {sectionRoman}. {title} <span className="float-right">{markBreakdown}</span>
        </h3>
        {questions.map((q: any, idx: number) => (
          <div key={idx} className="mb-4 ml-8">
            <div className="flex justify-between items-start text-lg text-black font-local2">
              <div className="flex-1 pr-4">
                <span className="mr-2">{getRomanSubIndex(idx)})</span>
                <span>{renderMaybeMath(q.question)}</span>
              </div>
              <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                {showIndividualMarks && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
              </div>
            </div>
            {q.options && (
              <div className="ml-6 mt-1 text-sm text-gray-700">
                {q.options.map((opt: string, i: number) => (
                  <div key={i}>
                    {String.fromCharCode(65 + i)}. {renderMaybeMath(opt)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleChooseQuestions = async () => {
    // Check if required fields are filled
    const formValues = form.getFieldsValue();
    const english = isEnglishSubjectValue(formValues.subject);
    if (!formValues.class) {
      message.error('Please fill the Class');
      return;
    }
    if (!formValues.subject) {
      message.error('Please fill the Subject');
      return;
    }
    if (!formValues.book) {
      message.error('Please fill the Book');
      return;
    }
    if (!formValues.chapters || formValues.chapters.length === 0) {
      message.error('Please select at least one Chapter');
      return;
    }
    if (!formValues.examType) {
      message.error('Please fill the Examination Type');
      return;
    }
    if (!formValues.totalMarks) {
      message.error('Please fill the Total Marks');
      return;
    }
    if (!formValues.duration) {
      message.error('Please fill the Duration');
      return;
    }
    if (english && selectedSections.length === 0) {
      message.error('Please select at least one Section');
      return;
    }
    if (selectedTypes.length === 0) {
      message.error('Please select at least one Question Type');
      return;
    }
    const hasValue = (v: any) => (Array.isArray(v) ? v.length > 0 : !!v);
    if (selectedTypes.includes('multiplechoice') && !hasValue(mcqSubtype)) {
      message.error('Please select a Multiple Choice Questions type');
      return;
    }
    if (selectedTypes.includes('direct') && !hasValue(directSubtype)) {
      message.error('Please select a Direct Questions type');
      return;
    }
    if (selectedTypes.includes('answerthefollowing') && !hasValue(answerFollowingSubtype)) {
      message.error('Please select an Answer the following questions type');
      return;
    }
    if (selectedTypes.includes('picture') && !hasValue(pictureSubtype)) {
      message.error('Please select a Picture questions type');
      return;
    }
    try {
      setChooseLoading(true);
      // Fetch questions from API
      await fetchQuestions();
      setShowChooser(true);
      requestAnimationFrame(() => {
        chooserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } finally {
      setChooseLoading(false);
    }
  };

  const handlePreview = () => {
    if (Object.keys(selectedQuestions).length === 0) {
      message.error('Please select at least one question');
      return;
    }

    // Debug: log all selected question details when "Generate Paper" is clicked
    const selectedDetails = Object.entries(selectedQuestions).map(([questionId, marks]) => {
      const question = selectedQuestionsData[questionId] || questionsData.find(q => q.id === questionId);
      return {
        id: questionId,
        marks,
        question,
      };
    });
    // eslint-disable-next-line no-console
    console.log('GENERATE PAPER - SELECTED QUESTIONS:', selectedDetails);

    setPreviewOpen(true);
  };

  const toggleQuestionSelection = (q: QuestionItem, newMarks?: number) => {
    setSelectedQuestions(prev => {
      const next = { ...prev } as Record<string, number>;
      const isAdding = !(q.id in next) || (typeof newMarks === 'number' && (newMarks as number) !== next[q.id]);
      const proposedMarks = typeof newMarks === 'number' ? (newMarks as number) : (next[q.id] ?? q.defaultMarks);

      if (!(q.id in next)) {
        // adding
        const sumIfAdd = Object.entries(next).reduce((a, [, m]) => a + (Number(m) || 0), 0) + (proposedMarks || 0);
        if (totalMarksField && sumIfAdd > totalMarksField) {
          Modal.warning({ title: 'Total marks exceeded', content: 'This selection exceeds Total Mark. Adjust marks or deselect another question.' });
          return prev;
        }
        next[q.id] = proposedMarks;
        // Store the question object
        setSelectedQuestionsData(prevData => ({ ...prevData, [q.id]: q }));
      } else {
        if (typeof newMarks === 'number') {
          // editing marks
          const sumIfEdit = Object.entries(next).reduce((a, [id, m]) => a + (id === q.id ? (Number(newMarks) || 0) : (Number(m) || 0)), 0);
          if (totalMarksField && sumIfEdit > totalMarksField) {
            Modal.warning({ title: 'Total marks exceeded', content: 'Edited marks exceed Total Mark. Reduce marks or remove some questions.' });
            return prev;
          }
          next[q.id] = newMarks;
        } else {
          // removing
          delete next[q.id];
          // Remove the question object
          setSelectedQuestionsData(prevData => {
            const newData = { ...prevData };
            delete newData[q.id];
            return newData;
          });
        }
      }
      return next;
    });
  };

  const enforceTotalMarks = () => {
    const sum = Object.values(selectedQuestions).reduce((a, b) => a + (Number(b) || 0), 0);
    if (totalMarksField && sum > totalMarksField) {
      Modal.warning({
        title: 'Total marks exceeded',
        content: 'Selected questions total exceeds Total Mark. Please adjust marks or selections.',
      });
      return false;
    }
    return true;
  };

  const handleConfirmChoose = () => {
    if (!enforceTotalMarks()) return;
    setShowChooser(false);
  };

  const [imagePreview, setImagePreview] = useState<{ open: boolean; url: string }>({
    open: false,
    url: '',
  });
  const handleClearAll = () => {
    // Reset form
    form.resetFields();

    // Reset all states
    setSelectedTypes([]);
    setShowChooser(false);
    setPreviewOpen(false);
    setSelectedQuestions({});
    setSelectedQuestionsData({});
    setPage(1);
    setPageSize(10);
    setModalFilterTypes([]);
    setSelectedSections([]);

    // Reset MCQ subtype, Direct subtype, Answer Following subtype, and Picture subtype
    setMcqSubtype(undefined);
    setDirectSubtype(undefined);
    setAnswerFollowingSubtype(undefined);
    setPictureSubtype(undefined);

    message.success('All data cleared successfully');
  };

  // Function to save examination data to API
  const saveExaminationData = async () => {
    const formValues = form.getFieldsValue();
    const english = isEnglishSubjectValue(formValues.subject);

    // Get book name and code from selected book ID
    const selectedBook = booksOptions.find(book => book.value === formValues.book);
    const selectedBookName = selectedBook?.label || formValues.book;
    const selectedBookCode = selectedBook?.code;

    // Get chapter names from selected chapter IDs
    const selectedChapterNames = Array.isArray(formValues.chapters)
      ? formValues.chapters.map(chapterId =>
        chaptersOptions.find(chapter => chapter.value === chapterId)?.label || chapterId
      )
      : [formValues.chapters];

    // Format questions data for API
    const formattedQuestions = Object.entries(selectedQuestions).map(([questionId, marks]) => {
      const question = selectedQuestionsData[questionId] || questionsData.find(q => q.id === questionId);
      if (!question) return null;

      // Use new question types directly (no mapping to old types)
      // Base question payload with full details
      const baseQuestion: any = {
        questionId: question.id,
        question: question.text,
        questionType: question.type, // Send new question types: multiplechoice, direct, answerthefollowing, picture
        mark: marks,
        qtitle: question.qtitle,
        // Send sub-questions as an array of objects with text (matches question save format)
        ...(question.subQuestions && question.subQuestions.length > 0
          ? {
            subQuestions: question.subQuestions.map((sq: string) => ({ text: sq }))
          }
          : {}),
        // Include image URL when available (useful for picture / match type questions)
        ...(question.imageUrl ? { imageUrl: question.imageUrl } : {}),
        // Include section field for English subject
        ...(english && question.section ? { section: question.section } : {})
      };
      const pickFirst = (v: any) => Array.isArray(v) ? v[0] : v;

      // Add options for Multiple Choice questions
      if (question.type === 'multiplechoice' && question.options) {
        return {
          ...baseQuestion,
          options: question.options.map((option: any) => option.text || option),
          mcqSubtype: pickFirst(question.mcqSubtype) || pickFirst(mcqSubtype)
        };
      }

      // Add directSubtype for Direct questions
      if (question.type === 'direct') {
        const directPayload: any = {
          ...baseQuestion,
          directSubtype: pickFirst(question.directSubtype) || pickFirst(directSubtype)
        };

        // Add options if they exist (needed for "Tick the odd one", "Match the following", etc.)
        if (question.options && question.options.length > 0) {
          directPayload.options = question.options.map((option: any) => option.text || option);
        }

        return directPayload;
      }

      // Add answerFollowingSubtype for Answer the following questions
      if (question.type === 'answerthefollowing') {
        return {
          ...baseQuestion,
          answerFollowingSubtype: pickFirst(question.answerFollowingSubtype) || pickFirst(answerFollowingSubtype)
        };
      }

      // Add imageUrl and pictureSubtype for picture questions
      if (question.type === 'picture') {
        return {
          ...baseQuestion,
          imageUrl: question.imageUrl,
          pictureSubtype: pickFirst(question.pictureSubtype) || pickFirst(pictureSubtype)
        };
      }

      return baseQuestion;
    }).filter(Boolean);

    const payload = {
      schoolId: user?.id,
      subject: formValues.subject,
      class: formValues.class,
      book: selectedBookName,
      ...(selectedBookCode ? { code: selectedBookCode } : {}),
      chapters: selectedChapterNames,
      examinationType: formValues.examType,
      totalMark: totalMarksField,
      duration: formValues.duration,
      schoolName: user?.displayName || user?.username || 'School',
      questions: formattedQuestions
    };

    try {
      setDownloadLoading(true);
      const response = await POST("/examinations", payload);
      console.log('Examination saved successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to save examination:', error);
      message.error('Failed to save examination data');
      throw error;
    } finally {
      setDownloadLoading(false);
    }
  };

  // Helper function to fetch image as ArrayBuffer
  const fetchImageArrayBuffer = async (url?: string) => {
    if (!url) return null;
    try {
      if (url.startsWith("data:")) {
        const data = url.split(",")[1];
        if (!data) return null;
        const binaryString = atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }

      const sameOrigin = url.startsWith(window.location.origin);
      const fetchOptions: RequestInit = sameOrigin
        ? { credentials: "include" }
        : { mode: "cors" };
      const response = await fetch(url, fetchOptions);
      if (!response.ok) throw new Error("Image fetch failed");
      return await response.arrayBuffer();
    } catch (error) {
      console.warn("Unable to load image for Word export:", error);
      return null;
    }
  };

  // Helper function to convert image via canvas
  const convertImageToArrayBufferViaCanvas = async (url?: string) => {
    if (!url) return null;
    return new Promise<ArrayBuffer | null>((resolve) => {
      try {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth || 320;
            canvas.height = image.naturalHeight || 180;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              if (!blob) {
                resolve(null);
                return;
              }
              blob
                .arrayBuffer()
                .then((buffer) => resolve(buffer))
                .catch(() => resolve(null));
            }, "image/png");
          } catch (canvasError) {
            console.warn("Canvas conversion failed:", canvasError);
            resolve(null);
          }
        };
        image.onerror = () => resolve(null);
        image.src = url;
      } catch (error) {
        console.warn("Canvas setup failed:", error);
        resolve(null);
      }
    });
  };

  // Helper function to create header table
  const createHeaderTable = (stdLabel: string, subjectDisplay: string, totalMarks: number, durationLabel: string) => {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: `Std: ${stdLabel}`, alignment: AlignmentType.LEFT })],
              width: { size: 33, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: subjectDisplay, alignment: AlignmentType.CENTER })],
              width: { size: 34, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: `Marks: ${totalMarks}`, alignment: AlignmentType.RIGHT })],
              width: { size: 33, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "HM", alignment: AlignmentType.LEFT })],
              width: { size: 33, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: "" })],
              width: { size: 34, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: `Time: ${durationLabel}`, alignment: AlignmentType.RIGHT })],
              width: { size: 33, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ]
    });
  };

  const handlePrintQuestionPaper = async () => {
    // Check if total selected marks match the total marks field
    if (totalMarksField && currentSumMarks !== totalMarksField) {
      Modal.warning({
        title: 'Marks Mismatch',
        content: `Total selected marks (${currentSumMarks}) does not match the total marks field (${totalMarksField}). Please adjust your question selections to match the total marks.`,
        okText: 'OK'
      });
      return;
    }

    try {
      setDownloadLoading(true);
      await saveExaminationData();
      message.success('Examination data saved successfully');
      navigate('/mypapers');
    } catch (error) {
      // If API call fails, don't proceed
      message.error('Failed to save examination data');
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#007575' } }}>
      <div className="space-y-6 font-local2">
        <Card className="shadow-sm border border-gray-200 p-3 md:p-6 font-local2">
          <Title level={4} className="!mb-4 text-gray-700 font-local2">Create Paper</Title>
          <Form form={form} layout="vertical" preserve={false} className="font-local2">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} lg={8}>
                <Form.Item label="Class" name="class" required={false} rules={[{ required: true, message: 'Please select class' }]}>
                  <Select
                    size="large"
                    showSearch
                    allowClear
                    placeholder="Select class"
                    options={classOptions.map(c => ({ label: c, value: c }))}
                    filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item label="Subject" name="subject" required={false} rules={[{ required: true, message: 'Please select subject' }]}>
                  <Select
                    size="large"
                    showSearch
                    allowClear
                    placeholder="Select subject"
                    options={subjectsOptions}
                    loading={subjectsLoading}
                    filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item label="Book" name="book" required={false} rules={[{ required: true, message: 'Please select book' }]}>
                  <Select
                    size="large"
                    showSearch
                    allowClear
                    placeholder="Select book"
                    options={booksOptions}
                    loading={booksLoading}
                    disabled={!selectedClass || !selectedSubject}
                    filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item label="Chapters" name="chapters" required={false} rules={[{ required: true, message: 'Please select chapters' }]}>
                  <Select
                    size="large"
                    mode="multiple"
                    showSearch
                    allowClear
                    placeholder="Select chapters"
                    options={chaptersOptions}
                    loading={chaptersLoading}
                    disabled={!selectedClass || !selectedSubject || !selectedBook}
                    filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item label="Examination Type" name="examType" required={false} rules={[{ required: true, message: 'Please select exam type' }]}>
                  <Select
                    size="large"
                    showSearch
                    placeholder="Select examination type"
                    options={examTypes}
                    filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={4}>
                <Form.Item label="Total Mark" name="totalMarks" required={false} rules={[{ required: true }]}>
                  <InputNumber min={1} max={999} size="large" className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={4}>
                <Form.Item label="Duration (min)" name="duration" required={false} rules={[{ required: true }]}>
                  <InputNumber min={1} max={999} size="large" className="w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Divider className="mt-0" />

            <div>
              {isEnglishSubjectValue(selectedSubject) && (
                <div className="mb-4">
                  <div className="mb-2 text-gray-700 font-medium">Sections</div>
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Select sections"
                    value={selectedSections}
                    onChange={(vals) => setSelectedSections(vals as string[])}
                    options={[
                      { label: 'Section A (Reading)', value: 'SectionA' },
                      { label: 'Section B (Writing)', value: 'SectionB' },
                      { label: 'Section C (Grammer)', value: 'SectionC' },
                      { label: 'Section D (Textual Questions)', value: 'SectionD' },
                    ]}
                    className="w-full"
                    allowClear
                  />
                </div>
              )}
              <div className="mb-2 text-gray-700 font-medium">Question Types</div>
              <Checkbox.Group
                options={[
                  { label: 'Multiple Choice Questions', value: 'multiplechoice' },
                  { label: 'Direct Questions', value: 'direct' },
                  { label: 'Answer the following questions', value: 'answerthefollowing' },
                  { label: 'Picture Questions', value: 'picture' },
                ]}
                value={selectedTypes}
                onChange={(vals) => {
                  setSelectedTypes(vals as QuestionType[]);
                  // Clear MCQ subtype if Multiple Choice Questions is deselected
                  if (!vals.includes('multiplechoice')) {
                    setMcqSubtype(undefined);
                  }
                  // Clear Direct subtype if Direct Questions is deselected
                  if (!vals.includes('direct')) {
                    setDirectSubtype(undefined);
                  }
                  // Clear Answer Following subtype if Answer the following questions is deselected
                  if (!vals.includes('answerthefollowing')) {
                    setAnswerFollowingSubtype(undefined);
                  }
                  // Clear Picture subtype if Picture questions is deselected
                  if (!vals.includes('picture')) {
                    setPictureSubtype(undefined);
                  }
                }}
              />
              {selectedTypes.includes('multiplechoice') && (
                <div className="mt-4">
                  <div className="mb-2 text-gray-700 font-medium">Multiple Choice Questions title</div>
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Select MCQ type"
                    value={mcqSubtype}
                    onChange={(value) => setMcqSubtype(value)}
                    options={mcqSubtypeOptions}
                    className="w-full"
                    allowClear
                  />
                </div>
              )}
              {selectedTypes.includes('direct') && (
                <div className="mt-4">
                  <div className="mb-2 text-gray-700 font-medium">Direct Questions title</div>
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Select Direct Questions type"
                    value={directSubtype}
                    onChange={(value) => setDirectSubtype(value)}
                    options={directSubtypeOptions}
                    className="w-full"
                    allowClear
                  />
                </div>
              )}
              {selectedTypes.includes('answerthefollowing') && (
                <div className="mt-4">
                  <div className="mb-2 text-gray-700 font-medium">Answer the following questions title</div>
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Select Answer the following questions type"
                    value={answerFollowingSubtype}
                    onChange={(value) => setAnswerFollowingSubtype(value)}
                    options={answerFollowingSubtypeOptions}
                    className="w-full"
                    allowClear
                  />
                </div>
              )}
              {selectedTypes.includes('picture') && (
                <div className="mt-4">
                  <div className="mb-2 text-gray-700 font-medium">Picture questions title</div>
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Select Picture questions type"
                    value={pictureSubtype}
                    onChange={(value) => setPictureSubtype(value)}
                    options={pictureSubtypeOptions}
                    className="w-full"
                    allowClear
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Button type="primary" onClick={handleChooseQuestions} disabled={chooseLoading} loading={chooseLoading} className="bg-gradient-to-br from-[#007575] to-[#339999] border-none text-white font-local2">
                Choose Questions
              </Button>
              <Button onClick={handleClearAll} className="bg-red-500 hover:!bg-red-500 border-none text-white hover:!text-white font-local2">
                Clear All
              </Button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div>Selected Questions: {Object.keys(selectedQuestions).length}</div>
              <div>Total Selected Marks: {currentSumMarks} {totalMarksField ? `(of ${totalMarksField})` : ''}</div>
              <Button type="primary" onClick={handlePreview}
                disabled={Object.keys(selectedQuestions).length === 0} className="bg-green-500 hover:!bg-green-500 border-none text-white hover:text-white font-local2 mt-5">
                Generate Paper
              </Button>
            </div>
          </Form>
        </Card>

        {showChooser && (
          <div ref={chooserRef}>
            <Card className="shadow-sm border border-gray-200 font-local2">
              <div className="space-y-4 font-local2" ref={topRef}>

                <div className=" gap-3 sticky top-0 z-20 bg-gray-50 py-2  p-3 md:p-4 rounded-xl  border-2 border-teal-700">
                  {/* <div className="text-[#007575] font-medium text-sm">Filter question types</div> */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="w-full md:w-[60%] flex flex-wrap gap-2">
                      <Popover
                        content={
                          <div className="w-[300px] max-h-[400px] overflow-y-auto">
                            <div className="space-y-4">
                              {selectedTypes.includes('multiplechoice') && (
                                <div>
                                  <div className="font-semibold text-gray-700 bg-gray-100 px-2 py-1 mb-2 rounded">Multiple Choice</div>
                                  <div className="pl-2 space-y-1">
                                    {mcqSubtypeOptions.map(opt => (
                                      <div key={opt.value}>
                                        <Checkbox
                                          checked={tempFilterSubtypes['multiplechoice']?.includes(opt.label)}
                                          onChange={(e) => {
                                            const current = tempFilterSubtypes['multiplechoice'] || [];
                                            const updated = e.target.checked
                                              ? [...current, opt.label]
                                              : current.filter(l => l !== opt.label);
                                            setTempFilterSubtypes({
                                              ...tempFilterSubtypes,
                                              'multiplechoice': updated
                                            });
                                          }}
                                        >
                                          <span className="text-xs">{opt.label}</span>
                                        </Checkbox>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTypes.includes('direct') && (
                                <div>
                                  <div className="font-semibold text-gray-700 bg-gray-100 px-2 py-1 mb-2 rounded">Direct Questions</div>
                                  <div className="pl-2 space-y-1">
                                    {directSubtypeOptions.map(opt => (
                                      <div key={opt.value}>
                                        <Checkbox
                                          checked={tempFilterSubtypes['direct']?.includes(opt.label)}
                                          onChange={(e) => {
                                            const current = tempFilterSubtypes['direct'] || [];
                                            const updated = e.target.checked
                                              ? [...current, opt.label]
                                              : current.filter(l => l !== opt.label);
                                            setTempFilterSubtypes({
                                              ...tempFilterSubtypes,
                                              'direct': updated
                                            });
                                          }}
                                        >
                                          <span className="text-xs">{opt.label}</span>
                                        </Checkbox>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTypes.includes('answerthefollowing') && (
                                <div>
                                  <div className="font-semibold text-gray-700 bg-gray-100 px-2 py-1 mb-2 rounded">Answer The Following</div>
                                  <div className="pl-2 space-y-1">
                                    {answerFollowingSubtypeOptions.map(opt => (
                                      <div key={opt.value}>
                                        <Checkbox
                                          checked={tempFilterSubtypes['answerthefollowing']?.includes(opt.label)}
                                          onChange={(e) => {
                                            const current = tempFilterSubtypes['answerthefollowing'] || [];
                                            const updated = e.target.checked
                                              ? [...current, opt.label]
                                              : current.filter(l => l !== opt.label);
                                            setTempFilterSubtypes({
                                              ...tempFilterSubtypes,
                                              'answerthefollowing': updated
                                            });
                                          }}
                                        >
                                          <span className="text-xs">{opt.label}</span>
                                        </Checkbox>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTypes.includes('picture') && (
                                <div>
                                  <div className="font-semibold text-gray-700 bg-gray-100 px-2 py-1 mb-2 rounded">Picture Questions</div>
                                  <div className="pl-2 space-y-1">
                                    {pictureSubtypeOptions.map(opt => (
                                      <div key={opt.value}>
                                        <Checkbox
                                          checked={tempFilterSubtypes['picture']?.includes(opt.label)}
                                          onChange={(e) => {
                                            const current = tempFilterSubtypes['picture'] || [];
                                            const updated = e.target.checked
                                              ? [...current, opt.label]
                                              : current.filter(l => l !== opt.label);
                                            setTempFilterSubtypes({
                                              ...tempFilterSubtypes,
                                              'picture': updated
                                            });
                                          }}
                                        >
                                          <span className="text-xs">{opt.label}</span>
                                        </Checkbox>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 pt-3 border-t flex justify-end">
                              <Button
                                type="primary"
                                size="small"
                                className="bg-[#007575]"
                                onClick={async () => {
                                  setFilterPopoverOpen(false);
                                  setActiveFilterSubtypes(tempFilterSubtypes);

                                  // Collect all selected titles
                                  const allSelectedTitles = Object.values(tempFilterSubtypes).flat();

                                  setPage(1);
                                  setFilterLoading(true);
                                  try {
                                    await fetchQuestions(1, pageSize, selectedTypes, allSelectedTitles);
                                  } finally {
                                    setFilterLoading(false);
                                  }
                                }}
                              >
                                OK
                              </Button>
                            </div>
                          </div>
                        }
                        trigger="click"
                        open={filterPopoverOpen}
                        onOpenChange={(visible) => {
                          setFilterPopoverOpen(visible);
                          if (visible) {
                            // Sync temp with active when opening
                            setTempFilterSubtypes(activeFilterSubtypes);
                          }
                        }}
                        placement="bottomLeft"
                      >
                        <div className="cursor-pointer flex items-center gap-1 text-[#007575] font-medium text-sm hover:opacity-80 transition-opacity">
                          Filter question types
                          <ChevronDown size={16} />
                        </div>
                      </Popover>
                    </div>
                    <div className="w-full md:w-[40%] flex items-center justify-end gap-4 text-[15px] text-[#007575] ">
                      <span>Selected Questions:{Object.keys(selectedQuestions).length}</span>
                      <span>
                        Total Selected Marks: {currentSumMarks} {totalMarksField ? `(of ${totalMarksField})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-3 md:p-6">
                  {(questionsLoading || filterLoading) && (
                    <div className="flex justify-center items-center py-8">
                      <Spin />
                    </div>
                  )}
                  {!questionsLoading && !filterLoading && paginatedQuestions.length === 0 && (
                    <div className="text-center text-gray-500 py-8">No questions found</div>
                  )}
                  {!questionsLoading && !filterLoading && paginatedQuestions.map((q, index) => {
                    const checked = q.id in selectedQuestions;
                    const currentMarks = selectedQuestions[q.id] ?? q.defaultMarks;
                    const questionNumber = getQuestionNumber(index);
                    const isPictureType = q.type === 'picture' || (typeof q.originalQuestionType === 'string' && q.originalQuestionType.toLowerCase().includes('picture'));
                    const sectionLabels: Record<string, string> = {
                      SectionA: 'Section A (Reading)',
                      SectionB: 'Section B (Writing)',
                      SectionC: 'Section C (Grammer)',
                      SectionD: 'Section D (Textual Questions)',
                    };
                    const displaySectionLabel = q.section ? (sectionLabels[q.section] || q.section) : null;
                    const typeLabel =
                      q.originalQuestionType ||
                      (q.type === 'multiplechoice'
                        ? 'Multiple Choice'
                        : q.type === 'direct'
                          ? 'Direct Questions'
                          : q.type === 'answerthefollowing'
                            ? 'Answer the following questions'
                            : q.type === 'picture'
                              ? 'Picture questions'
                              : q.type);
                    return (
                      <Card key={q.id} className={`border ${checked ? 'border-blue-400' : 'border-gray-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className="text-sm font-semibold text-gray-600 min-w-[30px]">
                            {questionNumber}.
                          </div>
                          <div className="flex-1">
                            {/* Show Section first when subject is English */}
                            {isEnglishSubjectValue(selectedSubject) && displaySectionLabel && (
                              <div className="text-xs text-gray-700 mb-0.5">
                                {displaySectionLabel}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-4 mb-1">
                              <div className="text-xs text-gray-700">
                                Question type :- {typeLabel}
                              </div>
                              {q.qtitle && (
                                <div className="text-xs text-gray-700">
                                  Question title :- {q.qtitle}
                                </div>
                              )}
                            </div>
                            {(q.chapter || q.chapterName) && (
                              <div className="text-xs text-gray-700 mb-2">
                                Chapter :- {q.chapter || q.chapterName}
                              </div>
                            )}
                            {/* Handle "Tick the odd one in the following" - don't show question text, only options */}
                            {q.qtitle === 'Tick the odd one in the following' ? null : (
                              <>
                                {q.subQuestions && q.subQuestions.length > 1 ? (
                                  <div className="space-y-2">
                                    {q.subQuestions.map((subQ: string, index: number) => (
                                      <div key={index} className="text-gray-800">
                                        {index + 1}. {isMathSubjectValue(selectedSubject) ? <InlineMath math={`\\mathrm{${unescapeLatex(subQ)}}`} /> : subQ}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-800">
                                    {isMathSubjectValue(selectedSubject) ? <InlineMath math={`\\mathrm{${unescapeLatex(q.text)}}`} /> : q.text}
                                  </div>
                                )}
                              </>
                            )}
                            {/* Show image for picture questions and "Match the following" */}
                            {isPictureType && q.imageUrl && (
                              <div className="mt-2">
                                <img
                                  src={q.imageUrl}
                                  alt="Question Image"
                                  className="w-48 h-32 object-cover rounded border cursor-pointer"
                                  onClick={() => setImagePreview({ open: true, url: q.imageUrl || '' })}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            {/* Show image for "Match the following" (Direct Questions with image) */}
                            {q.qtitle === 'Match the following' && q.type === 'direct' && q.imageUrl && (
                              <div className="mt-2">
                                <img
                                  src={q.imageUrl}
                                  alt="Question Image"
                                  className="w-48 h-32 object-cover rounded border cursor-pointer"
                                  onClick={() => setImagePreview({ open: true, url: q.imageUrl || '' })}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            {/* Show options for multiple choice questions */}
                            {q.type === 'multiplechoice' && q.options && Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="text-gray-600 mt-3">
                                <div className="text-xs font-medium mb-1 text-gray-700">Options:</div>
                                <div className="space-y-1">
                                  {q.options.map((option: any, index: number) => (
                                    <div key={index} className="text-sm">
                                      {String.fromCharCode(65 + index)}. {isMathSubjectValue(selectedSubject) ? <InlineMath math={`\\mathrm{${unescapeLatex(option.text || option)}}`} renderError={() => <span>{option.text || option}</span>} /> : (option.text || option)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Show options for direct questions (like "Tick the odd one in the following") */}
                            {q.type === 'direct' && q.options && Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="text-gray-600 mt-3">
                                <div className="text-xs font-medium mb-1 text-gray-700">Options:</div>
                                <div className="space-y-1">
                                  {q.options.map((option: any, index: number) => (
                                    <div key={index} className="text-sm">
                                      {String.fromCharCode(65 + index)}. {isMathSubjectValue(selectedSubject) ? <InlineMath math={`\\mathrm{${unescapeLatex(option.text || option)}}`} renderError={() => <span>{option.text || option}</span>} /> : (option.text || option)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Checkbox checked={checked} onChange={() => toggleQuestionSelection(q)} className="font-local2">
                                Choose
                              </Checkbox>
                              <div className="flex items-center gap-2">
                                <Text type="secondary" className="text-xs">Marks:</Text>
                                <InputNumber min={1} max={100} value={currentMarks} onChange={(val) => toggleQuestionSelection(q, Number(val) || q.defaultMarks)} size="small" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                <div className="flex justify-center">
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={totalQuestions}
                    onChange={async (p, ps) => {
                      const newPage = p;
                      const newPageSize = ps || pageSize;

                      // Update states
                      setPage(newPage);
                      if (ps && ps !== pageSize) {
                        setPageSize(newPageSize);
                      }

                      // Fetch questions with the new parameters immediately
                      await fetchQuestions(newPage, newPageSize);
                    }}
                    showSizeChanger
                    pageSizeOptions={['10', '20', '50']}
                    showTotal={(total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`}
                    className="font-local2"
                  />
                </div>
                <Divider className="my-2" />
                <div className="flex items-center justify-between">
                  <div className="text-gray-700">Total Selected Marks: {currentSumMarks}</div>
                  {totalMarksField && currentSumMarks > totalMarksField && (
                    <div className="text-red-500 text-sm">Exceeds Total Mark</div>
                  )}
                </div>

              </div>
            </Card>
          </div>
        )
        }

        {/* Preview Modal */}
        <Modal
          title={
            <div className="flex items-center justify-between">
              <span>Question Paper Preview</span>
              <Button
                type="primary"
                icon={<Download size={16} />}
                onClick={handlePrintQuestionPaper}
                loading={downloadLoading}
                disabled={downloadLoading}
                className="bg-gradient-to-br from-[#007575] to-[#339999] border-none text-white font-local2"
              >
                {downloadLoading ? 'Saving...' : 'Generate Paper'}
              </Button>
            </div>
          }
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={null}
          width={900}
          className="font-local2"
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="max-w-4xl mx-auto" style={{ fontFamily: 'Times, serif' }}>
              {/* Header */}
              <div className="mb-4 text-lg font-local2 text-black">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-end flex-1 min-w-0">
                    <span className="font-semibold whitespace-nowrap">NAME:</span>
                    <span className="text-[20px] leading-none tracking-wider ml-1 overflow-hidden">......................................................................................................</span>
                  </div>
                  <div className="flex items-end flex-shrink-0 w-[200px] max-w-[200px]">
                    <span className="font-semibold whitespace-nowrap">ROLL NO:</span>
                    <span className="text-[20px] leading-none tracking-wider ml-1 overflow-hidden">.................</span>
                  </div>
                </div>
              </div>
              <div className="text-center mb-3">
                <h1 className="text-2xl font-bold uppercase font-local2">
                  {formValues?.examType || 'Examination'} EXAMINATION - 2025-26
                </h1>
              </div>
              <div className="flex flex-col gap-1 mb-5 text-base font-local2 text-black">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="font-semibold text-lg text-left whitespace-nowrap sm:flex-[0_0_140px]">
                    Std: {getStdLabel(formValues?.class) || '-'}
                  </div>
                  <div className="flex-1 text-center font-semibold text-lg sm:px-2">
                    {getSubjectDisplay(formValues?.subject, booksOptions.find(book => book.value === formValues?.book)?.code || booksOptions.find(book => book.value === formValues?.book)?.label || formValues?.book)?.toUpperCase() || ''}
                  </div>
                  <div className="font-semibold text-lg text-right whitespace-nowrap sm:flex-[0_0_140px]">
                    Marks: {totalMarksField || currentSumMarks}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-base font-local2 normal-case mb-2">
                  <div className="text-left whitespace-nowrap sm:flex-[0_0_140px] font-semibold text-lg">HM</div>
                  <div className="flex-1" />
                  <div className="text-right whitespace-nowrap sm:flex-[0_0_140px] font-semibold text-lg">
                    Time: {formatDuration(formValues?.duration || 60)}
                  </div>
                </div>
                <div className="flex items-center sm:justify-between gap-3">
                  <div className="flex-1 border-b-2 border-gray-500" />
                </div>
              </div>

              {/* Questions (grouped by Title like My Papers preview) */}
              <div className="space-y-6">
                {groupedQuestionsForPreview.length > 0 ? (
                  groupedQuestionsForPreview.map((group: any, index: number) => {
                    const previousSection = index > 0 ? groupedQuestionsForPreview[index - 1].section : undefined;
                    return renderQuestionSectionLikeMyPapers(group, index, previousSection);
                  })
                ) : (
                  <div className="text-center text-gray-500">No questions found.</div>
                )}
              </div>
            </div>
          </div>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          open={imagePreview.open}
          onCancel={() => setImagePreview({ open: false, url: '' })}
          footer={null}
          centered
          width={600}
          className="font-local2"
        >
          <div className="flex justify-center items-center">
            {imagePreview.url ? (
              <img
                src={imagePreview.url}
                alt="Preview"
                className="max-h-[70vh] object-contain rounded border"
              />
            ) : (
              <div className="text-gray-500">No image to preview</div>
            )}
          </div>
        </Modal>

      </div >
    </ConfigProvider >
  );
};

export default Paper;