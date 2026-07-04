import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];

export default function Analytics() {
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await api.get('/expenses');
      return res.data;
    }
  });

  // Calculate category distribution
  const categoryData = expenses.reduce((acc: any, curr: any) => {
      const existing = acc.find((item: any) => item.name === curr.category);
      if (existing) {
          existing.value += curr.amount;
      } else {
          acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-slate-500 text-sm">Visualize your spending patterns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Distribution */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-6">Expense by Category</h2>
              {isLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-500">Loading chart...</div>
              ) : categoryData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-500">No data available</div>
              ) : (
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie
                               data={categoryData}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                             >
                               {categoryData.map((_: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                             </Pie>
                             <Tooltip 
                                formatter={(value: number) => `₹${value.toFixed(2)}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             />
                         </PieChart>
                      </ResponsiveContainer>
                  </div>
              )}
              {/* Legend manually */}
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {categoryData.map((item: any, i: number) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                          <span className="truncate">{item.name}</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Monthly Trend Example (Mocked area chart for visual) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-6">Cashflow Trend</h2>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                          { name: 'Week 1', expense: 4000, income: 8400 },
                          { name: 'Week 2', expense: 3000, income: 1398 },
                          { name: 'Week 3', expense: 2000, income: 9800 },
                          { name: 'Week 4', expense: 2780, income: 3908 },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={40} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="expense" stackId="2" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
}
