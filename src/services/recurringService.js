import { pool } from '../config/db.js';
import RecurringModel from '../models/recurringModel.js';

const RecurringService = {
  /**
   * Memproses semua template transaksi berulang yang jatuh tempo hari ini atau sebelumnya
   */
  async processDueRecurring() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const dueTemplates = await RecurringModel.getDueTemplates(todayStr);
    
    if (dueTemplates.length === 0) {
      return {
        processed_count: 0,
        transactions_created: []
      };
    }

    const createdTransactions = [];
    const connection = await pool.getConnection();
    
    try {
      for (const template of dueTemplates) {
        await connection.beginTransaction();

        const insertSql = 'INSERT INTO transactions (user_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)';
        const [insertResult] = await connection.execute(insertSql, [
          template.user_id,
          template.type,
          template.amount,
          template.category,
          template.next_due_date,
          template.note ? `[OTOMATIS BERULANG] ${template.note}` : '[OTOMATIS BERULANG]'
        ]);

        const nextDueDate = this.calculateNextDueDate(template.next_due_date, template.frequency);

        await RecurringModel.updateNextDueDate(template.id, nextDueDate, connection);

        await connection.commit();

        createdTransactions.push({
          template_id: template.id,
          transaction_id: insertResult.insertId,
          category: template.category,
          amount: template.amount,
          type: template.type,
          applied_date: template.next_due_date,
          new_next_due_date: nextDueDate
        });
      }

      return {
        processed_count: createdTransactions.length,
        transactions_created: createdTransactions
      };

    } catch (error) {
      await connection.rollback();
      console.error('[Recurring Engine Error] Transaksi dibatalkan karena kesalahan:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Menghitung tanggal jatuh tempo berikutnya berdasarkan frekuensi
   */
  calculateNextDueDate(currentDueDateStr, frequency) {
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
      default:
        date.setMonth(date.getMonth() + 1);
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  }
};

export default RecurringService;
