// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Button, Card, Typography, Modal, Input, Dropdown, message, Select, Pagination } from "antd";
import { Search, Eye, Download, ArrowLeft, Printer, User, MoreVertical, FileText, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import jsPDF from "jspdf";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Media, Packer, Paragraph, Table, TableCell, TableRow, TabStopType, TextRun, WidthType, ImageRun } from "docx";
import { saveAs } from "file-saver";
import img1 from "../../../../assets/matching.png"
import img2 from "../../../../assets/match2.jpeg"
import paperDummy from "../../../../assets/paperdummy.webp"
import { API, GET, DELETE } from "../../../../Components/common/api";
import { Popconfirm } from "antd";
import { MdDeleteOutline } from "react-icons/md";
import { latexToDocxMath } from "@/utils/mathExport";
const { Title, Text } = Typography;
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Class options (same as Books module)
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
  "8"
];

const classOptions = CLASS_OPTIONS.map(cls => ({ value: cls, label: cls }));

// Dummy papers data matching Paper creation template



// Check if device is mobile
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

// Convert minutes to hours/min format with half-hours as ½
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  // If less than an hour
  if (hours === 0) {
    if (mins === 30) return '½ hr';
    return `${minutes} min`;
  }

  // Exact hour(s)
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  }

  // Half hour
  if (mins === 30) {
    return `${hours} ½ ${hours === 1 ? 'hr' : 'hrs'}`;
  }

  // Hour(s) plus minutes
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${mins} min`;
};

const getStdLabel = (classValue?: string | number) => {
  if (classValue === undefined || classValue === null || classValue === '') return '-';
  const parsed = Number(classValue);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return toRomanNumeral(parsed);
  }
  return String(classValue).toUpperCase();
};

const getSubjectDisplay = (subject?: string, code?: string) => {
  const cleanSubject = subject?.trim();
  if (cleanSubject) return cleanSubject;
  return '';
};

// Helper to unescape LaTeX backslashes from API response
const unescapeLatex = (text: string | undefined): string => {
  if (!text || typeof text !== 'string') return text || '';
  // Replace double backslashes with single backslash
  return text.replace(/\\\\/g, '\\');
};

const renderMath = (text: string, isMath: boolean) => {
  if (!text) return null;
  if (isMath) {
    // Escape spaces to ensure they are preserved in \\mathrm environment
    // Using String(text) to match Paper component's safety check
    const mathText = unescapeLatex(String(text));
    return (
      <InlineMath
        math={`\\mathrm{${mathText}}`}
        renderError={(error) => <span>{text}</span>}
      />
    );
  }
  return text;
};

// Helper to format marks - converts .5 decimals to unicode fraction format (½)
const formatMarks = (marks: number | undefined | null): string => {
  if (marks === undefined || marks === null) return '0';
  const num = Number(marks);
  if (Number.isNaN(num)) return String(marks);

  // Whole number
  if (num % 1 === 0) return String(num);

  // Exactly .5
  const decimalPart = num % 1;
  if (Math.abs(decimalPart - 0.5) < 0.001) {
    const wholePart = Math.floor(num);
    return wholePart === 0 ? '½' : `${wholePart} ½`;
  }

  // Other decimals
  return String(num);
};

// Helper to format marks for Word document - converts .5 decimals to unicode fraction format (½)
const formatMarksForWord = (marks: number | undefined | null): string => {
  if (marks === undefined || marks === null) return '0';
  const num = Number(marks);
  if (Number.isNaN(num)) return String(marks);

  // Whole number
  if (num % 1 === 0) return String(num);

  // Exactly .5
  const decimalPart = num % 1;
  if (Math.abs(decimalPart - 0.5) < 0.001) {
    const wholePart = Math.floor(num);
    return wholePart === 0 ? '½' : `${wholePart} ½`;
  }

  return String(num);
};

// Helper to render text mixed with math for Word
// Splits content so that English words use standard font (Times New Roman)
// and only actual math/numbers use Math formatting
const renderMixedTextForWord = (text: string, isMathSubject: boolean) => {
  if (!text) return [];
  if (!isMathSubject) return [new TextRun({ text })];

  // Clean standard LaTeX escaped spaces and handle special symbols
  const cleanText = text
    .replace(/\\ /g, ' ')
    .replace(/[口☐□]/g, ' \\square ');

  const tokens = cleanText.split(/(\s+)/);
  const runs: any[] = [];

  let mathBuffer = "";

  // Helper to check if buffer is properly balanced
  const isBalanced = (str: string) => {
    let brace = 0; // {}
    let paren = 0; // ()
    let brack = 0; // []
    // Simple checks for delimiters - not perfect but catches most split cases like \left( ... \right)
    for (const char of str) {
      if (char === '{') brace++;
      else if (char === '}') brace--;
      else if (char === '(') paren++;
      else if (char === ')') paren--;
      else if (char === '[') brack++;
      else if (char === ']') brack--;
    }
    return brace === 0 && paren === 0 && brack === 0;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    // Check if token is purely text (letters, punctuation, brackets that are not part of math cmds)
    // If we are already buffering math, we treat this as part of math unless balanced.

    // If buffer is empty, check if this token starts a math block
    if (!mathBuffer) {
      const isText = /^[a-zA-Z\.,!?'":;()\[\]<>\s-]+$/.test(token) &&
        !token.includes('\\') && !token.includes('^') && !token.includes('_') &&
        !/\d/.test(token); // numbers are math

      if (isText) {
        runs.push(new TextRun({ text: token, font: 'Times New Roman' }));
        continue;
      }
    }

    // It is math or part of math. Add to buffer.
    mathBuffer += token;

    // Check balance
    if (isBalanced(mathBuffer)) {
      // Attempt to convert
      const mathObj = latexToDocxMath(mathBuffer, false);
      if (mathObj) {
        runs.push(mathObj);
        mathBuffer = "";
      } else {
        // Fallback: If conversion fails (e.g. non-math text that looked like math, or CJK chars),
        // output as standard text and clear buffer to proceed.
        runs.push(new TextRun({ text: mathBuffer, font: 'Times New Roman' }));
        mathBuffer = "";
      }
    }
  }

  // Flush remaining buffer
  if (mathBuffer) {
    const mathObj = latexToDocxMath(mathBuffer, false);
    if (mathObj) {
      runs.push(mathObj);
    } else {
      runs.push(new TextRun({ text: mathBuffer, font: 'Times New Roman' }));
    }
  }

  return runs;
};

// Check if class is 4 or below


const ViewQuestionPaper = ({ paper, onBack, onDelete }: any) => {
  const [wordLoading, setWordLoading] = useState(false);
  const user = useSelector((state: any) => state.user.user);
  const schoolCode = user?.schoolCode || paper?.code || '535';

  const stdLabel = getStdLabel(paper.class);
  const subjectDisplay = getSubjectDisplay(paper.subject, paper.code);
  const subjectDisplayUpper = subjectDisplay ? subjectDisplay.toUpperCase() : '';

  // Helper to get section display name
  const getSectionDisplayName = (section?: string): string | null => {
    if (!section) return null;
    const sectionUpper = section.toUpperCase();
    const sectionMap: Record<string, string> = {
      'SECTIONA': 'SECTION - A (READING)',
      'SECTIONB': 'SECTION - B (WRITING)',
      'SECTIONC': 'SECTION - C (GRAMMER)',
      'SECTIOND': 'SECTION - D (TEXTUAL QUESTIONS)'
    };
    return sectionMap[sectionUpper] || null;
  };

  // Check if subject is English (case-insensitive)
  const isEnglishSubject = paper.subject && paper.subject.toLowerCase() === 'english';

  // Check if subject is Mathematics (case-insensitive)
  const isMathSubject = paper.subject &&
    ['math', 'maths', 'mathematics'].includes(String(paper.subject).trim().toLowerCase());

  // Logic to group questions by section (for English) or qtitle (for others)
  const groupedQuestions = React.useMemo(() => {
    if (!paper.questions || !Array.isArray(paper.questions)) return [];

    if (isEnglishSubject) {
      // For English: Group by section first, then by qtitle within each section
      const sectionGroups: Record<string, Record<string, any[]>> = {};
      const sectionOrder: string[] = [];
      const sectionTitleOrder: Record<string, string[]> = {};

      paper.questions.forEach((q: any) => {
        const section = q.section || 'Miscellaneous';
        const title = q.qtitle || "Miscellaneous";

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

      // Sort sections in order: A, B, C, D
      const sectionPriority: Record<string, number> = {
        'SectionA': 1,
        'SectionB': 2,
        'SectionC': 3,
        'SectionD': 4
      };
      const sortedSectionOrder = sectionOrder.sort((a, b) => {
        const priorityA = sectionPriority[a] || 999;
        const priorityB = sectionPriority[b] || 999;
        return priorityA - priorityB;
      });

      // Flatten into array with section info
      const result: Array<{ section?: string, sectionDisplay?: string, title: string, questions: any[] }> = [];
      sortedSectionOrder.forEach(section => {
        const sectionDisplay = getSectionDisplayName(section);
        sectionTitleOrder[section].forEach(title => {
          result.push({
            section,
            sectionDisplay: sectionDisplay || undefined,
            title,
            questions: sectionGroups[section][title]
          });
        });
      });

      return result;
    } else {
      // For other subjects: Group by qtitle only
      const groups: Record<string, any[]> = {};
      const titlesOrder: string[] = [];

      paper.questions.forEach((q: any) => {
        const title = q.qtitle || "Miscellaneous";
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
        "Describe the following picture" // Removed period as per standard clean title logic usually, but user provided with period. I'll stick to a loose match.
      ].map(t => t.toLowerCase().trim()); // normalize for comparison

      titlesOrder.sort((a, b) => {
        const lowerA = a.toLowerCase().trim();
        const lowerB = b.toLowerCase().trim();

        // Check if titles start with any of the priority titles (to handle variations like "Describe the following picture.")
        const indexA = titlePriority.findIndex(p => lowerA === p || lowerA.startsWith(p));
        const indexB = titlePriority.findIndex(p => lowerB === p || lowerB.startsWith(p));

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return lowerA.localeCompare(lowerB);
      });

      return titlesOrder.map(title => ({
        title,
        questions: groups[title]
      }));
    }
  }, [paper.questions, isEnglishSubject]);


  // Helper to resolve Roman numerals for sub-questions
  const getRomanSubIndex = (index: number) => {
    const romans = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
    return romans[index] || `${index + 1}`;
  };

  // Helper to calculate total marks for the paper
  const currentSumMarks = paper.totalMark || paper.totalMarks ||
    (paper.questions ? paper.questions.reduce((sum: number, q: any) => sum + (q.mark || q.marks || 0), 0) : 0);


  const renderQuestionSection = (group: { section?: string, sectionDisplay?: string, title: string, questions: any[] }, groupIndex: number, previousSection?: string) => {
    const { section, sectionDisplay, title, questions } = group;
    const sectionRoman = toRomanNumeral(groupIndex + 1);

    // Show section header if section changed and it's English subject
    const showSectionHeader = isEnglishSubject && sectionDisplay && section !== previousSection;

    // Calculate marks breakdown
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

    // Determine rendering logic based on title

    // Case: Picture Questions
    const pictureTitles = [
      "describe the following picture",
      "look at the pictures and answer the following",
      "identify the pictures",
      "identity the pictures"
    ];
    const cleanLowerTitle = title.trim().toLowerCase().replace(/\.$/, '');

    if (pictureTitles.some(t => cleanLowerTitle === t || cleanLowerTitle.startsWith(t))) {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>
          {questions.map((q, idx) => (
            <div key={idx} className="mb-4 ml-5">
              {/* 1. Main Number (No Text) & Marks */}
              <div className="flex justify-between items-start text-lg text-black font-local2 mb-2">
                <div className="flex-1 pr-4">
                  <span className="mr-2">{getRomanSubIndex(idx)})</span>
                </div>
                <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                  {showIndividualMarks && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                </div>
              </div>

              {/* 2. Image */}
              {q.imageUrl && (
                <div className="mb-3 ml-6">
                  <img
                    src={q.imageUrl}
                    alt="Question"
                    className="max-w-full h-auto max-h-[200px] object-contain border border-gray-200 rounded"
                  />
                </div>
              )}

              {/* 3. Sub-questions a, b, c */}
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : []).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 ml-6 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{String.fromCharCode(97 + subIdx)})</span>
                    <span>{renderMath(subQ.text || '', isMathSubject)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Case 1: "Choose the correct answer from the brackets and fill in the blanks"
    if (title.trim() === "Choose the correct answer from the brackets and fill in the blanks") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>
          {questions.map((q, idx) => (
            <div key={idx} className="mb-4 ml-5">
              {/* Always Render Question Text if present */}
              {q.question && <div className="text-lg text-black font-local2 mb-2 hidden">{q.question}</div>}
              {/* Note: In sample API, q.question might be duplicate of first subquestion or main text. Subquestions are primary if present. */}

              {/* Subquestions */}
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{getRomanSubIndex(idx)})</span>
                    <span>{renderMath(subQ.text || q.question, isMathSubject)}</span>
                    {q.options && q.options.length > 0 && (
                      <span className="ml-4 font-semibold">
                        ({q.options.map((opt: string, i: number) => (
                          <span key={i}>
                            {renderMath(opt, isMathSubject)}
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

    // Case 2: "Tick the correct answers"
    if (title.trim() === "Tick the correct answers") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>
          {questions.map((q, idx) => (
            <div key={idx} className="mb-4 ml-5">
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{getRomanSubIndex(idx)})</span>
                    <span>{renderMath(subQ.text || q.question, isMathSubject)}</span>

                    {/* Options with Checkboxes - Block below question */}
                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 ml-4">
                        {q.options.map((opt: string, optIdx: number) => (
                          <span key={optIdx} className="inline-flex items-center gap-2 mr-6">
                            <span className="font-semibold">{String.fromCharCode(97 + optIdx)}.</span>
                            <span className="text-2xl leading-none">☐</span>
                            <span>{renderMath(opt, isMathSubject)}</span>
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
      )
    }

    // Case 3: "Choose the correct answers"
    if (title.trim() === "Choose the correct answers") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>

          {questions.map((q, idx) => (
            <div key={idx} className="mb-6 ml-5">
              {/* Options at top */}
              <div className="mb-3 font-local2 text-black flex justify-between items-start">
                <div className="flex-1">
                  <span className="mr-2 font-semibold text-lg">{getRomanSubIndex(idx)})</span>
                  <div className="inline-block p-3 bg-gray-50 border border-gray-200 rounded">
                    <span className="font-semibold">
                      ({q.options && q.options.map((opt: string, i: number) => (
                        <span key={i}>
                          {renderMath(opt, isMathSubject)}
                          {i < (q.options?.length || 0) - 1 ? ', ' : ''}
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

              {/* Subquestions */}
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2 ml-2 flex justify-between items-start">
                  <div className="flex-1 text-lg text-black font-local2 pr-4">
                    <span className="mr-2">{String.fromCharCode(97 + subIdx)})</span>
                    <span>{renderMath(subQ.text || q.question, isMathSubject)}</span>
                  </div>
                  {/* Marks removed from here for this specific question type */}
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    }

    // Case 4: "Tick the odd one in the following"
    if (title.trim() === "Tick the odd one in the following") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>
          {questions.map((q, idx) => (
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
                            <span>{renderMath(opt, isMathSubject)}</span>
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

    // Case 5: "Match the following"
    if (title.trim() === "Match the following") {
      return (
        <div key={`${section || ''}-${title}`} className="mb-6">
          {showSectionHeader && (
            <div className="text-center mb-4 mt-4">
              <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
            </div>
          )}
          <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>
          {questions.map((q, idx) => (
            <div key={idx} className="mb-4 ml-5">
              {(q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }]).map((subQ: any, subIdx: number) => (
                <div key={subIdx} className="mb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 text-lg text-black font-local2 pr-4">
                      <span className="mr-2">{getRomanSubIndex(idx)})</span>
                      <span>{renderMath(subQ.text || q.question, isMathSubject)}</span>
                    </div>
                    <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                      {showIndividualMarks && subIdx === 0 && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
                    </div>
                  </div>
                  {/* Render Image */}
                  {q.imageUrl && (
                    <div className="mt-2 ml-6">
                      <img src={q.imageUrl} alt="Match" className="max-w-full h-auto max-h-[200px] object-contain border border-gray-200 rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Default Fallback Rendering
    return (
      <div key={`${section || ''}-${title}`} className="mb-6">
        {showSectionHeader && (
          <div className="text-center mb-4 mt-4">
            <h2 className="text-xl font-bold text-black font-local2 underline">{sectionDisplay}</h2>
          </div>
        )}
        <h3 className="text-lg font-semibold text-black mb-2 font-local2">{sectionRoman}. {title} <span className="float-right">{markBreakdown}</span></h3>
        {questions.map((q, idx) => (
          <div key={idx} className="mb-4 ml-8">
            <div className="flex justify-between items-start text-lg text-black font-local2">
              <div className="flex-1 pr-4">
                <span className="mr-2">{getRomanSubIndex(idx)})</span>
                <span>{renderMath(q.question, isMathSubject)}</span>
              </div>
              <div className="font-bold whitespace-nowrap ml-4 text-black text-lg">
                {showIndividualMarks && (q.mark || q.marks) ? `[${formatMarks(q.mark || q.marks)}]` : null}
              </div>
            </div>
            {q.options && (
              <div className="ml-6 mt-1 text-sm text-gray-700">
                {q.options.map((opt: string, i: number) => <div key={i}>{String.fromCharCode(65 + i)}. {renderMath(opt, isMathSubject)}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Word Download Logic Updates
  const handleDownloadWord = async () => {
    try {
      setWordLoading(true);
      const paperTitle = `${paper.examinationType || paper.examType || 'Examination'} Examination - 2025-26`.toUpperCase();

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: 'Times New Roman', size: 24, color: '000000' },
              paragraph: { spacing: { after: 120 } }
            },
            heading1: {
              run: { font: 'Times New Roman', size: 28, bold: true },
              paragraph: { spacing: { after: 200 } }
            },
            heading2: {
              run: { font: 'Times New Roman', size: 24, bold: true },
              // No extra space before heading so it sits right under the border line
              paragraph: { spacing: { before: 0, after: 80 } }
            }
          }
        },
        sections: []
      });

      const docChildren: any[] = [];

      // Top-right code box (school code) in Word document (above NAME / ROLL NO)
      const codeText = schoolCode.toString();
      const codeCellBorders = {
        top: { style: BorderStyle.SINGLE, color: '000000', size: 12 },
        bottom: { style: BorderStyle.SINGLE, color: '000000', size: 12 },
        left: { style: BorderStyle.SINGLE, color: '000000', size: 12 },
        right: { style: BorderStyle.SINGLE, color: '000000', size: 12 }
      };
      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
                    bottom: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
                    left: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
                    right: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 }
                  },
                  width: { size: 85, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ text: '', spacing: { before: 0, after: 0 } })]
                }),
                new TableCell({
                  borders: codeCellBorders,
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: codeText, bold: true })]
                    })
                  ]
                })
              ]
            })
          ]
        })
      );

      // Header (NAME / ROLL NO) just below the code box with a bit of extra gap
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "NAME: .............................................................................................", bold: true }),
            new TextRun({ text: " ROLL NO: .....................", bold: true })
          ],
          spacing: { before: 160, after: 200 }
        })
      );

      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: paperTitle, bold: true, size: 32, })]
        })
      );
      docChildren.push(createHeaderTable(stdLabel || '-', subjectDisplayUpper || '-', currentSumMarks, formatDuration(paper.duration || 60)));
      // Bottom border directly under HM / Time with no extra vertical gap
      docChildren.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, color: '000000', size: 12, space: 1 },
          },
          spacing: {
            before: 0,
            after: 0,
          },
          children: [new TextRun({ text: '' })],
        })
      );


      // Content Logic grouped by Title
      for (let i = 0; i < groupedQuestions.length; i++) {
        const group = groupedQuestions[i];
        const { section, sectionDisplay, title, questions } = group;
        const sectionRoman = toRomanNumeral(i + 1);

        // Show section header if section changed and it's English subject
        const previousSection = i > 0 ? groupedQuestions[i - 1].section : undefined;
        const showSectionHeader = isEnglishSubject && sectionDisplay && section !== previousSection;

        // Add section header for Word document
        if (showSectionHeader) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
              children: [
                new TextRun({ text: sectionDisplay, bold: true, size: 28, underline: {} })
              ]
            })
          );
        }

        // Calculate marks breakdown for Word
        let markBreakdown = "";
        if (questions.length > 0) {
          const firstMark = questions[0].mark || questions[0].marks || 0;
          const allSame = questions.every((q: any) => (q.mark || q.marks || 0) === firstMark);
          if (allSame && firstMark > 0) {
            const totalMarks = firstMark * questions.length;
            markBreakdown = `\t[${formatMarksForWord(firstMark)} x ${questions.length} = ${formatMarksForWord(totalMarks)}]`;
          }
        }
        const showIndividualMarksWord = !markBreakdown;

        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING2,
            children: [
              new TextRun({ text: `${sectionRoman}. ${title}`, bold: true }),
              new TextRun({ text: markBreakdown, bold: true }) // Tab is handled by \t in string if supported or we might need a tab stop
            ],
            tabStops: [
              { type: TabStopType.RIGHT, position: 9500 }
            ]
          })
        );

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const subQuestions = q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : [{ text: q.question }];
          const options = q.options || [];

          // Logic for Picture Questions
          const pictureTitles = [
            "describe the following picture",
            "look at the pictures and answer the following",
            "identify the pictures",
            "identity the pictures" // Handle potential typo from data
          ];

          // Check if title matches any of the picture titles (ignoring case and trailing dots)
          const cleanLowerTitle = title.trim().toLowerCase().replace(/\.$/, '');
          if (pictureTitles.some(t => cleanLowerTitle === t || cleanLowerTitle.startsWith(t))) {
            // 1. Render Main Question Line: i) Question Text [Marks]
            const prefix = `${getRomanSubIndex(i)})`;
            const marks = (showIndividualMarksWord && (q.mark || q.marks)) ? ` [${formatMarksForWord(q.mark || q.marks)}]` : '';

            docChildren.push(new Paragraph({
              tabStops: [
                { type: TabStopType.RIGHT, position: 9500 }
              ],
              children: [
                new TextRun({ text: `${prefix}` }),
                new TextRun({ text: `\t${marks}`, bold: true })
              ],
              spacing: { after: 100 },
              indent: { left: 250 }
            }));

            // 2. Render Image
            if (q.imageUrl) {
              try {
                const imageBuffer = await fetchImageArrayBuffer(resolveImageUrl(q.imageUrl)) || await convertImageToArrayBufferViaCanvas(resolveImageUrl(q.imageUrl));
                if (imageBuffer) {
                  docChildren.push(new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageBuffer,
                        transformation: {
                          width: 300,
                          height: 200,
                        },
                      }),
                    ],
                    indent: { left: 500 },
                    spacing: { after: 200 }
                  }));
                }
              } catch (err) {
                console.warn("Failed to add image to word doc", err);
              }
            }

            // 3. Render Sub-questions: a) Text
            subQuestions.forEach((subQ: any, subIdx: number) => {
              const subPrefix = `${String.fromCharCode(97 + subIdx)})`; // a), b), c)

              const runChildren: any[] = [];
              runChildren.push(new TextRun({ text: `${subPrefix} ` }));

              const content = subQ.text || '';
              const mixedRuns = renderMixedTextForWord(content, isMathSubject);
              runChildren.push(...mixedRuns);

              docChildren.push(new Paragraph({
                children: runChildren,
                indent: { left: 500 }, // Indent sub-questions
                spacing: { after: 100 }
              }));
            });

            continue; // Skip default rendering
          }

          // Logic for "Tick the odd one in the following"
          if (title.trim() === "Tick the odd one in the following") {
            subQuestions.forEach((subQ: any, subIdx: number) => {
              const prefix = `${getRomanSubIndex(i)})`;
              const marks = (showIndividualMarksWord && subIdx === 0 && (q.mark || q.marks)) ? ` [${formatMarksForWord(q.mark || q.marks)}]` : '';

              const runChildren: any[] = [];
              runChildren.push(new TextRun({ text: `${prefix} ` }));

              if (q.options && q.options.length > 0) {
                q.options.forEach((opt: string, optIdx: number) => {
                  runChildren.push(new TextRun({ text: `\u2610 ` })); // Checkbox
                  const mixedRuns = renderMixedTextForWord(opt, isMathSubject);
                  runChildren.push(...mixedRuns);

                  if (optIdx < q.options.length - 1) {
                    runChildren.push(new TextRun({ text: "    " }));
                  }
                });
              }

              runChildren.push(new TextRun({ text: `\t${marks}`, bold: true }));

              docChildren.push(new Paragraph({
                tabStops: [
                  { type: TabStopType.RIGHT, position: 9500 }
                ],
                children: runChildren,
                spacing: { after: 100 },
                indent: { left: 250 }
              }));
            });
            continue; // Skip the default addition
          }

          if (title.trim() === "Choose the correct answers") {
            // Logic: i) Options block
            const optionsChildren: any[] = [];
            optionsChildren.push(new TextRun({ text: `${getRomanSubIndex(i)}) (` }));

            options.forEach((opt: string, optIdx: number) => {
              const mixedRuns = renderMixedTextForWord(opt, isMathSubject);
              optionsChildren.push(...mixedRuns);

              if (optIdx < options.length - 1) {
                optionsChildren.push(new TextRun({ text: ", " }));
              }
            });

            optionsChildren.push(new TextRun({ text: ")" }));

            // Add marks here for this specific type
            // NOTE: We take marks from the first subquestion or the question object itself if applicable
            // usually marks are distributed per subquestion but here the group might have a shared mark?
            // The logic below uses subIdx=0 check, so we should look at q.mark or q.marks
            // But wait, the loop below iterates subQuestions. q is the question container.
            // If marks are on 'q', we use them.
            const marks = (showIndividualMarksWord && (q.mark || q.marks)) ? ` [${q.mark || q.marks}]` : '';
            if (marks) {
              optionsChildren.push(new TextRun({ text: `\t${marks}`, bold: true }));
            }

            docChildren.push(new Paragraph({
              tabStops: [
                { type: TabStopType.RIGHT, position: 9500 }
              ],
              children: optionsChildren,
              spacing: { after: 100 },
              indent: { left: 250 }
            }));
          }

          subQuestions.forEach((subQ: any, subIdx: number) => {
            let prefix = "";
            const lowerTitle = title.trim().toLowerCase();

            const useMainIndexTitles = [
              "tick the correct answers",
              "choose the correct answer from the brackets and fill in the blanks",
              "give one word of the following",
              "name the following",
              "fill in the blanks with correct answers",
              "write true or false",
              "match the following",
              "letter writing",
              "essay writing",
              "paragraph writing",
              "long answer questions",
              "short answer questions",
              "define the following"
            ];

            if (useMainIndexTitles.includes(lowerTitle)) {
              // Logic: i), ii), iii) based on Question Index (i)
              prefix = `${getRomanSubIndex(i)})`;
            } else if (lowerTitle === "choose the correct answers") {
              // Logic: a), b), c) for subquestions
              prefix = `${String.fromCharCode(97 + subIdx)})`;
            } else {
              // Default: i), ii) based on subIndex
              prefix = `${getRomanSubIndex(subIdx)})`;
            }

            // EXCLUDE marks for "Choose the correct answers" from the sub-question line as they are now in options
            const shouldShowMarksHere = lowerTitle !== "choose the correct answers";
            const marks = (shouldShowMarksHere && showIndividualMarksWord && subIdx === 0 && (q.mark || q.marks)) ? ` [${q.mark || q.marks}]` : '';

            const paragraphChildren: any[] = [];

            // Add prefix
            paragraphChildren.push(new TextRun({ text: prefix + " " }));

            const content = subQ.text || q.question || '';
            const contentRuns = renderMixedTextForWord(content, isMathSubject);
            paragraphChildren.push(...contentRuns);

            // Handle "Choose the correct answer from the brackets and fill in the blanks" options inline
            if (title.trim() === "Choose the correct answer from the brackets and fill in the blanks" && options && options.length > 0) {
              paragraphChildren.push(new TextRun({ text: " (" }));
              options.forEach((opt: string, optIdx: number) => {
                const mixedRuns = renderMixedTextForWord(opt, isMathSubject);
                paragraphChildren.push(...mixedRuns);
                if (optIdx < options.length - 1) {
                  paragraphChildren.push(new TextRun({ text: ", " }));
                }
              });
              paragraphChildren.push(new TextRun({ text: ")" }));
            }

            // Marks stay as normal text on the right.
            paragraphChildren.push(new TextRun({ text: `\t${marks}`, bold: true }));

            docChildren.push(new Paragraph({
              tabStops: [
                { type: TabStopType.RIGHT, position: 9500 }
              ],
              children: paragraphChildren,
              spacing: { after: title.trim() === "Tick the correct answers" ? 50 : 100 },
              indent: { left: title.trim() === "Choose the correct answers" ? 500 : 250 }
            }));

            if (title.trim() === "Tick the correct answers") {
              const optionChildren: any[] = [];
              options.forEach((opt: string, i: number) => {
                optionChildren.push(new TextRun({ text: `${String.fromCharCode(97 + i)}. \u2610 ` }));
                const mixedRuns = renderMixedTextForWord(opt, isMathSubject);
                optionChildren.push(...mixedRuns);

                if (i < options.length - 1) {
                  optionChildren.push(new TextRun({ text: "    " }));
                }
              });

              docChildren.push(new Paragraph({
                children: optionChildren,
                spacing: { after: 150 },
                indent: { left: 500 }
              }));
            }
          });

          // Add Image if exists
          if (q.imageUrl) {
            try {
              const imageBuffer = await fetchImageArrayBuffer(resolveImageUrl(q.imageUrl)) || await convertImageToArrayBufferViaCanvas(resolveImageUrl(q.imageUrl));
              if (imageBuffer) {
                docChildren.push(new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: {
                        width: 300,
                        height: 200,
                      },
                    }),
                  ],
                  indent: { left: 500 },
                  spacing: { after: 200 }
                }));
              }
            } catch (err) {
              console.warn("Failed to add image to word doc", err);
            }
          }



        }
      }

      doc.addSection({ children: docChildren });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${paper.title || 'paper'}.docx`);
      message.success("Word document downloaded successfully.");

    } catch (e) {
      console.error(e);
      message.error("Failed to download Word.");
    } finally {
      setWordLoading(false);
    }
  }


  const resolveImageUrl = (url?: string) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;
    if (trimmed.startsWith("/")) return `${window.location.origin}${trimmed}`;
    return `${window.location.origin}/${trimmed.replace(/^\/+/, "")}`;
  };

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

  const createHeaderTable = (stdValue: string, subjectValue: string, marksValue: number, durationValue: string) => {
    const cellBorders = {
      top: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
      bottom: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
      left: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
      right: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 }
    };
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: { left: 0, right: 0 },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: `Std: ${stdValue || '-'}`, bold: true, font: 'Times New Roman', size: 24 })],
                spacing: { before: 0, after: 0 }
              })]
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: subjectValue || '', bold: true, font: 'Times New Roman', size: 24 })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 }
              })]
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: `Marks: ${marksValue}`, bold: true, font: 'Times New Roman', size: 24 })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0 }
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [new Paragraph({
                children: [new TextRun({ text: 'HM', bold: true, font: 'Times New Roman', size: 24 })],
                spacing: { before: 0, after: 0 },
                lineSpacing: { line: 0, lineRule: "auto" }
              })]
            }),
            new TableCell({
              borders: cellBorders,
              children: [new Paragraph({
                text: '',
                spacing: { before: 0, after: 0 },
                lineSpacing: { line: 0, lineRule: "auto" }
              })]
            }),
            new TableCell({
              borders: cellBorders,
              children: [new Paragraph({
                children: [new TextRun({ text: `Time: ${durationValue}`, bold: true, font: 'Times New Roman', size: 24 })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0 },
                lineSpacing: { line: 0, lineRule: "auto" }
              })]
            })
          ]
        })
      ]
    });
  };

  const handlePrintQuestionPaper = () => {
    window.print();
  };


  return (
    <div className="p-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={onBack} className="flex items-center justify-center">
          <ArrowLeft size={18} />
        </Button>
        <Title level={4} className="!mb-0 text-gray-700 font-local2">
          {paper.title}
        </Title>
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <Card className="shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center">
            {/* <Button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 print:hidden"
            >
              <Printer size={16} />
              Print
            </Button> */}

            <div className="flex gap-3">
              <Button
                onClick={handleDownloadWord}
                className="flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 print:hidden"
                loading={wordLoading}
              >
                <Download size={16} />
                Download Word
              </Button>


            </div>
            <div>
              <Popconfirm
                title="Are you sure you want to delete this paper?"
                onConfirm={() => onDelete && onDelete(paper.id || paper._id)}
                okText="Yes, Delete"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="link"
                  icon={<MdDeleteOutline size={23} color="red" />}
                  size="small"
                  title="Delete"
                  className="print:hidden"
                />
              </Popconfirm>
            </div>
          </div>
        </Card>
      </div>

      {/* Question Paper Preview */}
      <Card className="shadow-sm print:shadow-none" id="print-area">
        <div className="max-w-4xl mx-auto relative" style={{ fontFamily: 'Times, serif' }}>
          {/* Top-right code box (school code) above NAME / ROLL NO */}
          <div className="flex justify-end mb-2">
            <div className="border border-black px-3 min-h-10 inline-flex items-center justify-center text-sm font-local2 font-semibold">
              {schoolCode}
            </div>
          </div>

          {/* Header Section */}
          <div className="mb-4 text-lg font-local2 text-black">
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-end flex-1 min-w-0">
                <span className="font-semibold whitespace-nowrap">NAME:</span>
                <span className="text-[20px] leading-none tracking-wider ml-1 overflow-hidden border-b border-dotted border-black flex-1"></span>
              </div>
              <div className="flex items-end flex-shrink-0 w-[200px] max-w-[200px]">
                <span className="font-semibold whitespace-nowrap">ROLL NO:</span>
                <span className="text-[20px] leading-none tracking-wider ml-1 overflow-hidden border-b border-dotted border-black flex-1"></span>
              </div>
            </div>
          </div>

          <div className="text-center mb-3">
            <h1 className="text-2xl font-bold uppercase font-local2">
              {paper.examinationType || paper.examType || 'Examination'} EXAMINATION - 2025-26
            </h1>
          </div>

          <div className="flex flex-col gap-1 mb-5 text-base font-local2 text-black">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="font-semibold text-lg text-left whitespace-nowrap sm:flex-[0_0_140px]">
                Std: {stdLabel || '-'}
              </div>
              <div className="flex-1 text-center font-semibold text-lg sm:px-2">
                {subjectDisplayUpper || ''}
              </div>
              <div className="font-semibold text-lg text-right whitespace-nowrap sm:flex-[0_0_140px]">
                Marks: {currentSumMarks}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-base font-local2 normal-case mb-2">
              <div className="text-left whitespace-nowrap sm:flex-[0_0_140px] font-semibold text-lg">HM</div>
              <div className="flex-1" />
              <div className="text-right whitespace-nowrap sm:flex-[0_0_140px] font-semibold text-lg">
                Time: {formatDuration(paper.duration || 60)}
              </div>
            </div>
            <div className="flex-1 border-b border-gray-400" />
          </div>


          {/* Questions Grouped by Title */}
          <div className="space-y-6">
            {groupedQuestions.length > 0 ? (
              groupedQuestions.map((group, index) => {
                const previousSection = index > 0 ? groupedQuestions[index - 1].section : undefined;
                return renderQuestionSection(group, index, previousSection);
              })
            ) : (
              <div className="text-center text-gray-500">No questions found.</div>
            )}
          </div>

        </div>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #print-area, #print-area * {
                visibility: visible;
            }
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none;
            }
            .print\\:hidden { // Escaping colon for JS string
                display: none !important;
            }
        }
      `}</style>
    </div>
  );
};

const MyPapers = () => {
  const [selectedSubject, setSelectedSubject] = useState(undefined);
  const [selectedClass, setSelectedClass] = useState(undefined);
  const [selectedBook, setSelectedBook] = useState(undefined);
  const [selectedBookName, setSelectedBookName] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState(undefined);
  const [viewingPaper, setViewingPaper] = useState(null);

  // Exam type options
  const examTypes = [
    { label: 'UNIT TEST', value: 'UNIT TEST' },
    { label: 'FIRST MID TERM', value: 'FIRST MID TERM' },
    { label: 'FIRST TERM', value: 'FIRST TERM' },
    { label: 'SECOND MID TERM', value: 'SECOND MID TERM' },
    { label: 'SECOND TERM', value: 'SECOND TERM' },
    { label: 'THIRD MID TERM', value: 'THIRD MID TERM' },
    { label: 'THIRD TERM', value: 'THIRD TERM' }
  ];
  const examTypeOptions = examTypes;
  const [loading, setLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
  const [booksOptions, setBooksOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [booksLoading, setBooksLoading] = useState<boolean>(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [papersLoading, setPapersLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPapers, setTotalPapers] = useState<number>(0);

  const navigate = useNavigate();

  // Get user from Redux
  const user = useSelector((state: any) => state.user.user);

  // Fetch subjects from API with loading state
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

  // Fetch books based on class and subject (same logic as Paper creation page)
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
          label: book.name || book.title || book.book
        }))
        : Array.isArray(data?.books)
          ? data.books.map((book: any) => ({
            value: book.id || book._id || book.name || book.title,
            label: book.name || book.title || book.book
          }))
          : Array.isArray(data)
            ? data.map((book: any) => ({
              value: book.id || book._id || book.name || book.title,
              label: book.name || book.title || book.book
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

  // Use papers directly from API (filtering is done server-side)
  const filteredPapers = papers;

  const handleView = (paper: any) => {
    setViewingPaper(paper);
  };

  const handleBackToList = () => {
    setViewingPaper(null);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      await DELETE(`/examinations/${id}`);
      message.success('Successfully deleted');
      setViewingPaper(null);
      await fetchPapers();
      navigate('/mypapers');
    } catch (e) {
      console.error('Failed to delete paper:', e);
      message.error('Failed to delete paper');
    } finally {
      setLoading(false);
    }
  };

  // Fetch papers from API
  const fetchPapers = async () => {
    if (!user?.id) {
      console.log("User ID not available");
      return;
    }

    try {
      setPapersLoading(true);

      // Build query parameters for filters
      const query: any = {};

      // Add pagination parameters
      query.page = currentPage;
      query.pageSize = pageSize;

      // Add filter parameters if they are selected
      if (selectedClass) {
        query.class = selectedClass;
      }
      if (selectedSubject) {
        query.subject = selectedSubject;
      }
      if (selectedBookName) {
        query.book = selectedBookName;
      }
      if (selectedExamType) {
        query.examinationType = selectedExamType;
      }

      // Use school ID in the URL path
      const data = await GET(`/examinations/school/${user.id}`, query);

      // Handle API response format - examinations array
      const papersList = Array.isArray(data?.examinations)
        ? data.examinations
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

      setPapers(papersList);
      setTotalPapers(data?.total || 0);
    } catch (e) {
      console.error('Failed to fetch papers:', e);
      setPapers([]);
      message.error('Failed to load papers');
    } finally {
      setPapersLoading(false);
    }
  };

  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch papers when component mounts and user is available
  useEffect(() => {
    if (user?.id) {
      fetchPapers();
    }
  }, [user?.id]);

  // Watch for class and subject changes to fetch books
  useEffect(() => {
    if (selectedClass && selectedSubject && user?.id) {
      fetchBooks(selectedClass, selectedSubject);
    } else {
      setBooksOptions([]);
      // Clear book when class or subject is cleared
      if (!selectedClass || !selectedSubject) {
        setSelectedBook(undefined);
        setSelectedBookName('');
      }
    }
  }, [selectedClass, selectedSubject, user?.id]);

  // Refetch papers when filters or pagination change
  useEffect(() => {
    if (user?.id) {
      fetchPapers();
    }
  }, [selectedClass, selectedSubject, selectedBookName, selectedExamType, currentPage, pageSize, user?.id]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSubject, selectedBookName, selectedExamType]);

  // If viewing a paper, show the view component
  if (viewingPaper) {
    return <ViewQuestionPaper paper={viewingPaper} onBack={handleBackToList} onDelete={handleDelete} />;
  }
  const users = [
    { id: "1", name: "Batch A" },
    { id: "2", name: "Batch B" },
    { id: "3", name: "Batch C" },
    { id: "4", name: "Batch D" },
    { id: "5", name: "Batch E" },
  ];

  return (
    <div className="p-6 h-min">
      {/* Heading */}
      <div className="mb-6">
        <Title level={4} className="!mb-0 text-gray-700 font-local2">
          My Papers
        </Title>
      </div>

      {/* Filters Card */}
      <div className="w-full mb-5">
        <Card className="shadow-sm bg-white w-full">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedClass}
                allowClear
                onChange={setSelectedClass}
                className="w-[150px] font-local2"
                showSearch
                placeholder="Filter by Class"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={classOptions}
              />
            </div>
            {/* Subject Filter */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedSubject}
                allowClear
                onChange={setSelectedSubject}
                className="w-[200px] font-local2"
                showSearch
                placeholder="Filter by Subject"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={subjects}
                loading={subjectsLoading}
              />
            </div>

            {/* Book Filter */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedBook}
                allowClear
                onChange={(value) => {
                  setSelectedBook(value);
                  // Find the book name from the options
                  const bookOption = booksOptions.find(option => option.value === value);
                  setSelectedBookName(bookOption ? bookOption.label : '');
                }}
                className="w-[250px] font-local2"
                showSearch
                placeholder="Filter by Book"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={booksOptions}
                loading={booksLoading}
                disabled={!selectedClass || !selectedSubject}
              />
            </div>

            {/* Exam Type Filter */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedExamType}
                allowClear
                onChange={setSelectedExamType}
                className="w-[200px] font-local2"
                showSearch
                placeholder="Filter by Exam Type"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={examTypeOptions}
              />
            </div>
          </div>
        </Card>
        <Modal
          title={<span className="font-local2">Share Test Link / Assign Test</span>}
          open={isShareModalOpen}
          onCancel={() => setIsShareModalOpen(false)}
          footer={null}
        >
          {/* User boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() =>
                  setSelectedUsers((prev) =>
                    prev.includes(user.id)
                      ? prev.filter((u) => u !== user.id)
                      : [...prev, user.id]
                  )
                }
                className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center transition ${selectedUsers.includes(user.id)
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200"
                  }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <User size={20} className="text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 font-local2">{user.name}</span>
              </div>
            ))}
          </div>

          {/* Submit button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="primary"
              className="bg-gradient-to-r from-[#007575] to-[#339999] text-white font-local2"
              onClick={() => {
                if (selectedUsers.length === 0) {
                  message.warning("Please select at least one batch!");
                  return;
                }
                message.success("Test link shared successfully!");
                setIsShareModalOpen(false);
                setSelectedUsers([]);
              }}
            >
              Submit
            </Button>
          </div>
        </Modal>

      </div>

      {/* Create Test Paper Button */}
      <div className="w-full mb-5">
        <Button
          type="primary"
          size="middle"
          className="bg-gradient-to-r from-[#007575] to-[#339999] text-white border-0 font-local2
             hover:!bg-gradient-to-r hover:!from-[#007575] hover:!to-[#339999] hover:!text-white transition-transform duration-200 "

          onClick={() => navigate("/paper")}
        >
          Create Test Paper
        </Button>
      </div>

      {/* Papers Grid */}
      <div className="w-full">
        {papersLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007575] mx-auto mb-4"></div>
              <p className="text-gray-600 font-local2">Loading papers...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredPapers.map((paper) => (
              <div
                key={paper.id || paper._id}
                className="bg-white border border-gray-200  shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => handleView(paper)}
              >
                {/* Triangle Corner Decoration */}
                <div className="absolute top-0 left-0 w-0 h-0 border-t-[40px] border-r-[40px] border-t-teal-600 border-r-transparent z-10"></div>

                {/* PDF-like Box Design */}
                <div className="aspect-[3/4] flex flex-col">
                  {/* Main Content Area with PDF Image - Reduced Height */}
                  <div className="flex-1 relative bg-gray-50" style={{ height: '75%' }}>
                    {/* PDF Preview Image */}
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={paperDummy}
                        alt="Paper Preview"
                        className="w-full h-full object-contain rounded"
                      />
                    </div>

                    {/* Hover Overlay with View Icon */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white rounded-full p-3 shadow-lg">
                          <Eye size={24} className="text-[#007575]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Class-Subject-ExaminationType */}
                  <div className="p-3 bg-gradient-to-r from-[#007575] to-[#339999]" style={{ height: '17%' }}>
                    <div className="text-center flex items-center justify-center h-full">
                      <h3 className="font-local2 font-semibold text-white text-sm">
                        {paper.class || 'N/A'} - {paper.subject || 'subject'} - {paper.examinationType || 'exam'}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!papersLoading && filteredPapers.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-local2 text-gray-600 mb-2">No Papers Found</h3>
            <p className="text-gray-500 font-local2">
              {papers.length === 0
                ? "Create your first question paper to get started."
                : "No papers match your current filters."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!papersLoading && filteredPapers.length > 0 && (
          <div className="flex justify-center mt-8">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalPapers}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              onShowSizeChange={(current, size) => {
                setCurrentPage(1);
                setPageSize(size);
              }}
              showSizeChanger
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} papers`}
              pageSizeOptions={['5', '10', '20', '50', '100']}
              className="font-local2"
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default MyPapers;