/**
 * Helper to open the Payroll Pro Instruction Manual PDF.
 * - On Electron Desktop: Calls native IPC to open via system default PDF viewer (Adobe Acrobat, Edge, Chrome, etc.)
 * - On Browser / Web: Opens the served PDF in a new browser tab
 */
export const openInstructionManualPdf = async (): Promise<void> => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openInstructionManual) {
      const res = await electronAPI.openInstructionManual();
      if (res?.success) return;
    }
  } catch (err) {
    console.warn('Native open error, falling back to browser tab:', err);
  }

  // Fallback to opening the PDF served from the public folder
  const manualUrl = `${window.location.origin}/Payroll_Pro_Instruction_Manual.pdf`;
  window.open(manualUrl, '_blank', 'noopener,noreferrer');
};
