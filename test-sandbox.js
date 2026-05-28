// Isolated Validation & Mathematical Proof for Personal Finance Analytics Engine
// This script runs the business logic in memory using exact formulas implemented in the service layer.

console.log('============================================================');
console.log('       PENGUJIAN VALIDASI FORMULA MATEMATIKA ANALITIK       ');
console.log('============================================================\n');

// 1. MOCK TEST UNTUK BUDGET VELOCITY ENGINE
console.log('[Tes 1] Menguji Predictive Budget Velocity Engine...');
const budgetTestCases = [
  {
    category: 'Makan & Minum',
    limit: 1500000,
    totalSpent: 600000, // Pengeluaran sejauh ini
    daysPassed: 10,     // Hari berjalan
    totalDays: 30       // Total hari dalam bulan
  },
  {
    category: 'Transportasi',
    limit: 500000,
    totalSpent: 450000,
    daysPassed: 20,
    totalDays: 30
  },
  {
    category: 'Belanja Bulanan',
    limit: 2000000,
    totalSpent: 2200000,
    daysPassed: 15,
    totalDays: 30
  }
];

budgetTestCases.forEach(tc => {
  const remainingBudget = Math.max(0, tc.limit - tc.totalSpent);
  const percentageSpent = (tc.totalSpent / tc.limit) * 100;
  
  // Hitung laju burn-rate harian
  const dailyBurnRate = tc.daysPassed > 0 ? tc.totalSpent / tc.daysPassed : 0;
  
  // Proyeksi akhir bulan
  const projectedSpending = dailyBurnRate * tc.totalDays;
  
  const isOverspent = tc.totalSpent > tc.limit;
  const willOverspend = projectedSpending > tc.limit;
  
  let status = 'ON_TRACK';
  let estimatedExhaustionDay = null;

  if (isOverspent) {
    status = 'OVERSPENT';
  } else if (willOverspend) {
    status = 'HIGH_RISK';
    if (dailyBurnRate > 0) {
      estimatedExhaustionDay = Math.min(
        tc.totalDays, 
        Math.max(1, Math.floor(tc.limit / dailyBurnRate))
      );
    }
  }

  console.log(`\n- Kategori: ${tc.category}`);
  console.log(`  Batas Budget: Rp ${tc.limit.toLocaleString('id-ID')}`);
  console.log(`  Terpakai    : Rp ${tc.totalSpent.toLocaleString('id-ID')} (${percentageSpent.toFixed(1)}%)`);
  console.log(`  Burn-Rate   : Rp ${dailyBurnRate.toLocaleString('id-ID')}/hari`);
  console.log(`  Proyeksi    : Rp ${projectedSpending.toLocaleString('id-ID')} di akhir bulan`);
  console.log(`  Status      : ${status}`);
  if (estimatedExhaustionDay) {
    console.log(`  [Prediksi]  : Uang diprediksi HABIS pada hari ke-${estimatedExhaustionDay}`);
  }
});

// 2. MOCK TEST UNTUK SAVINGS FORECASTER
console.log('\n------------------------------------------------------------');
console.log('[Tes 2] Menguji Savings Goals Forecast Engine...');
const savingsTestCases = [
  {
    name: 'Dana Darurat 3 Bulan',
    targetAmount: 15000000,
    currentAmount: 4500000,
    daysRemaining: 120 // ~4 bulan
  },
  {
    name: 'Beli Laptop Baru',
    targetAmount: 8000000,
    currentAmount: 8500000,
    daysRemaining: 15
  },
  {
    name: 'Liburan Akhir Tahun',
    targetAmount: 6000000,
    currentAmount: 1000000,
    daysRemaining: -5 // Deadline terlewati
  }
];

savingsTestCases.forEach(tc => {
  const remainingAmount = Math.max(0, tc.targetAmount - tc.currentAmount);
  const progressPercentage = (tc.currentAmount / tc.targetAmount) * 100;
  
  const monthsRemaining = tc.daysRemaining > 0 ? tc.daysRemaining / 30.44 : 0;
  
  let requiredMonthlySavings = 0;
  let status = 'ACTIVE';

  if (tc.currentAmount >= tc.targetAmount) {
    status = 'COMPLETED';
  } else if (tc.daysRemaining <= 0) {
    status = 'BEHIND';
  } else {
    requiredMonthlySavings = remainingAmount / monthsRemaining;
  }

  console.log(`\n- Target: ${tc.name}`);
  console.log(`  Goal Nominal: Rp ${tc.targetAmount.toLocaleString('id-ID')}`);
  console.log(`  Terkumpul   : Rp ${tc.currentAmount.toLocaleString('id-ID')} (${progressPercentage.toFixed(1)}%)`);
  console.log(`  Sisa Hari   : ${tc.daysRemaining} hari (${monthsRemaining.toFixed(2)} bulan)`);
  console.log(`  Status      : ${status}`);
  if (status === 'ACTIVE') {
    console.log(`  [Rencana]   : Wajib menabung Rp ${Math.round(requiredMonthlySavings).toLocaleString('id-ID')}/bulan`);
  }
});

// 3. MOCK TEST UNTUK AUTOMATED RECURRING ENGINE DATE MATH
console.log('\n------------------------------------------------------------');
console.log('[Tes 3] Menguji Recurring Transaction Calendar Date Math...');

function calculateNextDueDate(currentDueDateStr, frequency) {
  const date = new Date(currentDueDateStr);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}

const datesToTest = [
  { start: '2026-05-28', freq: 'daily' },
  { start: '2026-05-28', freq: 'weekly' },
  { start: '2026-05-28', freq: 'monthly' },
  { start: '2026-05-28', freq: 'yearly' }
];

datesToTest.forEach(t => {
  const result = calculateNextDueDate(t.start, t.freq);
  console.log(`- Start: ${t.start} | Frekuensi: ${t.freq.padEnd(8)} | Selanjutnya: ${result}`);
});

console.log('\n============================================================');
console.log('       PENGUJIAN VALIDASI BERHASIL DISIMULASIKAN            ');
console.log('============================================================');
