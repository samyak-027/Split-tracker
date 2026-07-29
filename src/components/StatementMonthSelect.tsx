import { format, isValid, parse } from 'date-fns';

interface StatementMonthSelectProps {
  value: string;
  onChange: (month: string) => void;
  dates: Array<string | Date | undefined | null>;
  className?: string;
}

export const monthKey = (date: string | Date) => format(new Date(date), 'yyyy-MM');

export const isInMonth = (date: string | Date, month: string) => monthKey(date) === month;

export default function StatementMonthSelect({ value, onChange, dates, className = '' }: StatementMonthSelectProps) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const months = Array.from(new Set([
    currentMonth,
    ...dates
      .filter((date): date is string | Date => Boolean(date) && isValid(new Date(date as string | Date)))
      .map((date) => monthKey(date)),
  ])).sort((a, b) => b.localeCompare(a));

  return (
    <label className={`flex items-center gap-2 text-sm text-base-content/70 ${className}`}>
      <span className="whitespace-nowrap">Statement</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy')}
          </option>
        ))}
      </select>
    </label>
  );
}
