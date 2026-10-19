import XLSX from 'xlsx-js-style';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { 
  Employee, 
  CalculatedPayrollItem, 
  PayrollVariables, 
  PayeTaxVariables,
  PayrollSnapshot,
  CompanyProfile
} from '../types';
import { calculatePayrollItem, formatNaira, getEmployeeGrossForPeriod } from './payePensionEngine';
import { MONTHS } from '../store/usePayrollStore';

export type ExportScope = 'current-month' | 'full-year' | 'all-history';

export type ExportInformationScope = 
  | 'all' 
  | 'payroll-register' 
  | 'bank-schedule' 
  | 'statutory-remittance' 
  | 'staff-database';

export interface ExportOptions {
  scope?: ExportScope;
  includeFormulas?: boolean;
  selectedYear?: number;
  selectedMonth?: string;
  company?: CompanyProfile;
  employmentTypeFilter?: string; // 'ALL' | 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern / NYSC'
  departmentFilter?: string; // 'ALL' | specific department name
  informationScope?: ExportInformationScope;
}

const DEFAULT_COMPANY_FALLBACK: CompanyProfile = {
  name: 'Payroll Pro Enterprise',
  subtitle: 'Payroll & Remittance Management System',
  address: 'Commercial Avenue, Victoria Island, Lagos, Nigeria',
  phone: '+234 800 000 0000',
  email: 'finance@company.com',
};

// Executive Standard Accounting Format (Positive, Negative in Parens, Zero as Centered Dash)
const CURRENCY_FORMAT = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)';

// ==========================================
// EXECUTIVE FINANCIAL STYLING CONSTANTS & ENGINE
// ==========================================
const FONT_FAMILY = 'Calibri';
const COLOR_TITLE_DARK = '0F172A';   // Slate-900
const COLOR_HEADER_NAVY = '1E293B';  // Slate-800
const COLOR_HEADER_GROSS = '1E3A8A'; // Blue-900 (Gross & Allowances)
const COLOR_HEADER_DED = '334155';   // Slate-700 (Deductions & Statutory)
const COLOR_HEADER_NET = '065F46';   // Emerald-800 (Net Take-Home Pay)
const COLOR_WHITE = 'FFFFFF';
const COLOR_ZEBRA_ODD = 'F8FAFC';    // Slate-50 alternating zebra
const COLOR_TOTAL_BG = 'F1F5F9';     // Slate-100 total summary
const COLOR_SECTION_BG = 'E2E8F0';   // Slate-200 section banners
const COLOR_BORDER_LIGHT = 'CBD5E1'; // Slate-300 clean grid borders
const COLOR_BORDER_MED = '64748B';   // Slate-500 top total line

const BORDER_DATA = {
  top: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
  bottom: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
  left: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
  right: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
};

const BORDER_HEADER = {
  top: { style: 'medium', color: { rgb: COLOR_TITLE_DARK } },
  bottom: { style: 'medium', color: { rgb: COLOR_TITLE_DARK } },
  left: { style: 'thin', color: { rgb: '334155' } },
  right: { style: 'thin', color: { rgb: '334155' } },
};

const BORDER_TOTAL = {
  top: { style: 'thin', color: { rgb: COLOR_BORDER_MED } },
  bottom: { style: 'double', color: { rgb: COLOR_TITLE_DARK } },
  left: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
  right: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
};

/**
 * Transforms standard raw SheetJS worksheets into executive-grade,
 * professionally styled corporate financial spreadsheets with:
 * - Clean corporate letterhead banners (Company Name, Report Title, Metadata)
 * - Thematic color-coded table headers (Navy general, Blue gross, Charcoal deductions, Emerald Net Pay)
 * - Alternating zebra striping with light slate cell grid borders
 * - Accounting standard Total/Summary rows (thin top, double underline bottom)
 * - Number formatting, center alignment on identifiers/codes, and generous row heights.
 */
function styleWorksheetCorporate(ws: XLSX.WorkSheet): XLSX.WorkSheet {
  if (!ws || !ws['!ref']) return ws;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const maxRow = range.e.r;
  const maxCol = range.e.c;
  const rowHeights: { hpt: number }[] = [];

  const isBannerSheet = Boolean(
    ws['A1'] && ws['A2'] && !ws['B1'] &&
    (!ws['A4'] || String(ws['A4'].v || '').trim() === '')
  );

  // Apply title merges if banner sheet
  if (isBannerSheet && maxCol > 0) {
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: maxCol } });
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: maxCol } });
    ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: maxCol } });
  }

  const headerRows = new Set<number>();
  const sectionRows = new Set<number>();
  const totalRows = new Set<number>();

  for (let r = 0; r <= maxRow; r++) {
    const c0 = String(ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v || '').trim();
    const c1 = String(ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v || '').trim();
    const c2 = String(ws[XLSX.utils.encode_cell({ r, c: 2 })]?.v || '').trim();

    if (
      (!isBannerSheet && r === 0) ||
      (isBannerSheet && r === 4) ||
      c0 === 'S/N' ||
      c0 === 'Staff Code' ||
      c0 === 'Parameter Code' ||
      c0 === 'Metric Description' ||
      c0 === 'Department Name' ||
      c0 === 'Classification' ||
      c0 === 'Employee Code' ||
      c0 === 'Field / Column' ||
      c1 === 'Staff Code' ||
      c1 === 'Headcount' ||
      c1 === 'Required?'
    ) {
      headerRows.add(r);
    }

    if (
      isBannerSheet && r > 3 &&
      c0.length > 5 && c0 === c0.toUpperCase() &&
      !c1 && !c2 &&
      (c0.includes('PARAMETERS') || c0.includes('STATUTORY') || c0.includes('ALLOCATION') || c0.includes('BREAKDOWN') || c0.includes('INDICATORS'))
    ) {
      sectionRows.add(r);
      if (maxCol > 0) {
        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: maxCol } });
      }
    }

    for (let c = 0; c <= Math.min(4, maxCol); c++) {
      const val = String(ws[XLSX.utils.encode_cell({ r, c })]?.v || '').toUpperCase();
      if (val.includes('TOTAL') || val.includes('SUMMARY') || val.includes('DISBURSEMENT')) {
        totalRows.add(r);
        break;
      }
    }
  }

  // Find Net column index to give Net Take-Home numbers distinctive emerald emphasis
  let netColIdx = -1;
  const firstHeaderRow = Array.from(headerRows)[0];
  if (firstHeaderRow !== undefined) {
    for (let c = 0; c <= maxCol; c++) {
      const hText = String(ws[XLSX.utils.encode_cell({ r: firstHeaderRow, c })]?.v || '');
      if (hText.includes('Net') || hText.includes('Take-Home')) {
        netColIdx = c;
        break;
      }
    }
  }

  for (let r = 0; r <= maxRow; r++) {
    const isTitleRow1 = isBannerSheet && r === 0;
    const isTitleRow2 = isBannerSheet && r === 1;
    const isTitleRow3 = isBannerSheet && r === 2;
    const isBlankRow = isBannerSheet && r === 3;
    const isHeaderRow = headerRows.has(r);
    const isSectionBanner = sectionRows.has(r);
    const isTotalRow = totalRows.has(r);

    if (isTitleRow1) rowHeights[r] = { hpt: 26 };
    else if (isTitleRow2) rowHeights[r] = { hpt: 20 };
    else if (isTitleRow3) rowHeights[r] = { hpt: 18 };
    else if (isBlankRow) rowHeights[r] = { hpt: 10 };
    else if (isHeaderRow) rowHeights[r] = { hpt: 28 };
    else if (isSectionBanner) rowHeights[r] = { hpt: 24 };
    else if (isTotalRow) rowHeights[r] = { hpt: 24 };
    else rowHeights[r] = { hpt: 20 };

    for (let c = 0; c <= maxCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      let cell = ws[cellRef];
      if (!cell) {
        if (isHeaderRow || isTotalRow || (!isTitleRow1 && !isTitleRow2 && !isTitleRow3 && !isBlankRow)) {
          cell = { t: 's', v: '' };
          ws[cellRef] = cell;
        } else {
          continue;
        }
      }

      if (isTitleRow1) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 14, bold: true, color: { rgb: COLOR_TITLE_DARK } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { vertical: 'center', horizontal: 'left' }
        };
      } else if (isTitleRow2) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 11, bold: true, color: { rgb: COLOR_HEADER_NAVY } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { vertical: 'center', horizontal: 'left' }
        };
      } else if (isTitleRow3) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 9, color: { rgb: '64748B' } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { vertical: 'center', horizontal: 'left' }
        };
      } else if (isBlankRow) {
        // empty separator
      } else if (isSectionBanner) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: COLOR_TITLE_DARK } },
          fill: { fgColor: { rgb: COLOR_SECTION_BG } },
          border: BORDER_DATA,
          alignment: { vertical: 'center', horizontal: 'left' }
        };
      } else if (isHeaderRow) {
        const text = String(cell.v || '');
        let bg = COLOR_HEADER_NAVY;
        if (text.includes('Net') || text.includes('Take-Home')) bg = COLOR_HEADER_NET;
        else if (text.includes('Gross') || text.includes('Basic') || text.includes('Housing') || text.includes('Transport') || text.includes('Salary') || text.includes('Annual')) bg = COLOR_HEADER_GROSS;
        else if (text.includes('Tax') || text.includes('PAYE') || text.includes('Pension') || text.includes('Deduction')) bg = COLOR_HEADER_DED;

        cell.s = {
          font: { name: FONT_FAMILY, sz: 9.5, bold: true, color: { rgb: COLOR_WHITE } },
          fill: { fgColor: { rgb: bg } },
          border: BORDER_HEADER,
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
        };
      } else if (isTotalRow) {
        const isNum = cell.t === 'n' || Boolean(cell.f);
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: COLOR_TITLE_DARK } },
          fill: { fgColor: { rgb: COLOR_TOTAL_BG } },
          border: BORDER_TOTAL,
          alignment: { vertical: 'center', horizontal: isNum ? 'right' : 'left' }
        };
      } else {
        const isNum = cell.t === 'n' || Boolean(cell.f);
        const valStr = String(cell.v ?? '').trim();
        const isShortCenter = c === 0 || (valStr.length <= 15 && (valStr.startsWith('EMP-') || valStr === 'YES' || valStr === 'NO' || valStr === 'Active' || valStr === 'Inactive' || /^\d{10}$/.test(valStr)));
        const isNetCol = c === netColIdx;

        cell.s = {
          font: {
            name: FONT_FAMILY,
            sz: 9.5,
            color: { rgb: isNetCol && isNum ? '065F46' : '1E293B' },
            bold: isNetCol && isNum
          },
          fill: { fgColor: { rgb: r % 2 === 1 ? COLOR_ZEBRA_ODD : COLOR_WHITE } },
          border: BORDER_DATA,
          alignment: { vertical: 'center', horizontal: isNum ? 'right' : isShortCenter ? 'center' : 'left' }
        };
      }
    }
  }

  // Detect employee Full Name / Name column to freeze columns up to Full Name
  let nameColIdx = -1;
  if (firstHeaderRow !== undefined) {
    for (let c = 0; c <= maxCol; c++) {
      const hText = String(ws[XLSX.utils.encode_cell({ r: firstHeaderRow, c })]?.v || '').trim().toLowerCase();
      if (
        hText.includes('full name') || 
        hText.includes('account name') || 
        hText.includes('employee name') ||
        hText.includes('taxpayer name') ||
        hText === 'last name' ||
        hText === 'name'
      ) {
        nameColIdx = c;
        break;
      }
    }

    if (nameColIdx !== -1) {
      const xSplit = nameColIdx + 1; // Freeze columns up to and including Full Name (e.g. columns A, B, C)
      const ySplit = firstHeaderRow + 1; // Freeze rows up to and including table headers (e.g. rows 1 to 5)
      const topLeftCol = XLSX.utils.encode_col(xSplit);
      const topLeftRow = ySplit + 1;
      const topLeftCell = `${topLeftCol}${topLeftRow}`;

      (ws as any)['!freezePane'] = {
        xSplit,
        ySplit,
        topLeftCell,
      };
    }
  }

  ws['!rows'] = rowHeights;
  return ws;
}

/**
 * Builds an executive-grade, fully functional multi-tab Excel workbook
 * modeled on corporate audit standards with live formulas linking across sheets,
 * centralized statutory variables, executive dashboards, and dynamic subtotals.
 */
export function exportPayrollProToExcel(
  employees: Employee[],
  payrollItems: CalculatedPayrollItem[],
  payrollVars: PayrollVariables,
  payeVars: PayeTaxVariables,
  monthLabel: string,
  year: number,
  snapshot?: PayrollSnapshot | null,
  company: CompanyProfile = DEFAULT_COMPANY_FALLBACK,
  options: ExportOptions = { scope: 'current-month', includeFormulas: true }
) {
  const wb = XLSX.utils.book_new();
  const includeFormulas = options.includeFormulas ?? true;
  const scope = options.scope ?? 'current-month';
  const effectiveCompany = company || DEFAULT_COMPANY_FALLBACK;
  const infoScope = options.informationScope || 'all';

  // Apply employment type & department filters
  let filteredEmployees = employees;
  if (options.employmentTypeFilter && options.employmentTypeFilter !== 'ALL') {
    filteredEmployees = filteredEmployees.filter(
      e => (e.employmentType || 'Full-Time').toLowerCase() === options.employmentTypeFilter!.toLowerCase()
    );
  }
  if (options.departmentFilter && options.departmentFilter !== 'ALL') {
    filteredEmployees = filteredEmployees.filter(
      e => (e.department || '').toLowerCase() === options.departmentFilter!.toLowerCase()
    );
  }

  const allowedCodes = new Set(filteredEmployees.map(e => e.code.toLowerCase()));
  const filteredItems = payrollItems.filter(i => allowedCodes.has(i.employeeCode.toLowerCase()));

  // 1. VARIABLES TAB (Central Statutory Configuration Reference)
  // Must be created first or present so formula references ('Variables'!$C$6, etc.) are valid
  const wsVariables = createVariablesSheet(payrollVars, payeVars, effectiveCompany);

  // 2. MASTER PAYROLL REGISTER TAB
  const wsMaster = createMasterPayrollSheet(
    filteredEmployees,
    filteredItems,
    payrollVars,
    monthLabel,
    year,
    effectiveCompany,
    includeFormulas
  );

  // 3. EXECUTIVE SUMMARY TAB (C-Suite Dashboard with SUMIF/COUNTIF tables)
  const wsSummary = createExecutiveSummarySheet(
    filteredItems,
    filteredEmployees,
    monthLabel,
    year,
    effectiveCompany,
    includeFormulas
  );

  // 4. COMMERCIAL BANK DISBURSEMENT SCHEDULE
  const wsBank = createBankDisbursementSheet(
    filteredItems,
    monthLabel,
    year,
    effectiveCompany,
    includeFormulas
  );

  // 5. STATUTORY REMITTANCE SCHEDULES (PAYE & Pension)
  const wsPaye = createPayeTaxScheduleSheet(
    filteredItems,
    monthLabel,
    year,
    effectiveCompany,
    includeFormulas
  );

  const wsPension = createPensionRemittanceSheet(
    filteredItems,
    monthLabel,
    year,
    effectiveCompany,
    includeFormulas
  );

  // 6. ANNUAL 12-MONTH MATRIX
  const wsAnnual = createAnnualPayMatrixSheet(
    filteredEmployees,
    year,
    effectiveCompany,
    includeFormulas
  );

  // 7. STAFF DATABASE
  const wsStaff = createStaffDatabaseSheet(filteredEmployees);

  // Assemble Workbook Tabs according to Information Scope
  if (infoScope === 'all') {
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Payroll_Register');
    XLSX.utils.book_append_sheet(wb, wsBank, 'Bank_Schedule');
    XLSX.utils.book_append_sheet(wb, wsPaye, 'PAYE_Tax_Schedule');
    XLSX.utils.book_append_sheet(wb, wsPension, 'Pension_Remittance');
    XLSX.utils.book_append_sheet(wb, wsAnnual, `Annual_Matrix_${year}`.slice(0, 31));
    XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff_Database');
    XLSX.utils.book_append_sheet(wb, wsVariables, 'Variables');
  } else if (infoScope === 'payroll-register') {
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Payroll_Register');
    XLSX.utils.book_append_sheet(wb, wsAnnual, `Annual_Matrix_${year}`.slice(0, 31));
    XLSX.utils.book_append_sheet(wb, wsVariables, 'Variables');
  } else if (infoScope === 'bank-schedule') {
    XLSX.utils.book_append_sheet(wb, wsBank, 'Bank_Schedule');
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Payroll_Register');
    XLSX.utils.book_append_sheet(wb, wsVariables, 'Variables');
  } else if (infoScope === 'statutory-remittance') {
    XLSX.utils.book_append_sheet(wb, wsPaye, 'PAYE_Tax_Schedule');
    XLSX.utils.book_append_sheet(wb, wsPension, 'Pension_Remittance');
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Payroll_Register');
    XLSX.utils.book_append_sheet(wb, wsVariables, 'Variables');
  } else if (infoScope === 'staff-database') {
    XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff_Database');
    XLSX.utils.book_append_sheet(wb, wsVariables, 'Variables');
  }

  // If Full-Year Scope: append individual monthly payroll sheets
  if (scope === 'full-year' && (infoScope === 'all' || infoScope === 'payroll-register')) {
    MONTHS.forEach(m => {
      const monthItems = filteredEmployees
        .filter(e => e.status === 'Active')
        .map(emp => calculatePayrollItem(emp, payrollVars, payeVars, m.key, year));

      const wsMonth = createMasterPayrollSheet(
        filteredEmployees,
        monthItems,
        payrollVars,
        m.label,
        year,
        effectiveCompany,
        includeFormulas
      );
      XLSX.utils.book_append_sheet(wb, wsMonth, `${m.key.toUpperCase()}_${year}`.slice(0, 31));
    });
  }

  // Filename Generation
  let filename = `Payroll_Pro_${effectiveCompany.name.replace(/\s+/g, '_')}_${monthLabel}_${year}.xlsx`;
  if (scope === 'full-year') {
    filename = `Payroll_Pro_Full_Year_${year}_Master_Ledger.xlsx`;
  } else if (scope === 'all-history') {
    filename = `Payroll_Pro_Comprehensive_Audit_Ledger_${year}.xlsx`;
  }

  try {
    const finalBuffer = applyFreezePanesToWorkbook(wb);
    saveExcelWorkbookFile(finalBuffer, filename);
  } catch (err) {
    console.warn('Failed to apply freeze panes post-processing, falling back to standard write:', err);
    XLSX.writeFile(wb, filename);
  }
}

/**
 * Injects OpenXML SpreadsheetML <pane state="frozen" .../> definitions into
 * worksheets to freeze columns up to Full Name and keep header rows anchored
 * during both horizontal and vertical scrolling in Microsoft Excel.
 */
function applyFreezePanesToWorkbook(wb: XLSX.WorkBook): Uint8Array {
  const rawBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const unzipped = unzipSync(new Uint8Array(rawBuffer));

  const wbXmlStr = strFromU8(unzipped['xl/workbook.xml'] || new Uint8Array());
  const relsXmlStr = strFromU8(unzipped['xl/_rels/workbook.xml.rels'] || new Uint8Array());

  // Parse Relationship Id -> Target (e.g. rId1 -> worksheets/sheet1.xml)
  const relMap = new Map<string, string>();
  const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
  let relMatch;
  while ((relMatch = relRegex.exec(relsXmlStr)) !== null) {
    relMap.set(relMatch[1], relMatch[2]);
  }

  // Parse Sheet Name -> r:id (e.g. Master -> rId1)
  const sheetNameToRelId = new Map<string, string>();
  const sheetRegex = /<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g;
  let sheetMatch;
  while ((sheetMatch = sheetRegex.exec(wbXmlStr)) !== null) {
    sheetNameToRelId.set(sheetMatch[1], sheetMatch[2]);
  }

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const freeze = (ws as any)['!freezePane'];
    if (!freeze || (!freeze.xSplit && !freeze.ySplit)) continue;

    const relId = sheetNameToRelId.get(sheetName);
    if (!relId) continue;
    const target = relMap.get(relId);
    if (!target) continue;

    const xmlPath = target.startsWith('xl/') ? target : `xl/${target}`;
    if (!unzipped[xmlPath]) continue;

    let xml = strFromU8(unzipped[xmlPath]);
    const { xSplit = 0, ySplit = 0, topLeftCell = 'A1' } = freeze;

    let paneXml = '';
    let selectionXml = '';
    if (xSplit > 0 && ySplit > 0) {
      paneXml = `<pane xSplit="${xSplit}" ySplit="${ySplit}" topLeftCell="${topLeftCell}" activePane="bottomRight" state="frozen"/>`;
      selectionXml = `<selection pane="bottomRight" activeCell="${topLeftCell}" sqref="${topLeftCell}"/>`;
    } else if (xSplit > 0) {
      paneXml = `<pane xSplit="${xSplit}" topLeftCell="${topLeftCell}" activePane="topRight" state="frozen"/>`;
      selectionXml = `<selection pane="topRight" activeCell="${topLeftCell}" sqref="${topLeftCell}"/>`;
    } else if (ySplit > 0) {
      paneXml = `<pane ySplit="${ySplit}" topLeftCell="${topLeftCell}" activePane="bottomLeft" state="frozen"/>`;
      selectionXml = `<selection pane="bottomLeft" activeCell="${topLeftCell}" sqref="${topLeftCell}"/>`;
    }

    if (paneXml) {
      const newSheetView = `<sheetView workbookViewId="0">${paneXml}${selectionXml}</sheetView>`;
      xml = xml.replace(/<sheetView\b[^>]*?(?:\/>|>([\s\S]*?)<\/sheetView>)/, newSheetView);
      unzipped[xmlPath] = strToU8(xml);
    }
  }

  // Force Excel to automatically calculate and refresh all formulas on open
  let wbXml = strFromU8(unzipped['xl/workbook.xml'] || new Uint8Array());
  if (wbXml) {
    if (wbXml.includes('<calcPr')) {
      wbXml = wbXml.replace(/<calcPr\b[^>]*?\/>/, '<calcPr calcId="160000" fullCalcOnLoad="1" forceFullCalc="1"/>');
    } else if (wbXml.includes('</workbook>')) {
      wbXml = wbXml.replace('</workbook>', '<calcPr calcId="160000" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
    }
    unzipped['xl/workbook.xml'] = strToU8(wbXml);
  }

  return zipSync(unzipped);
}

function saveExcelWorkbookFile(buffer: Uint8Array, filename: string) {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    if ((window.navigator as any)?.msSaveOrOpenBlob) {
      (window.navigator as any).msSaveOrOpenBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * 1. VARIABLES TAB
 * Central configuration sheet housing all statutory percentages and CRA relief parameters.
 * Formulas in all other sheets dynamically reference cells on this tab.
 */
function createVariablesSheet(
  payrollVars: PayrollVariables,
  payeVars: PayeTaxVariables,
  company: CompanyProfile
): XLSX.WorkSheet {
  const basicDec = (payrollVars.basic || 40) / 100;
  const housingDec = (payrollVars.housing || 30) / 100;
  const transportDec = (payrollVars.transport || 20) / 100;
  const otherDec = (payrollVars.otherAllowances || 10) / 100;
  const empPensionDec = (payrollVars.employeePensionRate || 8) / 100;
  const emprPensionDec = (payrollVars.employerPensionRate || 10) / 100;

  const aoa: any[][] = [
    [company.name.toUpperCase()],
    ['STATUTORY SYSTEM VARIABLES & COMPENSATION PARAMETERS'],
    ['Master configuration sheet driving dynamic workbook formulas - Updates here recalculate schedules'],
    [],
    ['Parameter Code', 'Parameter Description', 'Configured Value', 'Unit / Basis', 'Statutory / Legal Reference'],
    // Row 6: Basic
    ['BASIC_RATE', 'Basic Salary Allowance Ratio', { t: 'n', v: basicDec, z: '0.00%' }, '40% of Monthly Gross', 'Nigerian Compensation Standard'],
    // Row 7: Housing
    ['HOUSING_RATE', 'Housing Allowance Ratio', { t: 'n', v: housingDec, z: '0.00%' }, '30% of Monthly Gross', 'Nigerian Compensation Standard'],
    // Row 8: Transport
    ['TRANSPORT_RATE', 'Transport Allowance Ratio', { t: 'n', v: transportDec, z: '0.00%' }, '20% of Monthly Gross', 'Nigerian Compensation Standard'],
    // Row 9: Other
    ['OTHER_RATE', 'Other Allowances Ratio', { t: 'n', v: otherDec, z: '0.00%' }, '10% of Monthly Gross', 'Nigerian Compensation Standard'],
    [],
    ['STATUTORY PENSION PARAMETERS (PRA 2014)', '', '', '', ''],
    // Row 12: Employee Pension
    ['EMP_PENSION_RATE', 'Employee Pension Contribution', { t: 'n', v: empPensionDec, z: '0.00%' }, '8% of Pensionable BHT', 'Section 4(1)(a) Pension Reform Act 2014'],
    // Row 13: Employer Pension
    ['EMPR_PENSION_RATE', 'Employer Matching Contribution', { t: 'n', v: emprPensionDec, z: '0.00%' }, '10% of Pensionable BHT', 'Section 4(1)(b) Pension Reform Act 2014'],
    [],
    ['PERSONAL INCOME TAX (PITA 2011 / FINANCE ACT)', '', '', '', ''],
    // Row 16: CRA Base
    ['CRA_BASE', 'Consolidated Relief Base Allowance', { t: 'n', v: payeVars.craBase || 800000, z: CURRENCY_FORMAT }, 'NGN Base Annual Relief', 'Sixth Schedule PITA 2011'],
    // Row 17: Rent Relief Rate
    ['RENT_RELIEF_RATE', 'Rent Relief Statutory Rate', { t: 'n', v: payeVars.rentReliefRate || 0.20, z: '0.00%' }, '20% of Annual Rent', 'National Tax Policy'],
    // Row 18: Rent Relief Cap
    ['RENT_RELIEF_CAP', 'Rent Relief Statutory Cap', { t: 'n', v: payeVars.rentReliefCap || 500000, z: CURRENCY_FORMAT }, 'NGN Statutory Maximum', 'PITA Guidelines'],
    // Row 19: Minimum Wage Threshold
    ['MIN_WAGE_THRESHOLD', 'National Minimum Wage Exemption', { t: 'n', v: 70000, z: CURRENCY_FORMAT }, 'NGN Monthly Threshold', 'National Minimum Wage Act 2024'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 22 }, // Parameter Code
    { wch: 36 }, // Parameter Description
    { wch: 20 }, // Configured Value
    { wch: 24 }, // Unit / Basis
    { wch: 38 }, // Legal Reference
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 2. MASTER PAYROLL REGISTER TAB
 * Structured table design with frozen headers, live formulas linking to Variables tab,
 * and SUBTOTAL(109, ...) summaries for dynamic recalculation during Excel row filtering.
 */
function createMasterPayrollSheet(
  employees: Employee[],
  items: CalculatedPayrollItem[],
  payrollVars: PayrollVariables,
  monthLabel: string,
  year: number,
  company: CompanyProfile,
  includeFormulas: boolean
): XLSX.WorkSheet {
  const basicRate = (payrollVars.basic || 40) / 100;
  const housingRate = (payrollVars.housing || 30) / 100;
  const transportRate = (payrollVars.transport || 20) / 100;
  const otherRate = (payrollVars.otherAllowances || 10) / 100;
  const empPensionRate = (payrollVars.employeePensionRate || 8) / 100;
  const compPensionRate = (payrollVars.employerPensionRate || 10) / 100;

  // Header Rows
  const aoa: any[][] = [
    [company.name.toUpperCase()],
    [`MASTER PAYROLL REGISTER - ${monthLabel.toUpperCase()} ${year}`],
    [`Address: ${company.address || 'N/A'}  |  Phone: ${company.phone || 'N/A'}  |  Currency: Nigerian Naira (NGN ₦)`],
    [], // Blank separator
    [
      'S/N',
      'Staff Code',
      'Full Name',
      'Department',
      'Designation / Role',
      'Employment Type',
      'Bank Name',
      'Account Number',
      'Monthly Gross (₦)',
      `Basic (${(basicRate * 100).toFixed(0)}%)`,
      `Housing (${(housingRate * 100).toFixed(0)}%)`,
      `Transport (${(transportRate * 100).toFixed(0)}%)`,
      `Other (${(otherRate * 100).toFixed(0)}%)`,
      'Pensionable BHT (₦)',
      `Employee Pension (${(empPensionRate * 100).toFixed(0)}%)`,
      'Monthly PAYE Tax (₦)',
      'Total Deductions (₦)',
      'Net Take-Home Pay (₦)',
      `Employer Pension (${(compPensionRate * 100).toFixed(0)}%)`,
      'Total Employer Cost (₦)',
      'PAYE Taxpayer ID',
      'Pension Enrolled',
      'Pension RSA PIN',
      'PFA Administrator',
    ]
  ];

  const headerRowIdx = 5; // 1-based row 5 is the column headers

  // Data Rows
  items.forEach((item, index) => {
    const rowNum = headerRowIdx + 1 + index; // 1-based row in Excel
    const sn = index + 1;
    const enrolledPensionStr = item.hasPension ? 'YES' : 'NO';

    if (includeFormulas) {
      aoa.push([
        sn,
        item.employeeCode,
        item.fullName,
        item.department,
        item.position,
        item.employmentType || 'Full-Time',
        item.bankName,
        item.accountNumber,
        { t: 'n', v: Math.round(item.monthlyGross * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(I${rowNum}*'Variables'!$C$6, 2)`, v: item.basic, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(I${rowNum}*'Variables'!$C$7, 2)`, v: item.housing, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(I${rowNum}*'Variables'!$C$8, 2)`, v: item.transport, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(I${rowNum}*'Variables'!$C$9, 2)`, v: item.otherAllowances, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUM(J${rowNum}:L${rowNum})`, v: item.pensionableBHT, z: CURRENCY_FORMAT },
        { t: 'n', f: `IF(V${rowNum}="YES", ROUND(N${rowNum}*'Variables'!$C$12, 2), 0)`, v: item.employeePension, z: CURRENCY_FORMAT },
        { t: 'n', v: Math.round(item.monthlyPaye * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', f: `O${rowNum}+P${rowNum}`, v: item.totalDeductions, z: CURRENCY_FORMAT },
        { t: 'n', f: `I${rowNum}-Q${rowNum}`, v: item.netTakeHome, z: CURRENCY_FORMAT },
        { t: 'n', f: `IF(V${rowNum}="YES", ROUND(N${rowNum}*'Variables'!$C$13, 2), 0)`, v: item.employerPension, z: CURRENCY_FORMAT },
        { t: 'n', f: `I${rowNum}+S${rowNum}`, v: item.employerTotalCost, z: CURRENCY_FORMAT },
        item.payeNumber || '',
        enrolledPensionStr,
        item.pensionNumber || '',
        item.pfaName || '',
      ]);
    } else {
      aoa.push([
        sn,
        item.employeeCode,
        item.fullName,
        item.department,
        item.position,
        item.employmentType || 'Full-Time',
        item.bankName,
        item.accountNumber,
        { t: 'n', v: item.monthlyGross, z: CURRENCY_FORMAT },
        { t: 'n', v: item.basic, z: CURRENCY_FORMAT },
        { t: 'n', v: item.housing, z: CURRENCY_FORMAT },
        { t: 'n', v: item.transport, z: CURRENCY_FORMAT },
        { t: 'n', v: item.otherAllowances, z: CURRENCY_FORMAT },
        { t: 'n', v: item.pensionableBHT, z: CURRENCY_FORMAT },
        { t: 'n', v: item.employeePension, z: CURRENCY_FORMAT },
        { t: 'n', v: item.monthlyPaye, z: CURRENCY_FORMAT },
        { t: 'n', v: item.totalDeductions, z: CURRENCY_FORMAT },
        { t: 'n', v: item.netTakeHome, z: CURRENCY_FORMAT },
        { t: 'n', v: item.employerPension, z: CURRENCY_FORMAT },
        { t: 'n', v: item.employerTotalCost, z: CURRENCY_FORMAT },
        item.payeNumber || '',
        enrolledPensionStr,
        item.pensionNumber || '',
        item.pfaName || '',
      ]);
    }
  });

  // Summary Totals Row at the bottom with SUBTOTAL(109, ...)
  const startRow = headerRowIdx + 1;
  const endRow = headerRowIdx + items.length;
  if (items.length > 0) {
    const sumGross = items.reduce((s, i) => s + i.monthlyGross, 0);
    const sumBasic = items.reduce((s, i) => s + i.basic, 0);
    const sumHousing = items.reduce((s, i) => s + i.housing, 0);
    const sumTransport = items.reduce((s, i) => s + i.transport, 0);
    const sumOther = items.reduce((s, i) => s + i.otherAllowances, 0);
    const sumBht = items.reduce((s, i) => s + i.pensionableBHT, 0);
    const sumEmpPension = items.reduce((s, i) => s + i.employeePension, 0);
    const sumPaye = items.reduce((s, i) => s + i.monthlyPaye, 0);
    const sumDed = items.reduce((s, i) => s + i.totalDeductions, 0);
    const sumNet = items.reduce((s, i) => s + i.netTakeHome, 0);
    const sumCompPension = items.reduce((s, i) => s + i.employerPension, 0);
    const sumCost = items.reduce((s, i) => s + i.employerTotalCost, 0);

    if (includeFormulas) {
      aoa.push([
        '',
        '',
        'TOTAL SUMMARY',
        '',
        '',
        '',
        '',
        '',
        { t: 'n', f: `SUBTOTAL(109, I${startRow}:I${endRow})`, v: sumGross, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, J${startRow}:J${endRow})`, v: sumBasic, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, K${startRow}:K${endRow})`, v: sumHousing, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, L${startRow}:L${endRow})`, v: sumTransport, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, M${startRow}:M${endRow})`, v: sumOther, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, N${startRow}:N${endRow})`, v: sumBht, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, O${startRow}:O${endRow})`, v: sumEmpPension, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, P${startRow}:P${endRow})`, v: sumPaye, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, Q${startRow}:Q${endRow})`, v: sumDed, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, R${startRow}:R${endRow})`, v: sumNet, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, S${startRow}:S${endRow})`, v: sumCompPension, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, T${startRow}:T${endRow})`, v: sumCost, z: CURRENCY_FORMAT },
        '',
        '',
        '',
        '',
      ]);
    } else {
      aoa.push([
        '',
        '',
        'TOTAL SUMMARY',
        '',
        '',
        '',
        '',
        '',
        { t: 'n', v: sumGross, z: CURRENCY_FORMAT },
        { t: 'n', v: sumBasic, z: CURRENCY_FORMAT },
        { t: 'n', v: sumHousing, z: CURRENCY_FORMAT },
        { t: 'n', v: sumTransport, z: CURRENCY_FORMAT },
        { t: 'n', v: sumOther, z: CURRENCY_FORMAT },
        { t: 'n', v: sumBht, z: CURRENCY_FORMAT },
        { t: 'n', v: sumEmpPension, z: CURRENCY_FORMAT },
        { t: 'n', v: sumPaye, z: CURRENCY_FORMAT },
        { t: 'n', v: sumDed, z: CURRENCY_FORMAT },
        { t: 'n', v: sumNet, z: CURRENCY_FORMAT },
        { t: 'n', v: sumCompPension, z: CURRENCY_FORMAT },
        { t: 'n', v: sumCost, z: CURRENCY_FORMAT },
        '',
        '',
        '',
        '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Freeze Panes: Freeze header row 5 and columns A-C (S/N, Staff Code, Full Name)
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 5 }];

  // Column Widths
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 12 }, // Code
    { wch: 25 }, // Name
    { wch: 18 }, // Dept
    { wch: 22 }, // Role
    { wch: 16 }, // Employment Type
    { wch: 16 }, // Bank
    { wch: 16 }, // Account Number
    { wch: 18 }, // Gross
    { wch: 15 }, // Basic
    { wch: 15 }, // Housing
    { wch: 15 }, // Transport
    { wch: 14 }, // Other
    { wch: 18 }, // BHT
    { wch: 18 }, // Emp Pension
    { wch: 18 }, // PAYE
    { wch: 18 }, // Total Deductions
    { wch: 18 }, // Net Take-Home
    { wch: 18 }, // Employer Pension
    { wch: 20 }, // Total Cost
    { wch: 18 }, // Tax ID
    { wch: 14 }, // Pension Active
    { wch: 18 }, // RSA PIN
    { wch: 26 }, // PFA Name
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 3. EXECUTIVE SUMMARY TAB (C-Suite Dashboard)
 * Modeled after executive KPI summary registers with high-level scorecards,
 * Departmental Cost Allocation matrix (=COUNTIF, =SUMIF), and Employment Type demarcation.
 */
function createExecutiveSummarySheet(
  items: CalculatedPayrollItem[],
  employees: Employee[],
  monthLabel: string,
  year: number,
  company: CompanyProfile,
  includeFormulas: boolean
): XLSX.WorkSheet {
  const masterHeaderRow = 5;
  const masterStartRow = 6;
  const masterEndRow = masterHeaderRow + items.length;
  const masterTotalRow = masterEndRow + 1;

  const sumGross = items.reduce((s, i) => s + i.monthlyGross, 0);
  const sumNet = items.reduce((s, i) => s + i.netTakeHome, 0);
  const sumPaye = items.reduce((s, i) => s + i.monthlyPaye, 0);
  const sumEmpPension = items.reduce((s, i) => s + i.employeePension, 0);
  const sumCompPension = items.reduce((s, i) => s + i.employerPension, 0);
  const sumPensionTotal = sumEmpPension + sumCompPension;
  const sumCost = items.reduce((s, i) => s + i.employerTotalCost, 0);
  const sumDed = items.reduce((s, i) => s + i.totalDeductions, 0);

  const aoa: any[][] = [
    [company.name.toUpperCase()],
    [`EXECUTIVE PAYROLL SUMMARY & REMITTANCE DASHBOARD - ${monthLabel.toUpperCase()} ${year}`],
    [`Consolidated Financial Metrics, Department Allocation & Statutory Compliance  |  Currency: NGN (₦)`],
    [],
    ['KEY FINANCIAL PERFORMANCE INDICATORS (C-SUITE SCORECARD)', '', '', '', ''],
    ['Metric Description', 'Consolidated Amount (₦)', 'Operational Context / Legal Mandate', '', ''],
  ];

  if (includeFormulas && items.length > 0) {
    aoa.push(
      ['Active Staff on Payroll', { t: 'n', f: `COUNTA('Payroll_Register'!$B$${masterStartRow}:$B$${masterEndRow})`, v: items.length, z: '#,##0' }, 'Total enrolled workforce headcount active for the period', '', ''],
      ['Total Gross Payroll Obligation', { t: 'n', f: `'Payroll_Register'!$I$${masterTotalRow}`, v: sumGross, z: CURRENCY_FORMAT }, 'Total gross contractual staff emoluments earned', '', ''],
      ['Total Net Salary Disbursed', { t: 'n', f: `'Payroll_Register'!$R$${masterTotalRow}`, v: sumNet, z: CURRENCY_FORMAT }, 'Actual net cash transferred to employee bank accounts', '', ''],
      ['Total Statutory PAYE Tax Remittance', { t: 'n', f: `'Payroll_Register'!$P$${masterTotalRow}`, v: sumPaye, z: CURRENCY_FORMAT }, 'Monthly tax payable to State Internal Revenue Service (LIRS/FIRS)', '', ''],
      ['Total Pension Remittance (18%)', { t: 'n', f: `'Payroll_Register'!$O$${masterTotalRow}+'Payroll_Register'!$S$${masterTotalRow}`, v: sumPensionTotal, z: CURRENCY_FORMAT }, 'Combined 8% employee + 10% employer matching pension to PFAs', '', ''],
      ['Total Comprehensive Employer Cost', { t: 'n', f: `'Payroll_Register'!$T$${masterTotalRow}`, v: sumCost, z: CURRENCY_FORMAT }, 'Total corporate workforce financial liability (Gross + Employer Pension)', '', ''],
      ['Effective Statutory Withholding Ratio', { t: 'n', f: `IF('Payroll_Register'!$I$${masterTotalRow}>0, 'Payroll_Register'!$Q$${masterTotalRow}/'Payroll_Register'!$I$${masterTotalRow}, 0)`, v: sumGross > 0 ? sumDed / sumGross : 0, z: '0.00%' }, 'Proportion of total gross salary withheld for statutory deductions', '', '']
    );
  } else {
    aoa.push(
      ['Active Staff on Payroll', { t: 'n', v: items.length, z: '#,##0' }, 'Total enrolled workforce headcount active for the period', '', ''],
      ['Total Gross Payroll Obligation', { t: 'n', v: sumGross, z: CURRENCY_FORMAT }, 'Total gross contractual staff emoluments earned', '', ''],
      ['Total Net Salary Disbursed', { t: 'n', v: sumNet, z: CURRENCY_FORMAT }, 'Actual net cash transferred to employee bank accounts', '', ''],
      ['Total Statutory PAYE Tax Remittance', { t: 'n', v: sumPaye, z: CURRENCY_FORMAT }, 'Monthly tax payable to State Internal Revenue Service (LIRS/FIRS)', '', ''],
      ['Total Pension Remittance (18%)', { t: 'n', v: sumPensionTotal, z: CURRENCY_FORMAT }, 'Combined 8% employee + 10% employer matching pension to PFAs', '', ''],
      ['Total Comprehensive Employer Cost', { t: 'n', v: sumCost, z: CURRENCY_FORMAT }, 'Total corporate workforce financial liability (Gross + Employer Pension)', '', ''],
      ['Effective Statutory Withholding Ratio', { t: 'n', v: sumGross > 0 ? sumDed / sumGross : 0, z: '0.00%' }, 'Proportion of total gross salary withheld for statutory deductions', '', '']
    );
  }

  // Section 2: Department Cost Allocation Table
  aoa.push([]);
  aoa.push(['DEPARTMENTAL COST ALLOCATION & HEADCOUNT MATRIX', '', '', '', '', '', '', '']);
  aoa.push([
    'Department Name',
    'Headcount',
    'Gross Payroll (₦)',
    'Net Disbursed (₦)',
    'PAYE Tax (₦)',
    'Pension Remittance (₦)',
    'Total Dept Cost (₦)',
    '% Share of Total Cost'
  ]);

  const uniqueDepts = Array.from(new Set(items.map(i => i.department || 'GENERAL'))).sort();
  const deptStartRow = aoa.length + 1; // 1-based row index for first department

  uniqueDepts.forEach((dept, idx) => {
    const curRow = deptStartRow + idx;
    const deptItems = items.filter(i => (i.department || 'GENERAL') === dept);
    const dGross = deptItems.reduce((s, i) => s + i.monthlyGross, 0);
    const dNet = deptItems.reduce((s, i) => s + i.netTakeHome, 0);
    const dPaye = deptItems.reduce((s, i) => s + i.monthlyPaye, 0);
    const dPension = deptItems.reduce((s, i) => s + i.employeePension + i.employerPension, 0);
    const dCost = deptItems.reduce((s, i) => s + i.employerTotalCost, 0);

    if (includeFormulas && items.length > 0) {
      aoa.push([
        dept,
        { t: 'n', f: `COUNTIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}")`, v: deptItems.length, z: '#,##0' },
        { t: 'n', f: `SUMIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}", 'Payroll_Register'!$I$${masterStartRow}:$I$${masterEndRow})`, v: dGross, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUMIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}", 'Payroll_Register'!$R$${masterStartRow}:$R$${masterEndRow})`, v: dNet, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUMIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}", 'Payroll_Register'!$P$${masterStartRow}:$P$${masterEndRow})`, v: dPaye, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUMIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}", 'Payroll_Register'!$O$${masterStartRow}:$O$${masterEndRow})+SUMIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}", 'Payroll_Register'!$S$${masterStartRow}:$S$${masterEndRow})`, v: dPension, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUMIF('Payroll_Register'!$D$${masterStartRow}:$D$${masterEndRow}, "${dept}", 'Payroll_Register'!$T$${masterStartRow}:$T$${masterEndRow})`, v: dCost, z: CURRENCY_FORMAT },
        { t: 'n', f: `IF('Payroll_Register'!$T$${masterTotalRow}>0, G${curRow}/'Payroll_Register'!$T$${masterTotalRow}, 0)`, v: sumCost > 0 ? dCost / sumCost : 0, z: '0.00%' }
      ]);
    } else {
      aoa.push([
        dept,
        { t: 'n', v: deptItems.length, z: '#,##0' },
        { t: 'n', v: dGross, z: CURRENCY_FORMAT },
        { t: 'n', v: dNet, z: CURRENCY_FORMAT },
        { t: 'n', v: dPaye, z: CURRENCY_FORMAT },
        { t: 'n', v: dPension, z: CURRENCY_FORMAT },
        { t: 'n', v: dCost, z: CURRENCY_FORMAT },
        { t: 'n', v: sumCost > 0 ? dCost / sumCost : 0, z: '0.00%' }
      ]);
    }
  });

  const deptEndRow = deptStartRow + uniqueDepts.length - 1;
  if (uniqueDepts.length > 0) {
    if (includeFormulas) {
      aoa.push([
        'TOTAL DEPARTMENT ALLOCATION',
        { t: 'n', f: `SUM(B${deptStartRow}:B${deptEndRow})`, v: items.length, z: '#,##0' },
        { t: 'n', f: `SUM(C${deptStartRow}:C${deptEndRow})`, v: sumGross, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUM(D${deptStartRow}:D${deptEndRow})`, v: sumNet, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUM(E${deptStartRow}:E${deptEndRow})`, v: sumPaye, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUM(F${deptStartRow}:F${deptEndRow})`, v: sumPensionTotal, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUM(G${deptStartRow}:G${deptEndRow})`, v: sumCost, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUM(H${deptStartRow}:H${deptEndRow})`, v: 1.0, z: '0.00%' }
      ]);
    } else {
      aoa.push([
        'TOTAL DEPARTMENT ALLOCATION',
        { t: 'n', v: items.length, z: '#,##0' },
        { t: 'n', v: sumGross, z: CURRENCY_FORMAT },
        { t: 'n', v: sumNet, z: CURRENCY_FORMAT },
        { t: 'n', v: sumPaye, z: CURRENCY_FORMAT },
        { t: 'n', v: sumPensionTotal, z: CURRENCY_FORMAT },
        { t: 'n', v: sumCost, z: CURRENCY_FORMAT },
        { t: 'n', v: 1.0, z: '0.00%' }
      ]);
    }
  }

  // Section 3: Employment Classification Demarcation Table
  aoa.push([]);
  aoa.push(['EMPLOYMENT CLASSIFICATION BREAKDOWN', '', '', '', '', '']);
  aoa.push([
    'Classification',
    'Headcount',
    'Gross Outflow (₦)',
    'Net Disbursed (₦)',
    'Statutory Deductions (₦)',
    'Compliance Policy'
  ]);

  const classifications = ['Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'];
  classifications.forEach(type => {
    const tItems = items.filter(i => (i.employmentType || 'Full-Time').toLowerCase() === type.toLowerCase());
    const tGross = tItems.reduce((s, i) => s + i.monthlyGross, 0);
    const tNet = tItems.reduce((s, i) => s + i.netTakeHome, 0);
    const tDed = tItems.reduce((s, i) => s + i.totalDeductions, 0);
    const policy = type === 'Full-Time' 
      ? 'Standard Statutory Withholding (PAYE + 8% Pension)' 
      : 'Contractual Gross Remittance / Exempt from Payroll Deductions';

    if (includeFormulas && items.length > 0) {
      aoa.push([
        type,
        { t: 'n', f: `COUNTIF('Payroll_Register'!$F$${masterStartRow}:$F$${masterEndRow}, "${type}")`, v: tItems.length, z: '#,##0' },
        { t: 'n', f: `SUMIF('Payroll_Register'!$F$${masterStartRow}:$F$${masterEndRow}, "${type}", 'Payroll_Register'!$I$${masterStartRow}:$I$${masterEndRow})`, v: tGross, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUMIF('Payroll_Register'!$F$${masterStartRow}:$F$${masterEndRow}, "${type}", 'Payroll_Register'!$R$${masterStartRow}:$R$${masterEndRow})`, v: tNet, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUMIF('Payroll_Register'!$F$${masterStartRow}:$F$${masterEndRow}, "${type}", 'Payroll_Register'!$Q$${masterStartRow}:$Q$${masterEndRow})`, v: tDed, z: CURRENCY_FORMAT },
        policy
      ]);
    } else {
      aoa.push([
        type,
        { t: 'n', v: tItems.length, z: '#,##0' },
        { t: 'n', v: tGross, z: CURRENCY_FORMAT },
        { t: 'n', v: tNet, z: CURRENCY_FORMAT },
        { t: 'n', v: tDed, z: CURRENCY_FORMAT },
        policy
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 32 }, // Description / Name / Dept
    { wch: 22 }, // Value / Gross
    { wch: 22 }, // Net Disbursed
    { wch: 22 }, // PAYE / Deductions
    { wch: 22 }, // Pension
    { wch: 24 }, // Total Cost / Context
    { wch: 18 }, // % Share
    { wch: 32 }, // Extra Notes
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 4. COMMERCIAL BANK DISBURSEMENT SCHEDULE
 * Formatted for corporate direct banking uploads (NUBAN compliant)
 * with amounts dynamically referencing the Master Payroll Register.
 */
function createBankDisbursementSheet(
  items: CalculatedPayrollItem[],
  monthLabel: string,
  year: number,
  company: CompanyProfile,
  includeFormulas: boolean
): XLSX.WorkSheet {
  const aoa: any[][] = [
    [company.name.toUpperCase()],
    [`COMMERCIAL BANK SALARY PAYMENT SCHEDULE - ${monthLabel.toUpperCase()} ${year}`],
    [`Corporate Bank Disbursement Batch File  |  Currency: NGN (₦)`],
    [],
    [
      'S/N',
      'Beneficiary Account Number',
      'Beneficiary Account Name',
      'Bank Name',
      'Net Payment Amount (₦)',
      'Payment Narration / Reference',
      'Staff Code',
      'Department',
    ]
  ];

  const headerRowIdx = 5;

  items.forEach((item, index) => {
    const rowNum = headerRowIdx + 1 + index;
    const masterRow = 6 + index; // Corresponding row in Payroll_Register

    if (includeFormulas) {
      aoa.push([
        index + 1,
        item.accountNumber, // String preserving leading zeroes
        item.fullName,
        item.bankName,
        { t: 'n', f: `'Payroll_Register'!R${masterRow}`, v: Math.round(item.netTakeHome * 100) / 100, z: CURRENCY_FORMAT },
        `SALARY ${monthLabel.toUpperCase()} ${year}`,
        item.employeeCode,
        item.department,
      ]);
    } else {
      aoa.push([
        index + 1,
        item.accountNumber,
        item.fullName,
        item.bankName,
        { t: 'n', v: Math.round(item.netTakeHome * 100) / 100, z: CURRENCY_FORMAT },
        `SALARY ${monthLabel.toUpperCase()} ${year}`,
        item.employeeCode,
        item.department,
      ]);
    }
  });

  // Batch Total Row
  const startRow = headerRowIdx + 1;
  const endRow = headerRowIdx + items.length;
  if (items.length > 0) {
    const totalNet = items.reduce((s, i) => s + i.netTakeHome, 0);
    if (includeFormulas) {
      aoa.push([
        '',
        '',
        'BATCH DISBURSEMENT TOTAL',
        '',
        { t: 'n', f: `SUBTOTAL(109, E${startRow}:E${endRow})`, v: totalNet, z: CURRENCY_FORMAT },
        `${items.length} Transactions`,
        '',
        '',
      ]);
    } else {
      aoa.push([
        '',
        '',
        'BATCH DISBURSEMENT TOTAL',
        '',
        { t: 'n', v: totalNet, z: CURRENCY_FORMAT },
        `${items.length} Transactions`,
        '',
        '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 5 }];
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 22 }, // Account Number
    { wch: 28 }, // Name
    { wch: 20 }, // Bank
    { wch: 22 }, // Net Pay
    { wch: 28 }, // Narration
    { wch: 14 }, // Code
    { wch: 18 }, // Dept
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 5. STATUTORY PAYE TAX SCHEDULE
 * State Internal Revenue Service monthly statutory tax return under PITA 2011/2020.
 */
function createPayeTaxScheduleSheet(
  items: CalculatedPayrollItem[],
  monthLabel: string,
  year: number,
  company: CompanyProfile,
  includeFormulas: boolean
): XLSX.WorkSheet {
  const aoa: any[][] = [
    [company.name.toUpperCase()],
    [`STATUTORY PAYE TAX REMITTANCE SCHEDULE - ${monthLabel.toUpperCase()} ${year}`],
    [`State Internal Revenue Service (IRS) Monthly Return  |  Sixth Schedule PITA 2011/2020`],
    [],
    [
      'S/N',
      'Staff Code',
      'Taxpayer Full Name',
      'State Taxpayer ID / PAYE No',
      'Annual Gross (₦)',
      'Consolidated Relief (CRA ₦)',
      'Net Taxable Income (₦)',
      'Computed Annual Tax (₦)',
      'Monthly PAYE Remittance (₦)',
      'Designation / Role',
      'Department',
    ]
  ];

  const headerRowIdx = 5;

  items.forEach((item, index) => {
    const rowNum = headerRowIdx + 1 + index;
    const masterRow = 6 + index;

    if (includeFormulas) {
      aoa.push([
        index + 1,
        item.employeeCode,
        item.fullName,
        item.payeNumber || 'UNREGISTERED',
        { t: 'n', f: `ROUND('Payroll_Register'!I${masterRow}*12, 2)`, v: item.annualGross, z: CURRENCY_FORMAT },
        { t: 'n', v: Math.round(item.totalCra * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', f: `MAX(0, E${rowNum}-F${rowNum})`, v: item.taxableIncome, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(I${rowNum}*12, 2)`, v: item.annualTax, z: CURRENCY_FORMAT },
        { t: 'n', f: `'Payroll_Register'!P${masterRow}`, v: item.monthlyPaye, z: CURRENCY_FORMAT },
        item.position,
        item.department,
      ]);
    } else {
      aoa.push([
        index + 1,
        item.employeeCode,
        item.fullName,
        item.payeNumber || 'UNREGISTERED',
        { t: 'n', v: Math.round(item.annualGross * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', v: Math.round(item.totalCra * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', v: Math.round(item.taxableIncome * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', v: Math.round(item.annualTax * 100) / 100, z: CURRENCY_FORMAT },
        { t: 'n', v: Math.round(item.monthlyPaye * 100) / 100, z: CURRENCY_FORMAT },
        item.position,
        item.department,
      ]);
    }
  });

  // Totals Row
  const startRow = headerRowIdx + 1;
  const endRow = headerRowIdx + items.length;
  if (items.length > 0) {
    const sumAnnGross = items.reduce((s, i) => s + i.annualGross, 0);
    const sumCra = items.reduce((s, i) => s + i.totalCra, 0);
    const sumTaxable = items.reduce((s, i) => s + i.taxableIncome, 0);
    const sumAnnTax = items.reduce((s, i) => s + i.annualTax, 0);
    const sumMonthPaye = items.reduce((s, i) => s + i.monthlyPaye, 0);

    if (includeFormulas) {
      aoa.push([
        '',
        '',
        'TOTAL STATUTORY REMITTANCE',
        '',
        { t: 'n', f: `SUBTOTAL(109, E${startRow}:E${endRow})`, v: sumAnnGross, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, F${startRow}:F${endRow})`, v: sumCra, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, G${startRow}:G${endRow})`, v: sumTaxable, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, H${startRow}:H${endRow})`, v: sumAnnTax, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, I${startRow}:I${endRow})`, v: sumMonthPaye, z: CURRENCY_FORMAT },
        '',
        '',
      ]);
    } else {
      aoa.push([
        '',
        '',
        'TOTAL STATUTORY REMITTANCE',
        '',
        { t: 'n', v: sumAnnGross, z: CURRENCY_FORMAT },
        { t: 'n', v: sumCra, z: CURRENCY_FORMAT },
        { t: 'n', v: sumTaxable, z: CURRENCY_FORMAT },
        { t: 'n', v: sumAnnTax, z: CURRENCY_FORMAT },
        { t: 'n', v: sumMonthPaye, z: CURRENCY_FORMAT },
        '',
        '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 5 }];
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 12 }, // Code
    { wch: 26 }, // Name
    { wch: 24 }, // State Taxpayer ID
    { wch: 20 }, // Annual Gross
    { wch: 20 }, // CRA
    { wch: 20 }, // Taxable Income
    { wch: 20 }, // Annual Tax
    { wch: 22 }, // Monthly PAYE
    { wch: 22 }, // Role
    { wch: 18 }, // Dept
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 6. PENSION REMITTANCE SCHEDULE
 * PenCom Pension Reform Act 2014 schedule linking directly to Master Register.
 */
function createPensionRemittanceSheet(
  items: CalculatedPayrollItem[],
  monthLabel: string,
  year: number,
  company: CompanyProfile,
  includeFormulas: boolean
): XLSX.WorkSheet {
  const aoa: any[][] = [
    [company.name.toUpperCase()],
    [`PENSION CONTRIBUTION REMITTANCE SCHEDULE - ${monthLabel.toUpperCase()} ${year}`],
    [`National Pension Commission (PenCom) Pension Reform Act 2014 Format`],
    [],
    [
      'S/N',
      'Staff Code',
      'Employee Full Name',
      'Pension Fund Administrator (PFA)',
      'RSA PIN',
      'Pensionable Emoluments (BHT ₦)',
      'Employee Contribution (8% ₦)',
      'Employer Contribution (10% ₦)',
      'Total 18% Remittance (₦)',
      'Department',
    ]
  ];

  const headerRowIdx = 5;

  items.forEach((item, index) => {
    const rowNum = headerRowIdx + 1 + index;
    const masterRow = 6 + index;

    if (includeFormulas) {
      aoa.push([
        index + 1,
        item.employeeCode,
        item.fullName,
        item.pfaName || 'NOT SPECIFIED',
        item.pensionNumber || 'NOT REGISTERED',
        { t: 'n', f: `'Payroll_Register'!N${masterRow}`, v: item.pensionableBHT, z: CURRENCY_FORMAT },
        { t: 'n', f: `'Payroll_Register'!O${masterRow}`, v: item.employeePension, z: CURRENCY_FORMAT },
        { t: 'n', f: `'Payroll_Register'!S${masterRow}`, v: item.employerPension, z: CURRENCY_FORMAT },
        { t: 'n', f: `G${rowNum}+H${rowNum}`, v: item.employeePension + item.employerPension, z: CURRENCY_FORMAT },
        item.department,
      ]);
    } else {
      aoa.push([
        index + 1,
        item.employeeCode,
        item.fullName,
        item.pfaName || 'NOT SPECIFIED',
        item.pensionNumber || 'NOT REGISTERED',
        { t: 'n', v: item.pensionableBHT, z: CURRENCY_FORMAT },
        { t: 'n', v: item.employeePension, z: CURRENCY_FORMAT },
        { t: 'n', v: item.employerPension, z: CURRENCY_FORMAT },
        { t: 'n', v: item.employeePension + item.employerPension, z: CURRENCY_FORMAT },
        item.department,
      ]);
    }
  });

  // Totals Row
  const startRow = headerRowIdx + 1;
  const endRow = headerRowIdx + items.length;
  if (items.length > 0) {
    const sumBht = items.reduce((s, i) => s + i.pensionableBHT, 0);
    const sumEmp = items.reduce((s, i) => s + i.employeePension, 0);
    const sumEmpr = items.reduce((s, i) => s + i.employerPension, 0);

    if (includeFormulas) {
      aoa.push([
        '',
        '',
        'TOTAL PENSION REMITTANCE',
        '',
        '',
        { t: 'n', f: `SUBTOTAL(109, F${startRow}:F${endRow})`, v: sumBht, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, G${startRow}:G${endRow})`, v: sumEmp, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, H${startRow}:H${endRow})`, v: sumEmpr, z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, I${startRow}:I${endRow})`, v: sumEmp + sumEmpr, z: CURRENCY_FORMAT },
        '',
      ]);
    } else {
      aoa.push([
        '',
        '',
        'TOTAL PENSION REMITTANCE',
        '',
        '',
        { t: 'n', v: sumBht, z: CURRENCY_FORMAT },
        { t: 'n', v: sumEmp, z: CURRENCY_FORMAT },
        { t: 'n', v: sumEmpr, z: CURRENCY_FORMAT },
        { t: 'n', v: sumEmp + sumEmpr, z: CURRENCY_FORMAT },
        '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 5 }];
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 12 }, // Code
    { wch: 26 }, // Name
    { wch: 28 }, // PFA
    { wch: 20 }, // RSA PIN
    { wch: 22 }, // BHT
    { wch: 22 }, // Emp Pension
    { wch: 22 }, // Empr Pension
    { wch: 24 }, // Total 18% Remittance
    { wch: 18 }, // Dept
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 7. ANNUAL PAY MATRIX TAB
 * 12-month compensation ledger with live SUM and AVERAGE across calendar months.
 */
function createAnnualPayMatrixSheet(
  employees: Employee[],
  year: number,
  company: CompanyProfile,
  includeFormulas: boolean
): XLSX.WorkSheet {
  const aoa: any[][] = [
    [company.name.toUpperCase()],
    [`ANNUAL PAYROLL DISBURSEMENT MATRIX - FULL YEAR ${year}`],
    [`Employee Monthly Compensation Across All 12 Calendar Months  |  Currency: NGN (₦)`],
    [],
    [
      'S/N',
      'Staff Code',
      'Full Name',
      'Department',
      'Position',
      'Jan (₦)',
      'Feb (₦)',
      'Mar (₦)',
      'Apr (₦)',
      'May (₦)',
      'Jun (₦)',
      'Jul (₦)',
      'Aug (₦)',
      'Sep (₦)',
      'Oct (₦)',
      'Nov (₦)',
      'Dec (₦)',
      'Annual Total (₦)',
      'Monthly Avg (₦)',
    ]
  ];

  const headerRowIdx = 5;

  employees.forEach((emp, index) => {
    const rowNum = headerRowIdx + 1 + index;
    const monthVals = MONTHS.map(m => getEmployeeGrossForPeriod(emp, m.key, year));
    const sum = monthVals.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / 12) * 100) / 100;

    if (includeFormulas) {
      aoa.push([
        index + 1,
        emp.code,
        `${emp.firstName} ${emp.lastName}`.trim(),
        emp.department,
        emp.position,
        ...monthVals.map(val => ({ t: 'n', v: val, z: CURRENCY_FORMAT })),
        { t: 'n', f: `SUM(F${rowNum}:Q${rowNum})`, v: sum, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(AVERAGE(F${rowNum}:Q${rowNum}), 2)`, v: avg, z: CURRENCY_FORMAT },
      ]);
    } else {
      aoa.push([
        index + 1,
        emp.code,
        `${emp.firstName} ${emp.lastName}`.trim(),
        emp.department,
        emp.position,
        ...monthVals.map(val => ({ t: 'n', v: val, z: CURRENCY_FORMAT })),
        { t: 'n', v: sum, z: CURRENCY_FORMAT },
        { t: 'n', v: avg, z: CURRENCY_FORMAT },
      ]);
    }
  });

  // Annual Totals Row
  const startRow = headerRowIdx + 1;
  const endRow = headerRowIdx + employees.length;
  if (employees.length > 0) {
    const monthTotals = MONTHS.map(m => {
      return employees.reduce((s, emp) => s + getEmployeeGrossForPeriod(emp, m.key, year), 0);
    });
    const grandAnnualTotal = monthTotals.reduce((a, b) => a + b, 0);
    const grandMonthlyAvg = Math.round((grandAnnualTotal / 12) * 100) / 100;

    if (includeFormulas) {
      aoa.push([
        '',
        '',
        'MONTHLY TOTALS',
        '',
        '',
        { t: 'n', f: `SUBTOTAL(109, F${startRow}:F${endRow})`, v: monthTotals[0], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, G${startRow}:G${endRow})`, v: monthTotals[1], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, H${startRow}:H${endRow})`, v: monthTotals[2], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, I${startRow}:I${endRow})`, v: monthTotals[3], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, J${startRow}:J${endRow})`, v: monthTotals[4], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, K${startRow}:K${endRow})`, v: monthTotals[5], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, L${startRow}:L${endRow})`, v: monthTotals[6], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, M${startRow}:M${endRow})`, v: monthTotals[7], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, N${startRow}:N${endRow})`, v: monthTotals[8], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, O${startRow}:O${endRow})`, v: monthTotals[9], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, P${startRow}:P${endRow})`, v: monthTotals[10], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, Q${startRow}:Q${endRow})`, v: monthTotals[11], z: CURRENCY_FORMAT },
        { t: 'n', f: `SUBTOTAL(109, R${startRow}:R${endRow})`, v: grandAnnualTotal, z: CURRENCY_FORMAT },
        { t: 'n', f: `ROUND(R${endRow + 1}/12, 2)`, v: grandMonthlyAvg, z: CURRENCY_FORMAT },
      ]);
    } else {
      aoa.push([
        '',
        '',
        'MONTHLY TOTALS',
        '',
        '',
        ...monthTotals.map(val => ({ t: 'n', v: val, z: CURRENCY_FORMAT })),
        { t: 'n', v: grandAnnualTotal, z: CURRENCY_FORMAT },
        { t: 'n', v: grandMonthlyAvg, z: CURRENCY_FORMAT },
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 5 }];
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 12 }, // Code
    { wch: 25 }, // Name
    { wch: 18 }, // Dept
    { wch: 20 }, // Role
    ...MONTHS.map(() => ({ wch: 16 })), // 12 Months
    { wch: 20 }, // Total
    { wch: 18 }, // Avg
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * 8. MASTER STAFF DATABASE TAB
 * Clean tabular employee records for round-trip synchronization and re-importing.
 */
function createStaffDatabaseSheet(employees: Employee[]): XLSX.WorkSheet {
  const rows = employees.map(e => ({
    'Employee Code': e.code,
    'First Name': e.firstName,
    'Last Name': e.lastName,
    'Department': e.department,
    'Position': e.position,
    'Employment Type': e.employmentType || 'Full-Time',
    'Monthly Gross': e.monthlyGross,
    'Annual Rent': e.annualRent || 0,
    'Bank Name': e.bankName,
    'Account Number': e.accountNumber,
    'Pension Active': e.hasPension ? 'YES' : 'NO',
    'PAYE Active': e.hasPaye ? 'YES' : 'NO',
    'PAYE / Tax ID': e.payeNumber || '',
    'Pension RSA PIN': e.pensionNumber || '',
    'PFA Name': e.pfaName || '',
    'Email': e.email || '',
    'Phone': e.phone || '',
    'Status': e.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, // Code
    { wch: 16 }, // First Name
    { wch: 16 }, // Last Name
    { wch: 18 }, // Dept
    { wch: 22 }, // Role
    { wch: 16 }, // Employment Type
    { wch: 18 }, // Gross
    { wch: 14 }, // Rent
    { wch: 18 }, // Bank
    { wch: 18 }, // Account Number
    { wch: 14 }, // Pension Active
    { wch: 14 }, // PAYE Active
    { wch: 20 }, // Tax ID
    { wch: 20 }, // RSA PIN
    { wch: 26 }, // PFA
    { wch: 24 }, // Email
    { wch: 16 }, // Phone
    { wch: 12 }, // Status
  ];

  return styleWorksheetCorporate(ws);
}

/**
 * Generates and downloads a pre-populated, formatted Staff Import Template.
 */
export function downloadExcelImportTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Template Sheet with pre-filled sample rows
  const sampleData = [
    {
      'Employee Code': 'EMP-001',
      'First Name': 'OLAWALE',
      'Last Name': 'OGUNLEYE',
      'Department': 'ENGINEERING',
      'Position': 'Project Lead',
      'Employment Type': 'Full-Time',
      'Monthly Gross / Net Pay': 350000,
      'Annual Rent': 800000,
      'Bank Name': 'ACCESS BANK',
      'Account Number': '0123456789',
      'Pension Active': 'YES',
      'PAYE Active': 'YES',
      'PAYE / Tax ID': 'PAYE-LAS-0019284',
      'Pension RSA PIN': 'PEN10082736452',
      'PFA Name': 'Stanbic IBTC Pension Managers',
      'Email': 'olawale@example.com',
      'Phone': '+234 803 123 4567',
      'Status': 'Active',
    },
    {
      'Employee Code': 'EMP-002',
      'First Name': 'CHINWE',
      'Last Name': 'OKAFOR',
      'Department': 'FINANCE & ACCOUNTS',
      'Position': 'Financial Accountant',
      'Employment Type': 'Full-Time',
      'Monthly Gross / Net Pay': 280000,
      'Annual Rent': 600000,
      'Bank Name': 'GTBANK',
      'Account Number': '0234567890',
      'Pension Active': 'YES',
      'PAYE Active': 'YES',
      'PAYE / Tax ID': 'PAYE-LAS-0028471',
      'Pension RSA PIN': 'PEN10091827364',
      'PFA Name': 'ARM Pension Managers',
      'Email': 'chinwe@example.com',
      'Phone': '+234 805 234 5678',
      'Status': 'Active',
    },
    {
      'Employee Code': 'EMP-003',
      'First Name': 'EMMANUEL',
      'Last Name': 'BELLO',
      'Department': 'LOGISTICS',
      'Position': 'Logistics Contractor',
      'Employment Type': 'Contract',
      'Monthly Gross / Net Pay': 220000,
      'Annual Rent': 0,
      'Bank Name': 'ZENITH BANK',
      'Account Number': '1012345678',
      'Pension Active': 'NO',
      'PAYE Active': 'NO',
      'PAYE / Tax ID': '',
      'Pension RSA PIN': '',
      'PFA Name': '',
      'Email': 'emmanuel@example.com',
      'Phone': '+234 807 345 6789',
      'Status': 'Active',
    },
    {
      'Employee Code': 'EMP-004',
      'First Name': 'TOLULOPE',
      'Last Name': 'ADE',
      'Department': 'OPERATIONS',
      'Position': 'Part-Time Clerk',
      'Employment Type': 'Part-Time',
      'Monthly Gross / Net Pay': 120000,
      'Annual Rent': 0,
      'Bank Name': 'FIRST BANK',
      'Account Number': '3012948571',
      'Pension Active': 'NO',
      'PAYE Active': 'NO',
      'PAYE / Tax ID': '',
      'Pension RSA PIN': '',
      'PFA Name': '',
      'Email': 'tolulope@example.com',
      'Phone': '+234 809 998 7766',
      'Status': 'Active',
    }
  ];

  const wsTemplate = XLSX.utils.json_to_sheet(sampleData);
  wsTemplate['!cols'] = [
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 26 },
    { wch: 24 },
    { wch: 18 },
    { wch: 12 },
  ];
  styleWorksheetCorporate(wsTemplate);
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Staff_Import_Template');

  // 2. Field Guidelines Sheet
  const instructions = [
    { 'Field / Column': 'Employee Code', 'Required?': 'Recommended', 'Format & Rules': 'Unique staff identifier (e.g. EMP-001, PR-104). Auto-generated if blank.' },
    { 'Field / Column': 'First Name', 'Required?': 'YES', 'Format & Rules': 'Staff first name.' },
    { 'Field / Column': 'Last Name', 'Required?': 'YES', 'Format & Rules': 'Staff surname / family name.' },
    { 'Field / Column': 'Department', 'Required?': 'Optional', 'Format & Rules': 'Operational department (e.g. OPERATIONS, FINANCE, ADMIN, ENGINEERING).' },
    { 'Field / Column': 'Position', 'Required?': 'Optional', 'Format & Rules': 'Designation or job title (e.g. Supervisor, Manager, Specialist).' },
    { 'Field / Column': 'Employment Type', 'Required?': 'Recommended', 'Format & Rules': '"Full-Time", "Part-Time", "Contract", or "Intern / NYSC". Full-Time pays PAYE and Pension; Contract & Part-Time are exempt by default.' },
    { 'Field / Column': 'Monthly Gross / Net Pay', 'Required?': 'YES', 'Format & Rules': 'Monthly salary amount in Naira (e.g. 250000). Enter numbers only.' },
    { 'Field / Column': 'Annual Rent', 'Required?': 'Optional', 'Format & Rules': 'Annual rent paid by employee. Enables Nigerian 20% CRA rent relief.' },
    { 'Field / Column': 'Bank Name', 'Required?': 'Recommended', 'Format & Rules': 'Nigerian commercial or digital bank (e.g. Access Bank, GTBank, Zenith, OPay).' },
    { 'Field / Column': 'Account Number', 'Required?': 'Recommended', 'Format & Rules': '10-digit NUBAN account number. Keep formatted as text so zeroes are not lost.' },
    { 'Field / Column': 'Pension Active', 'Required?': 'Optional', 'Format & Rules': '"YES" or "NO". Defaults to YES for Full-Time, NO for Contract/Part-Time.' },
    { 'Field / Column': 'PAYE Active', 'Required?': 'Optional', 'Format & Rules': '"YES" or "NO". Defaults to YES for Full-Time, NO for Contract/Part-Time.' },
    { 'Field / Column': 'PAYE / Tax ID', 'Required?': 'Optional', 'Format & Rules': 'State IRS Taxpayer Registration ID (e.g. PAYE-LAS-00123).' },
    { 'Field / Column': 'Pension RSA PIN', 'Required?': 'Optional', 'Format & Rules': 'Retirement Savings Account PIN (e.g. PEN1002938475).' },
    { 'Field / Column': 'PFA Name', 'Required?': 'Optional', 'Format & Rules': 'Pension Fund Administrator (e.g. Stanbic IBTC, Access Pensions, ARM).' },
    { 'Field / Column': 'Email', 'Required?': 'Optional', 'Format & Rules': 'Official or personal email address.' },
    { 'Field / Column': 'Phone', 'Required?': 'Optional', 'Format & Rules': 'Phone number with country code (e.g. +234 803 000 0000).' },
    { 'Field / Column': 'Status', 'Required?': 'Optional', 'Format & Rules': '"Active" or "Inactive". Defaults to Active.' },
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 60 }];
  styleWorksheetCorporate(wsInstructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions_Guide');

  XLSX.writeFile(wb, 'Payroll_Pro_Staff_Import_Template.xlsx');
}

/**
 * Parses staff records from an Excel or CSV file.
 * Automatically handles exported workbooks, templates, and raw HR spreadsheets.
 */
export async function parseEmployeesFromExcel(file: File): Promise<{
  employees: Partial<Employee>[];
  errors: string[];
  sheetName: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Auto-detect optimal sheet: Staff_Import_Template -> Staff_Database -> Payroll_Register -> Employees -> 1st sheet
        const sheetCandidates = ['Staff_Import_Template', 'Staff_Database', 'Staff Database', 'Payroll_Register', 'Employees', 'Master Payroll'];
        let chosenSheet = wb.SheetNames[0];
        for (const candidate of sheetCandidates) {
          if (wb.SheetNames.includes(candidate)) {
            chosenSheet = candidate;
            break;
          }
        }

        const worksheet = wb.Sheets[chosenSheet];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const employees: Partial<Employee>[] = [];
        const errors: string[] = [];

        rawRows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const firstName = row['First Name'] || row['firstName'] || row['Firstname'] || row['FIRST NAME'] || '';
          const lastName = row['Last Name'] || row['lastName'] || row['Surname'] || row['LAST NAME'] || row['SURNAME'] || '';
          const fullName = row['Full Name'] || row['fullName'] || row['Employee Name'] || row['Staff Name'] || '';
          
          let parsedFirst = String(firstName).trim();
          let parsedLast = String(lastName).trim();

          // If first and last are combined in Full Name
          if (!parsedFirst && !parsedLast && fullName) {
            const parts = String(fullName).trim().split(/\s+/);
            parsedFirst = parts[0] || 'Staff';
            parsedLast = parts.slice(1).join(' ') || '';
          }

          if (!parsedFirst && !parsedLast) {
            errors.push(`Row ${rowNum}: Skipped row because employee name is missing.`);
            return;
          }

          const code = row['Employee Code'] || row['code'] || row['Staff ID'] || row['Staff Code'] || `EMP-${100 + idx}`;
          const gross = Number(
            row['Monthly Gross / Net Pay'] || 
            row['Monthly Gross (NGN)'] || 
            row['Monthly Gross (₦)'] ||
            row['Monthly Gross'] || 
            row['monthlyGross'] || 
            row['Salary'] || 
            row['Gross Salary'] || 
            row['Net Pay'] ||
            0
          );

          // Clean account number as text to preserve leading zero
          let accNum = String(row['Account Number'] || row['accountNumber'] || row['NUBAN'] || '0000000000').trim();
          if (accNum.length < 10 && /^\d+$/.test(accNum)) {
            accNum = accNum.padStart(10, '0');
          }

          const rawType = row['Employment Type'] || row['employmentType'] || row['Type'] || row['Classification'] || 'Full-Time';
          const cleanType = String(rawType).trim();
          const isContractOrPart = cleanType.toLowerCase() === 'contract' || cleanType.toLowerCase() === 'part-time';

          employees.push({
            code: String(code).trim(),
            firstName: parsedFirst,
            lastName: parsedLast,
            department: String(row['Department'] || row['department'] || 'General').trim().toUpperCase(),
            position: String(row['Position'] || row['position'] || row['Role'] || row['Designation'] || 'Staff').trim(),
            employmentType: cleanType,
            monthlyGross: gross > 0 ? gross : 150000,
            annualRent: Number(row['Annual Rent'] || row['Annual Rent (NGN)'] || row['annualRent'] || row['Rent'] || 0),
            bankName: String(row['Bank Name'] || row['bankName'] || 'Access Bank').trim(),
            accountNumber: accNum,
            hasPension: row['Pension Active'] !== undefined 
              ? String(row['Pension Active']).toUpperCase() === 'YES' 
              : !isContractOrPart,
            hasPaye: row['PAYE Active'] !== undefined 
              ? String(row['PAYE Active']).toUpperCase() === 'YES' 
              : !isContractOrPart,
            payeNumber: String(row['PAYE / Tax ID'] || row['Tax ID'] || row['PAYE No'] || row['PAYE Number'] || row['payeNumber'] || '').trim(),
            pensionNumber: String(row['Pension RSA PIN'] || row['RSA PIN'] || row['Pension Number'] || row['pensionNumber'] || '').trim(),
            pfaName: String(row['PFA Name'] || row['PFA Administrator'] || row['PFA'] || row['pfaName'] || '').trim(),
            email: String(row['Email'] || '').trim(),
            phone: String(row['Phone'] || '').trim(),
            status: String(row['Status'] || '').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
          });
        });

        resolve({ employees, errors, sheetName: chosenSheet });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
