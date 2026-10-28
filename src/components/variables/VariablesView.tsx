import React, { useState } from 'react';
import { Sliders, Plus, Trash2, RotateCcw, Save, Check } from 'lucide-react';
import { PayrollVariables, PayeTaxVariables, TaxBracket } from '../../types';
import { DEFAULT_PAYROLL_VARIABLES, DEFAULT_PAYE_VARIABLES, formatNaira } from '../../engine/payePensionEngine';

interface VariablesViewProps {
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  onUpdatePayrollVariables: (v: Partial<PayrollVariables>) => void;
  onUpdatePayeTaxVariables: (v: Partial<PayeTaxVariables>) => void;
}

export const VariablesView: React.FC<VariablesViewProps> = ({
  payrollVariables,
  payeTaxVariables,
  onUpdatePayrollVariables,
  onUpdatePayeTaxVariables
}) => {
  const [pv, setPv] = useState<PayrollVariables>(payrollVariables);
  const [tv, setTv] = useState<PayeTaxVariables>(payeTaxVariables);
  const [savedMessage, setSavedMessage] = useState(false);

  const percentageSum = pv.basic + pv.housing + pv.transport + pv.otherAllowances;
  const isPercentageValid = percentageSum === 100;

  const handleSave = () => {
    if (!isPercentageValid) {
      alert('Allowances percentage sum must equal exactly 100%');
      return;
    }
    onUpdatePayrollVariables(pv);
    onUpdatePayeTaxVariables(tv);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all payroll variables and tax brackets to Nigerian statutory defaults?')) {
      setPv(DEFAULT_PAYROLL_VARIABLES);
      setTv(DEFAULT_PAYE_VARIABLES);
      onUpdatePayrollVariables(DEFAULT_PAYROLL_VARIABLES);
      onUpdatePayeTaxVariables(DEFAULT_PAYE_VARIABLES);
    }
  };

  const handleAddBracket = () => {
    const newId = `tier_${Date.now()}`;
    const newBracket: TaxBracket = {
      id: newId,
      rate: 0.25,
      upTo: null,
      label: 'Additional Tax Tier'
    };
    setTv({
      ...tv,
      taxBrackets: [...tv.taxBrackets, newBracket]
    });
  };

  const handleRemoveBracket = (id: string) => {
    if (tv.taxBrackets.length <= 1) {
      alert('You must have at least one tax bracket tier.');
      return;
    }
    setTv({
      ...tv,
      taxBrackets: tv.taxBrackets.filter(b => b.id !== id)
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Payroll Variables & Statutory Configuration
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure Nigerian emoluments breakdown, pension contribution rates, and PITA tax brackets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-none"
          >
            {savedMessage ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedMessage ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Salary Breakdown Percentages */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              1. Monthly Gross Emoluments Split
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Standard Nigerian distribution of monthly gross remuneration (must sum to exactly 100%)
            </p>
          </div>
          <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
            isPercentageValid 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700' 
              : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
          }`}>
            Total: {percentageSum}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Basic Salary (%)</label>
            <input
              type="number"
              step="any"
              value={pv.basic}
              onChange={e => setPv({ ...pv, basic: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Housing Allowance (%)</label>
            <input
              type="number"
              step="any"
              value={pv.housing}
              onChange={e => setPv({ ...pv, housing: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Transport Allowance (%)</label>
            <input
              type="number"
              step="any"
              value={pv.transport}
              onChange={e => setPv({ ...pv, transport: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Other Allowances (%)</label>
            <input
              type="number"
              step="any"
              value={pv.otherAllowances}
              onChange={e => setPv({ ...pv, otherAllowances: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Pension & Employer Statutory Rates */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          2. Statutory Pension Rates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Employee Pension Rate (%)</label>
            <input
              type="number"
              step="any"
              value={pv.employeePensionRate}
              onChange={e => setPv({ ...pv, employeePensionRate: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Standard PRA rate: 8% on BHT</span>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Employer Pension Rate (%)</label>
            <input
              type="number"
              step="any"
              value={pv.employerPensionRate}
              onChange={e => setPv({ ...pv, employerPensionRate: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Mandatory company rate: 10% on BHT</span>
          </div>
        </div>
      </div>

      {/* Section 3: CRA & Rent Relief */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          3. Consolidated Relief Allowance (CRA) & Rent Relief
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Statutory CRA Base (₦)</label>
            <input
              type="number"
              step="any"
              value={tv.craBase}
              onChange={e => setTv({ ...tv, craBase: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Default: ₦800,000 statutory allowance</span>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Rent Relief Rate (%)</label>
            <input
              type="number"
              step="any"
              value={tv.rentReliefRate * 100}
              onChange={e => setTv({ ...tv, rentReliefRate: Number(e.target.value) / 100 })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Standard percentage: 20% of rent paid</span>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Rent Relief Statutory Cap (₦)</label>
            <input
              type="number"
              step="any"
              value={tv.rentReliefCap}
              onChange={e => setTv({ ...tv, rentReliefCap: Number(e.target.value) })}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Ceiling limit: ₦500,000 maximum</span>
          </div>
        </div>
      </div>

      {/* Section 4: Dynamic Progressive Tax Brackets */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              4. Progressive Graduated Tax Brackets
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Nigerian Personal Income Tax Act (PITA) graduated marginal tax brackets
            </p>
          </div>
          <button
            onClick={handleAddBracket}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bracket Tier</span>
          </button>
        </div>

        <div className="space-y-2">
          {tv.taxBrackets.map((bracket, index) => (
            <div key={bracket.id} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
              <span className="w-5 h-5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center text-[10px] font-mono">
                {index + 1}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  value={bracket.label}
                  onChange={e => {
                    const updated = tv.taxBrackets.map(b => b.id === bracket.id ? { ...b, label: e.target.value } : b);
                    setTv({ ...tv, taxBrackets: updated });
                  }}
                  className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  placeholder="Bracket Label"
                />
              </div>
              <div className="w-44">
                <input
                  type="number"
                  step="any"
                  placeholder="Unbounded (Top Tier)"
                  value={bracket.upTo === null ? '' : bracket.upTo}
                  onChange={e => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    const updated = tv.taxBrackets.map(b => b.id === bracket.id ? { ...b, upTo: val } : b);
                    setTv({ ...tv, taxBrackets: updated });
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="w-20">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={bracket.rate * 100}
                    onChange={e => {
                      const updated = tv.taxBrackets.map(b => b.id === bracket.id ? { ...b, rate: Number(e.target.value) / 100 } : b);
                      setTv({ ...tv, taxBrackets: updated });
                    }}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs text-zinc-500 font-mono">%</span>
                </div>
              </div>
              <button
                onClick={() => handleRemoveBracket(bracket.id)}
                className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Remove Bracket"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
