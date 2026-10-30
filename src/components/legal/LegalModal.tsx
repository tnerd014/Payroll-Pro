import React, { useState, useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './legalContent';

export type LegalTab = 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeDoc = activeTab === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(`sec-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 sm:p-6 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl h-[88vh] max-h-[760px] bg-white dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Header */}
        <div className="no-print h-12 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#111113]">
          
          {/* Subtle Tabs */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`text-xs transition-colors cursor-pointer pb-0.5 border-b-2 font-medium ${
                activeTab === 'privacy'
                  ? 'text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-transparent'
              }`}
            >
              Privacy Policy
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`text-xs transition-colors cursor-pointer pb-0.5 border-b-2 font-medium ${
                activeTab === 'terms'
                  ? 'text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-transparent'
              }`}
            >
              Terms of Service
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrint}
              title="Print document"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Minimal Table of Contents (Desktop sidebar) */}
          <aside className="no-print hidden md:block w-56 border-r border-zinc-100 dark:border-zinc-800/60 p-5 overflow-y-auto shrink-0 select-none">
            <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-3">
              Contents
            </div>
            <nav className="space-y-1">
              {activeDoc.sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full text-left text-[12px] py-1 transition-colors cursor-pointer block truncate ${
                    activeSectionId === sec.id
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Document Body */}
          <main 
            ref={contentContainerRef}
            className="flex-1 p-6 sm:p-10 overflow-y-auto space-y-8 max-w-2xl mx-auto w-full scroll-smooth"
          >
            {/* Title & Metadata */}
            <div className="space-y-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {activeDoc.title}
              </h1>
              <p className="text-[12px] text-zinc-400">
                Last updated: {activeDoc.lastUpdated}
              </p>
            </div>

            {/* Intro */}
            <div className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <p>{activeDoc.introduction}</p>
            </div>

            {/* Document Sections */}
            <div className="space-y-8">
              {activeDoc.sections.map((sec) => (
                <section 
                  key={sec.id} 
                  id={`sec-${sec.id}`}
                  className="space-y-2.5 scroll-mt-6"
                >
                  <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {sec.title}
                  </h2>

                  <div className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-2">
                    {sec.content.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>

                  {sec.subsections && sec.subsections.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {sec.subsections.map((sub, sIdx) => (
                        <div key={sIdx} className="space-y-1">
                          <h3 className="text-[12px] font-medium text-zinc-800 dark:text-zinc-200">
                            {sub.title}
                          </h3>
                          <ul className="list-disc pl-4 space-y-1 text-[12px] text-zinc-600 dark:text-zinc-400 leading-relaxed marker:text-zinc-300 dark:marker:text-zinc-600">
                            {sub.points.map((pt, pIdx) => (
                              <li key={pIdx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* Quiet Footer */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <p>For inquiries or data protection requests, please reach out to your designated system administrator or contact legal@payrollpro.app.</p>
              <p>&copy; {new Date().getFullYear()} Payroll Pro. All rights reserved.</p>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};
