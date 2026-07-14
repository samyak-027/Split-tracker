import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import AddExpenseForm from "../components/AddExpenseForm";
import {
  Plus,
  Check,
  ArrowRight,
  Trash2,
  Pencil,
  Download,
  FileText
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
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
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.put(`/shared-expenses/${editingExpense._id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      queryClient.invalidateQueries({ queryKey: ["groupBalances", id] });
      toast.success("Expense updated");
      setEditingExpense(null);
    },
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
      <div className="p-8 text-center text-slate-500">Loading group...</div>
    );
  if (!groupData?.group)
    return (
      <div className="p-8 text-center text-slate-500">Group not found.</div>
    );

  const group = groupData.group;
  const members = groupData.members || [];
  const expenses = groupData.expenses || [];
  const myBalance = balances[user.id] || 0;

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

  const exportCSV = () => {
    if (!expenses || expenses.length === 0) return;
    const headers = ['Date', 'Title', 'Description', 'Amount', 'Paid By'];
    const rows = expenses.map((e: any) => [
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
    link.setAttribute('download', `group_${group.name.replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportPDF = () => {
    if (!expenses || expenses.length === 0) return;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`Group Expenses: ${group.name}`, 14, 20);
    
    // Add group description if available
    if (group.description) {
      doc.setFontSize(10);
      doc.text(`Description: ${group.description}`, 14, 30);
    }
    
    // Expenses table
    const tableData = expenses.map((e: any) => [
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
        foot: [['', '', 'Total:', `Rs.${expenses.reduce((sum: number, e: any) => sum + e.amount, 0).toFixed(2)}`, '']],
        footStyles: { 
            fontStyle: 'bold', 
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0] // Black text
        }
    });
    
    // Get the final Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    // Calculate individual spending breakdown
    const spendingByPerson: Record<string, number> = {};
    expenses.forEach((e: any) => {
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
    
    doc.save(`group_${group.name.replace(/\s+/g, '_')}_expenses.pdf`);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {group.name}
              </h1>
              <span className="bg-slate-100 dark:bg-slate-900 text-slate-500 px-3 py-1 rounded-full text-xs font-mono tracking-widest">
                CODE: {group.joinCode}
              </span>
            </div>
            {group.description && (
              <p className="text-slate-500">{group.description}</p>
            )}
            <p className="text-sm text-slate-400 mt-2">
              {members.length} members
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={exportCSV}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FileText size={16} /> Export CSV
              </button>
              <button
                onClick={exportPDF}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export PDF
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm text-slate-500 mb-1">
              Your Total Balance
            </span>
            <span
              className={`text-3xl font-bold ${myBalance > 0 ? "text-emerald-500" : myBalance < 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}
            >
              {myBalance > 0 ? "+" : ""}₹{myBalance.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              {myBalance > 0
                ? "You Get"
                : myBalance < 0
                  ? "You Pay"
                  : "Settled up"}
            </span>
          </div>
        </div>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No expenses in this group yet.
              </div>
            ) : (
              [...expenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp: any) => (
                <div
                  key={exp._id}
                  className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500 text-center leading-none">
                        <div className="text-xs uppercase">
                          {format(new Date(exp.date), "MMM")}
                        </div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {format(new Date(exp.date), "dd")}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          {exp.title}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Paid by{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {exp.paidBy?.name === user.name
                              ? "You"
                              : exp.paidBy?.name}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          ₹{exp.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500">
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
                              className="text-slate-400 hover:text-emerald-500 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setExpenseToDelete(exp._id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                      )}
                    </div>
                  </div>

                  {/* Money Flow Visualization */}
                  <div className="ml-16 mr-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">
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
                            <span className="font-medium text-slate-700 dark:text-slate-300 w-24 truncate">
                              {split.user._id === user.id
                                ? "You"
                                : split.user.name}
                            </span>
                            <span className="text-slate-400 mx-2 text-xs">
                              to pay
                            </span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400 w-16">
                              ₹{split.amountOwed.toFixed(2)}
                            </span>
                            <ArrowRight
                              size={14}
                              className="text-slate-300 dark:text-slate-600 mx-2"
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {exp.paidBy?._id === user.id
                                ? "You"
                                : exp.paidBy?.name}
                            </span>
                          </div>
                        ))}
                      {(exp.splits?.filter(
                        (s: any) => s.user && s.user._id !== exp.paidBy?._id,
                      ) || []).length === 0 && (
                        <p className="text-sm text-slate-500 italic">
                          Paid entirely for themselves.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Balances & Settlement */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Your Balances</h2>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
            {myOwes.length === 0 ? (
                <div className="p-5 text-center text-slate-500">You are all settled up!</div>
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
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                            {otherUser.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {otherUser.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {isOwe ? 'You Pay' : 'You Get'}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-right font-bold ${isOwe ? "text-red-500" : "text-emerald-500"}`}
                        >
                          ₹{owe.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                })
            )}
          </div>

          {pendingSettlements.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800 shadow-sm">
                <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                  <Check size={18} /> Pending Settlements
                </h3>
                <div className="space-y-3">
                  {pendingSettlements.map((settlement: any) => {
                    const isReceiver = settlement.paidTo._id === user.id;
                    const otherPerson = isReceiver ? settlement.paidBy : settlement.paidTo;
                    return (
                        <div key={settlement._id} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-100 dark:border-amber-900/50">
                           <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {isReceiver ? `${otherPerson.name} paid you` : `You paid ${otherPerson.name}`}
                              </span>
                              <span className="font-bold text-amber-600 dark:text-amber-500">₹{settlement.amount.toFixed(2)}</span>
                           </div>
                           {isReceiver ? (
                               <button 
                                  onClick={() => confirmSettlementMutation.mutate(settlement._id)}
                                  disabled={confirmSettlementMutation.isPending}
                                  className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-sm font-medium transition-colors"
                               >
                                  Confirm Received
                               </button>
                           ) : (
                               <span className="text-xs text-slate-500 text-center block mt-1">Waiting for {otherPerson.name} to confirm</span>
                           )}
                        </div>
                    );
                  })}
                </div>
              </div>
          )}

          {/* Settlement Demo */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-md">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Check size={18} /> Settle Debts
            </h3>
            <p className="text-sm text-emerald-50 mb-4">
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
                    className="w-full bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-left flex justify-between"
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
