// @ts-nocheck
// Utilities for converting LaTeX (from @karyum/react-math-keyboard) into
// MathML / OMML and docx-compatible math objects for Word export.
//
// IMPORTANT:
// We use KaTeX for LaTeX -> MathML because the installed `mathjax-full` package
// in this repo doesn't include the MathML output module (Vite can't resolve it).

import katex from 'katex';
import { mml2omml } from 'mathml2omml';
import { convertOmml2Math } from '@hungknguyen/docx-math-converter';

/**
 * Strip simple LaTeX delimiters like $...$, $$...$$, \(...\), \[...\]
 */
const stripDelimiters = (latex: string): string => {
  if (!latex) return '';
  let s = String(latex).trim();

  if (
    (s.startsWith('$$') && s.endsWith('$$')) ||
    (s.startsWith('\\[') && s.endsWith('\\]'))
  ) {
    return s.slice(2, -2).trim();
  }

  if (
    (s.startsWith('$') && s.endsWith('$')) ||
    (s.startsWith('\\(') && s.endsWith('\\)'))
  ) {
    return s.slice(1, -1).trim();
  }

  return s;
};

/**
 * LaTeX → MathML string (Presentation MathML).
 * Intended for export (Word), not for browser rendering.
 */
export const latexToMathML = (latex: string, display = true): string => {
  const clean = stripDelimiters(latex || '');
  if (!clean) return '';
  try {
    // KaTeX can output pure MathML via `output: "mathml"`.
    // This returns a MathML string (not HTML wrapper).
    return katex.renderToString(clean, {
      displayMode: !!display,
      throwOnError: false,
      output: 'mathml',
      strict: 'ignore',
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to convert LaTeX to MathML via KaTeX:', e);
    return '';
  }
};

/**
 * LaTeX → OMML string (Office Math Markup Language).
 * This is the raw XML fragment Word understands for equations.
 */
export const latexToOMML = (latex: string, display = true): string => {
  const mathml = latexToMathML(latex, display);
  if (!mathml) return '';
  const omml = mml2omml(mathml);
  return omml;
};

/**
 * LaTeX → docx Math object.
 * Use this in `docx` Paragraph children when building the .docx.
 */
export const latexToDocxMath = (latex: string, display = true) => {
  const omml = latexToOMML(latex, display);
  if (!omml) return null;

  try {
    return convertOmml2Math(omml);
  } catch (e) {
    // Fallback: return null so caller can use plain text instead.
    // eslint-disable-next-line no-console
    console.warn('Failed to convert OMML to docx Math:', e);
    return null;
  }
};

