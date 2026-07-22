import { useRef, useCallback, useState } from 'react';

const FONT_SIZES = [
  { value: '3', label: '보통', size: '16px' },
  { value: '1', label: '작게', size: '10px' },
  { value: '2', label: '조금 작게', size: '13px' },
  { value: '4', label: '크게', size: '18px' },
  { value: '5', label: '조금 더 크게', size: '24px' },
  { value: '6', label: '더 크게', size: '32px' },
  { value: '7', label: '가장 크게', size: '48px' },
];

export default function RichEditor({ value, onChange, placeholder, className = '' }) {
  const editorRef = useRef(null);
  const colorRef = useRef(null);
  const [selFontSize, setSelFontSize] = useState('3');

  const exec = useCallback((cmd, arg) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    onChange(html === '<br>' ? '' : html);
  }, [onChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleFontSize = useCallback((e) => {
    const v = e.target.value;
    setSelFontSize(v);
    exec('fontSize', v);
  }, [exec]);

  const handleColor = useCallback((e) => {
    exec('foreColor', e.target.value);
  }, [exec]);

  return (
    <div className={`border border-outline-variant rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-outline-variant flex-wrap">
        <select
          value={selFontSize}
          onChange={handleFontSize}
          className="h-8 px-1.5 text-xs border border-gray-300 rounded bg-white"
        >
          {FONT_SIZES.map(fs => (
            <option key={fs.value} value={fs.value}>{fs.label} ({fs.size})</option>
          ))}
        </select>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button" title="굵게" onClick={() => exec('bold')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
        ><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
        <button
          type="button" title="기울임" onClick={() => exec('italic')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
        ><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
        <button
          type="button" title="밑줄" onClick={() => exec('underline')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
        ><span className="material-symbols-outlined text-[18px]">format_underlined</span></button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button" title="글자색" onClick={() => colorRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 relative"
        ><span className="material-symbols-outlined text-[18px]">palette</span>
          <input ref={colorRef} type="color" onChange={handleColor} className="absolute inset-0 opacity-0 cursor-pointer" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button" title="번호 목록" onClick={() => exec('insertOrderedList')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
        ><span className="material-symbols-outlined text-[18px]">format_list_numbered</span></button>
        <button
          type="button" title="글머리 목록" onClick={() => exec('insertUnorderedList')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
        ><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="p-3 text-sm min-h-[150px] focus:outline-none"
        style={{ lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        onInput={handleInput}
        onPaste={handlePaste}
      />
    </div>
  );
}
