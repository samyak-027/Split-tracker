import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import AddExpenseForm from "../components/AddExpenseForm";
import DateRangeExport from "../components/DateRangeExport";
import {
  Plus,
  Check,
  ArrowRight,
  Trash2,
  Pencil,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Users
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import StatementMonthSelect, { isInMonth } from "../components/StatementMonthSelect";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [settlementToCreate, setSettlementToCreate] = useState<{ amount: number; paidTo: string; name: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [mobileBalancesOpen, setMobileBalancesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statementMonth, setStatementMonth] = useState(format(new Date(), "yyyy-MM"));
  const [page, setPage] = useState(1);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberFilterOpen, setMemberFilterOpen] = useState(false);

  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const res = await api.get(`/groups/${id}`);
      return res.data;
    },
  });

  const { data: balancesData = { netBalances: {}, pairwise: [] } } = useQuery({
    queryKey: ["groupBalances", id],
    queryFn: async () => {
      const res = await api.get(`/groups/${id}/balances`);
      return res.data;
    },
  });

  const balances = balancesData.netBalances || {};
  const serverPairwise = balancesData.pairwise || [];

  const addExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/shared-expenses", {
        ...data,
        group: id,
        date: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      queryClient.invalidateQueries({ queryKey: ["groupBalances", id] });
      toast.success("Expense added");
      setShowAddExpense(false);
      setStatementMonth(format(new Date(), "yyyy-MM"));
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure we include the date field and preserve the original date if no new date is provided
      const updateData = {
        ...data,
        date: data.date || editingExpense.date || new Date(),
      };
      
      return api.put(`/shared-expenses/${editingExpense._id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      queryClient.invalidateQueries({ queryKey: ["groupBalances", id] });
      toast.success("Expense updated");
      setEditingExpense(null);
      setShowAddExpense(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Failed to update expense";
      toast.error(errorMessage);
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) =>
      api.delete(`/shared-expenses/${expenseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      queryClient.invalidateQueries({ queryKey: ["groupBalances", id] });
      toast.success("Expense deleted");
      setExpenseToDelete(null);
    },
  });

  const { data: pendingSettlements = [] } = useQuery({
    queryKey: ["pendingSettlements", id],
    queryFn: async () => {
      const res = await api.get("/settlements/pending");
      return res.data.filter((s: any) => s.group._id === id || s.group === id);
    },
  });

  const expenses = groupData?.expenses || [];
  const members = groupData?.members || [];
  const statementMonthExpenses = useMemo(
    () => expenses.filter((expense: any) => isInMonth(expense.date || expense.createdAt, statementMonth)),
    [expenses, statementMonth],
  );
  const statementTotal = statementMonthExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);

  const statementExpenses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return [...statementMonthExpenses]
      .filter((expense: any) => !normalizedSearch || [expense.title, expense.category]
        .some((value) => String(value || "").toLowerCase().includes(normalizedSearch)))
      .filter((expense: any) => !selectedMemberIds.length || selectedMemberIds.includes(expense.paidBy?._id || expense.paidBy))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [statementMonthExpenses, searchTerm, selectedMemberIds]);

  const totalPages = Math.max(1, Math.ceil(statementExpenses.length / 10));
  const paginatedExpenses = statementExpenses.slice((page - 1) * 10, page * 10);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statementMonth, selectedMemberIds]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const confirmSettlementMutation = useMutation({
    mutationFn: (settlementId: string) =>
      api.put(`/settlements/${settlementId}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupBalances", id] });
      queryClient.invalidateQueries({ queryKey: ["pendingSettlements", id] });
      toast.success("Settlement confirmed!");
    },
  });

  const settleMutation = useMutation({
    mutationFn: (data: any) => api.post("/settlements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingSettlements", id] });
      toast.success("Settlement recorded");
    },
  });

  // Group processing
  if (groupLoading)
    return (
      <div className="p-8 text-center text-base-content/60">Loading group...</div>
    );
  if (!groupData?.group)
    return (
      <div className="p-8 text-center text-base-content/60">Group not found.</div>
    );

  const group = groupData.group;
  const myBalance = balances[user.id] || 0;
  const groupMemberUsers = members.map((member: any) => member.user).filter(Boolean);

  const calculatePairwiseDebts = () => {
      const owesMap: Record<string, Record<string, number>> = {};
      
      for (const p of serverPairwise) {
          if (!owesMap[p.from]) owesMap[p.from] = {};
          owesMap[p.from][p.to] = p.amount;
      }

      for (const st of pendingSettlements) {
          const paidByStr = st.paidBy._id || st.paidBy;
          const paidToStr = st.paidTo._id || st.paidTo;
          if (!owesMap[paidByStr]) owesMap[paidByStr] = {};
          owesMap[paidByStr][paidToStr] = (owesMap[paidByStr][paidToStr] || 0) - st.amount;
      }

      const owes: { from: string, to: string, amount: number }[] = [];
      const processed = new Set<string>();

      for (const fromUser in owesMap) {
          for (const toUser in owesMap[fromUser]) {
              const key = fromUser < toUser ? `${fromUser}-${toUser}` : `${toUser}-${fromUser}`;
              if (processed.has(key)) continue;
              processed.add(key);

              const amountA = owesMap[fromUser]?.[toUser] || 0;
              const amountB = owesMap[toUser]?.[fromUser] || 0;

              const net = amountA - amountB;
              if (net > 0.01) {
                  owes.push({ from: fromUser, to: toUser, amount: Math.round(net * 100) / 100 });
              } else if (net < -0.01) {
                  owes.push({ from: toUser, to: fromUser, amount: Math.round(-net * 100) / 100 });
              }
          }
      }
      return owes;
  };

  const pairwiseOwes = calculatePairwiseDebts();
  const myOwes = pairwiseOwes.filter(o => o.from === user.id || o.to === user.id);

  const exportCSV = (startDate?: Date, endDate?: Date) => {
    if (!expenses || expenses.length === 0) return;
    
    const filteredExpenses = expenses.filter((e: any) => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(e.date || e.createdAt);
      if (startDate && expenseDate < startDate) return false;
      if (endDate && expenseDate > endDate) return false;
      return true;
    });
    
    const headers = ['Date', 'Title', 'Description', 'Amount', 'Paid By'];
    const rows = filteredExpenses.map((e: any) => [
        format(new Date(e.date || e.createdAt || new Date()), 'dd/MM/yyyy'),
        `"${e.title || 'Untitled'}"`,
        `"${e.description || ''}"`,
        Number(e.amount).toFixed(2), // Ensure it's a number
        `"${e.paidBy?.name || 'Unknown'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateRangeText = startDate && endDate ? `_${format(startDate, 'ddMMyyyy')}_to_${format(endDate, 'ddMMyyyy')}` : '';
    link.setAttribute('download', `group_${group.name.replace(/\s+/g, '_')}_expenses${dateRangeText}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportPDF = (startDate?: Date, endDate?: Date) => {
    if (!expenses || expenses.length === 0) return;
    
    const filteredExpenses = expenses.filter((e: any) => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(e.date || e.createdAt);
      if (startDate && expenseDate < startDate) return false;
      if (endDate && expenseDate > endDate) return false;
      return true;
    });
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    let title = `Group Expenses: ${group.name}`;
    if (startDate && endDate) {
      title += ` (${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')})`;
    } else if (startDate) {
      title += ` (From ${format(startDate, 'dd/MM/yyyy')})`;
    } else if (endDate) {
      title += ` (Until ${format(endDate, 'dd/MM/yyyy')})`;
    }
    doc.text(title, 14, 20);
    
    // Add group description if available
    if (group.description) {
      doc.setFontSize(10);
      doc.text(`Description: ${group.description}`, 14, 30);
    }
    
    // Expenses table
    const tableData = filteredExpenses.map((e: any) => [
        format(new Date(e.date || e.createdAt || new Date()), 'dd/MM/yyyy'),
        e.title || 'Untitled',
        e.description || '',
        `Rs.${Number(e.amount).toFixed(2)}`, // Using Rs. instead of ₹ for PDF compatibility
        e.paidBy?.name || 'Unknown'
    ]);
    
    autoTable(doc, {
        head: [['Date', 'Title', 'Description', 'Amount (Rs.)', 'Paid By']],
        body: tableData,
        startY: group.description ? 40 : 30,
        foot: [['', '', 'Total:', `Rs.${filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0).toFixed(2)}`, '']],
        footStyles: { 
            fontStyle: 'bold', 
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0] // Black text
        }
    });
    
    // Get the final Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    // Calculate individual spending breakdown from filtered expenses
    const spendingByPerson: Record<string, number> = {};
    filteredExpenses.forEach((e: any) => {
      const payerName = e.paidBy?.name || 'Unknown';
      spendingByPerson[payerName] = (spendingByPerson[payerName] || 0) + e.amount;
    });
    
    // Add individual spending section
    doc.setFontSize(14);
    doc.text('Individual Spending Breakdown:', 14, finalY + 20);
    
    let yPosition = finalY + 30;
    doc.setFontSize(10);
    
    Object.entries(spendingByPerson)
      .sort(([, a], [, b]) => b - a) // Sort by amount descending
      .forEach(([person, amount]) => {
        doc.text(`${person}: Rs.${amount.toFixed(2)}`, 20, yPosition);
        yPosition += 8;
      });
    
    const dateRangeText = startDate && endDate ? `_${format(startDate, 'ddMMyyyy')}_to_${format(endDate, 'ddMMyyyy')}` : '';
    doc.save(`group_${group.name.replace(/\s+/g, '_')}_expenses${dateRangeText}.pdf`);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-base-100 p-8 rounded-3xl shadow-sm border border-base-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-base-content">
                {group.name}
              </h1>
              <span className="bg-base-200 text-base-content/60 px-3 py-1 rounded-full text-xs font-mono tracking-widest">
                CODE: {group.joinCode}
              </span>
            </div>
            {group.description && (
              <p className="text-base-content/60">{group.description}</p>
            )}
            <p className="text-sm text-base-content/40 mt-2">
              {members.length} members
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => exportCSV()}
                className="bg-base-200 hover:bg-base-300 text-base-content px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FileText size={16} /> Export CSV
              </button>
              <button
                onClick={() => exportPDF()}
                className="bg-base-200 hover:bg-base-300 text-base-content px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export PDF
              </button>
              <DateRangeExport 
                expenses={expenses}
                onExportCSV={exportCSV}
                onExportPDF={exportPDF}
              />
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm text-base-content/60 mb-1">
              Your Total Balance
            </span>
            <span
              className={`text-3xl font-bold ${myBalance > 0 ? "text-success" : myBalance < 0 ? "text-error" : "text-base-content"}`}
            >
              {myBalance > 0 ? "+" : ""}₹{myBalance.toFixed(2)}
            </span>
            <span className="text-xs text-base-content/40 mt-1">
              {myBalance > 0
                ? "You Get"
                : myBalance < 0
                  ? "You Pay"
                  : "Settled up"}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Balance Summary - Shows above expenses on mobile */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setMobileBalancesOpen(!mobileBalancesOpen)}
          className="w-full bg-base-100 p-4 rounded-2xl shadow-sm border border-base-300 flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-base-content">Your Balance & Actions</h3>
            <p className="text-sm text-base-content/60">
              {myBalance > 0 ? "+" : ""}₹{myBalance.toFixed(2)} • 
              {myOwes.filter(o => o.from === user.id).length > 0 ? 
                ` You owe ${myOwes.filter(o => o.from === user.id).length} people` : 
                myOwes.filter(o => o.to === user.id).length > 0 ?
                ` ${myOwes.filter(o => o.to === user.id).length} people owe you` :
                " All settled"
              }
            </p>
          </div>
          {mobileBalancesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {mobileBalancesOpen && (
          <div className="mt-3 space-y-3">
            {/* Quick Balance Overview */}
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${myBalance > 0 ? "text-success" : myBalance < 0 ? "text-error" : "text-base-content"}`}>
                    {myBalance > 0 ? "+" : ""}₹{myBalance.toFixed(2)}
                  </div>
                  <div className="text-xs text-base-content/40">
                    {myBalance > 0 ? "You Get" : myBalance < 0 ? "You Pay" : "Settled"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-base-content">
                    ₹{statementTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-base-content/40">{format(new Date(`${statementMonth}-01T00:00:00`), "MMM yyyy")} Spent</div>
                </div>
              </div>
            </div>

            {/* Your Balances */}
            {myOwes.length > 0 && (
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300">
                <div className="p-3 border-b border-base-300">
                  <h4 className="font-medium text-base-content">Your Balances ({myOwes.length})</h4>
                </div>
                <div className="divide-y divide-base-300">
                  {myOwes.map((owe, idx) => {
                    const isOwe = owe.from === user.id;
                    const otherUserId = isOwe ? owe.to : owe.from;
                    const otherUser = members.find((m: any) => m.user && m.user._id === otherUserId)?.user;
                    if (!otherUser) return null;
                    return (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/60">
                            {otherUser.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-base-content">{otherUser.name}</p>
                            <p className="text-xs text-base-content/60">{isOwe ? 'You Pay' : 'You Get'}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${isOwe ? "text-error" : "text-success"}`}>
                          ₹{owe.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Settle Actions */}
            {myOwes.filter(o => o.from === user.id).length > 0 && (
              <div className="bg-primary rounded-xl p-4 text-primary-content">
                <h4 className="font-medium mb-2">Quick Settle</h4>
                <div className="space-y-2">
                  {myOwes.filter(o => o.from === user.id).map((owe: any, idx: number) => {
                    const otherUser = members.find((m: any) => m.user && m.user._id === owe.to)?.user;
                    if (!otherUser) return null;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSettlementToCreate({ paidTo: otherUser._id, amount: owe.amount, name: otherUser.name })}
                        className="w-full bg-base-100/20 hover:bg-base-100/30 px-3 py-2 rounded-lg text-sm font-medium text-primary-content transition-colors text-left flex justify-between"
                      >
                        <span>Pay {otherUser.name}</span>
                        <span>₹{owe.amount.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Settlements */}
            {pendingSettlements.length > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-warning/20">
                      <h4 className="font-medium text-base-content">Pending Settlements</h4>
                  </div>
                  <div className="divide-y divide-warning/20">
                      {pendingSettlements.map((settlement: any) => {
                          const isReceiver = settlement.paidTo._id === user.id;
                          const otherPerson = isReceiver ? settlement.paidBy : settlement.paidTo;
                          return (
                              <div key={settlement._id} className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-base-content">
                                          {isReceiver ? `${otherPerson.name} paid you` : `You paid ${otherPerson.name}`}
                                      </span>
                                      <span className="text-xs font-bold text-warning">₹{settlement.amount.toFixed(2)}</span>
                                  </div>
                                  {isReceiver && (
                                      <button 
                                          onClick={() => confirmSettlementMutation.mutate(settlement._id)}
                                          disabled={confirmSettlementMutation.isPending}
                                          className="w-full bg-warning hover:bg-warning-focus text-warning-content py-1 px-2 rounded-lg text-xs font-medium transition-colors"
                                      >
                                          Confirm Received
                                      </button>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}

          </div>
        )}
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Expenses Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Group Expenses</h2>
            <button
              onClick={() => {
                if (showAddExpense || editingExpense) {
                  setShowAddExpense(false);
                  setEditingExpense(null);
                } else {
                  setShowAddExpense(true);
                }
              }}
              className="bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {showAddExpense || editingExpense ? (
                "Cancel"
              ) : (
                <>
                  <Plus size={16} /> Add Expense
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row xl:max-w-xl">
              <div className="relative w-full sm:max-w-sm">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search title or category"
                  className="w-full rounded-lg border border-base-300 bg-base-100 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMemberFilterOpen((isOpen) => !isOpen)}
                  aria-expanded={memberFilterOpen}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm font-medium text-base-content hover:bg-base-200 sm:w-48"
                >
                  <span className="flex items-center gap-2 truncate"><Users size={16} /> {selectedMemberIds.length ? `${selectedMemberIds.length} people selected` : "Filter by payer"}</span>
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${memberFilterOpen ? "rotate-180" : ""}`} />
                </button>
                {memberFilterOpen && (
                  <div className="absolute left-0 z-20 mt-2 w-full min-w-60 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl sm:w-72">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Paid by</p>
                      {selectedMemberIds.length > 0 && (
                        <button type="button" onClick={() => setSelectedMemberIds([])} className="text-xs font-medium text-primary hover:text-primary-focus">Clear</button>
                      )}
                    </div>
                    <div className="max-h-52 space-y-1 overflow-y-auto">
                      {groupMemberUsers.map((member: any) => {
                        const memberId = member._id;
                        return (
                          <label key={memberId} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-base-200">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(memberId)}
                              onChange={() => setSelectedMemberIds((current) => current.includes(memberId)
                                ? current.filter((id) => id !== memberId)
                                : [...current, memberId])}
                              className="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
                            />
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-base-200 text-xs font-bold text-base-content/60">{member.name.charAt(0)}</span>
                            <span className="truncate text-base-content">{member._id === user.id ? "You" : member.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <StatementMonthSelect
              value={statementMonth}
              onChange={setStatementMonth}
              dates={expenses.map((expense: any) => expense.date || expense.createdAt)}
            />
          </div>

          {(showAddExpense || editingExpense) && (
            <AddExpenseForm
              key={editingExpense?._id || "new"}
              members={members}
              user={user}
              onCancel={() => {
                setShowAddExpense(false);
                setEditingExpense(null);
              }}
              onSubmit={(d) => {
                if (editingExpense) {
                  updateExpenseMutation.mutate(d);
                } else {
                  addExpenseMutation.mutate(d);
                }
              }}
              isLoading={
                addExpenseMutation.isPending || updateExpenseMutation.isPending
              }
              initialData={editingExpense}
            />
          )}

          <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden divide-y divide-base-300">
            {statementExpenses.length === 0 ? (
              <div className="p-8 text-center text-base-content/60">
                No expenses in this statement month.
              </div>
            ) : (
              <>
              {paginatedExpenses.map((exp: any) => (
                <div
                  key={exp._id}
                  className="p-5 hover:bg-base-200/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-base-200 rounded-xl text-base-content/60 text-center leading-none">
                        <div className="text-xs uppercase">
                          {format(new Date(exp.date), "MMM")}
                        </div>
                        <div className="text-lg font-bold text-base-content">
                          {format(new Date(exp.date), "dd")}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-base-content">
                          {exp.title}
                        </h3>
                        <p className="text-sm text-base-content/60">
                          Paid by{" "}
                          <span className="font-medium text-base-content/80">
                            {exp.paidBy?.name === user.name
                              ? "You"
                              : exp.paidBy?.name}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-base-content">
                          ₹{exp.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-base-content/60">
                          {exp.splitType.replace("_", " ")} Split
                        </p>
                      </div>
                      {exp.paidBy?._id === user.id && (
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setShowAddExpense(false);
                              }}
                              className="text-base-content/40 hover:text-primary transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setExpenseToDelete(exp._id)}
                              className="text-base-content/40 hover:text-error transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                      )}
                    </div>
                  </div>

                  {/* Money Flow Visualization */}
                  <div className="ml-0 sm:ml-16 sm:mr-4 bg-base-200 p-4 rounded-xl border border-base-300">
                    <p className="text-xs font-semibold text-base-content/60 tracking-wider uppercase mb-3">
                      Money Flow
                    </p>
                    <div className="space-y-2">
                      {exp.splits
                        ?.filter(
                          (s: any) => s.user && s.user._id !== exp.paidBy?._id,
                        )
                        .map((split: any) => (
                          <div
                            key={split._id}
                            className="flex items-center text-sm"
                          >
                            <span className="font-medium text-base-content/80 w-24 truncate">
                              {split.user._id === user.id
                                ? "You"
                                : split.user.name}
                            </span>
                            <span className="text-base-content/40 mx-2 text-xs">
                              to pay
                            </span>
                            <span className="font-medium text-success w-16">
                              ₹{split.amountOwed.toFixed(2)}
                            </span>
                            <ArrowRight
                              size={14}
                              className="text-base-content/30 mx-2"
                            />
                            <span className="font-medium text-base-content/80">
                              {exp.paidBy?._id === user.id
                                ? "You"
                                : exp.paidBy?.name}
                            </span>
                          </div>
                        ))}
                      {(exp.splits?.filter(
                        (s: any) => s.user && s.user._id !== exp.paidBy?._id,
                      ) || []).length === 0 && (
                        <p className="text-sm text-base-content/60 italic">
                          Paid entirely for themselves.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Pagination currentPage={page} totalItems={statementExpenses.length} onPageChange={setPage} />
              </>
            )}
          </div>
        </div>

        {/* Right: Balances & Settlement - Desktop Only */}
        <div className="hidden lg:block space-y-6">
          <h2 className="text-xl font-bold">Your Balances</h2>

          <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden divide-y divide-base-300">
            {myOwes.length === 0 ? (
                <div className="p-5 text-center text-base-content/60">You are all settled up!</div>
            ) : (
                myOwes.map((owe, idx) => {
                    const isOwe = owe.from === user.id;
                    const otherUserId = isOwe ? owe.to : owe.from;
                    const otherUser = members.find((m: any) => m.user && m.user._id === otherUserId)?.user;
                    if (!otherUser) return null;
                    return (
                      <div
                        key={idx}
                        className="p-5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center font-bold text-base-content/60">
                            {otherUser.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-base-content">
                              {otherUser.name}
                            </p>
                            <p className="text-xs text-base-content/60">
                              {isOwe ? 'You Pay' : 'You Get'}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-right font-bold ${isOwe ? "text-error" : "text-success"}`}
                        >
                          ₹{owe.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                })
            )}
          </div>

          {pendingSettlements.length > 0 && (
              <div className="bg-warning/10 rounded-2xl p-6 border border-warning/30 shadow-sm">
                <h3 className="font-bold text-base-content mb-3 flex items-center gap-2">
                  <Check size={18} /> Pending Settlements
                </h3>
                <div className="space-y-3">
                  {pendingSettlements.map((settlement: any) => {
                    const isReceiver = settlement.paidTo._id === user.id;
                    const otherPerson = isReceiver ? settlement.paidBy : settlement.paidTo;
                    return (
                        <div key={settlement._id} className="flex flex-col gap-2 p-3 bg-base-100  rounded-xl border border-warning/20 ">
                           <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-base-content ">
                                  {isReceiver ? `${otherPerson.name} paid you` : `You paid ${otherPerson.name}`}
                              </span>
                              <span className="font-bold text-warning ">₹{settlement.amount.toFixed(2)}</span>
                           </div>
                           {isReceiver ? (
                               <button 
                                  onClick={() => confirmSettlementMutation.mutate(settlement._id)}
                                  disabled={confirmSettlementMutation.isPending}
                                  className="w-full mt-2 bg-warning hover:bg-warning/80 text-warning-content py-1.5 rounded-lg text-sm font-medium transition-colors"
                               >
                                  Confirm Received
                               </button>
                           ) : (
                               <span className="text-xs text-base-content/60 text-center block mt-1">Waiting for {otherPerson.name} to confirm</span>
                           )}
                        </div>
                    );
                  })}
                </div>
              </div>
          )}

          {/* Settlement Demo */}
          <div className="bg-primary rounded-2xl p-6 text-primary-content shadow-md">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Check size={18} /> Settle Debts
            </h3>
            <p className="text-sm text-primary-content/80 mb-4">
              Click below to record a payment to settle an existing balance.
            </p>

            <div className="space-y-2">
              {myOwes
                .filter(o => o.from === user.id)
                .map((owe: any, idx: number) => {
                  const otherUser = members.find((m: any) => m.user && m.user._id === owe.to)?.user;
                  if (!otherUser) return null;
                  return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSettlementToCreate({
                          paidTo: otherUser._id,
                          amount: owe.amount,
                          name: otherUser.name,
                      });
                    }}
                    className="w-full bg-base-100/20 hover:bg-base-100/30 px-4 py-2 rounded-lg text-sm font-medium text-primary-content transition-colors text-left flex justify-between"
                  >
                    <span>Pay {otherUser.name}</span>
                    <span>₹{owe.amount.toFixed(2)}</span>
                  </button>
                )})}
              {myOwes.filter(o => o.from === user.id).length === 0 && (
                <p className="text-sm opacity-80 text-center italic">
                  No debts to settle right now.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!expenseToDelete}
        title="Delete Shared Expense"
        message="Are you sure you want to delete this shared expense? This will also remove the calculated splits from everyone's balance."
        onConfirm={() =>
          expenseToDelete && deleteExpenseMutation.mutate(expenseToDelete)
        }
        onCancel={() => setExpenseToDelete(null)}
        isLoading={deleteExpenseMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!settlementToCreate}
        title="Record Payment"
        message={`Record payment to ${settlementToCreate?.name}? This will mark the settlement as pending until they confirm.`}
        onConfirm={() => {
          if (settlementToCreate) {
            settleMutation.mutate({
              group: id,
              paidTo: settlementToCreate.paidTo,
              amount: settlementToCreate.amount,
            });
            setSettlementToCreate(null);
          }
        }}
        onCancel={() => setSettlementToCreate(null)}
        isLoading={settleMutation.isPending}
      />
    </div>
  );
}
