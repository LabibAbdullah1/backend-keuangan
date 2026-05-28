import Joi from 'joi';

const schemas = {
  transactionSchema: Joi.object({
    type: Joi.string().valid('income', 'expense').required().messages({
      'any.only': 'Tipe transaksi harus "income" atau "expense".',
      'any.required': 'Tipe transaksi wajib diisi.'
    }),
    amount: Joi.number().positive().precision(2).required().messages({
      'number.base': 'Nominal harus berupa angka.',
      'number.positive': 'Nominal transaksi harus bernilai positif (lebih besar dari 0).',
      'any.required': 'Nominal wajib diisi.'
    }),
    category: Joi.string().max(100).trim().required().messages({
      'string.empty': 'Kategori tidak boleh kosong.',
      'string.max': 'Kategori maksimal 100 karakter.',
      'any.required': 'Kategori wajib diisi.'
    }),
    date: Joi.string().isoDate().required().messages({
      'string.isoDate': 'Format tanggal salah, gunakan format YYYY-MM-DD.',
      'any.required': 'Tanggal wajib diisi.'
    }),
    note: Joi.string().max(500).allow('', null).messages({
      'string.max': 'Catatan maksimal 500 karakter.'
    })
  }),

  budgetSchema: Joi.object({
    category: Joi.string().max(100).trim().required().messages({
      'string.empty': 'Kategori anggaran tidak boleh kosong.',
      'any.required': 'Kategori anggaran wajib diisi.'
    }),
    amount: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Nominal batas anggaran harus lebih besar dari 0.',
      'any.required': 'Nominal anggaran wajib diisi.'
    }),
    month: Joi.number().integer().min(1).max(12).required().messages({
      'number.min': 'Bulan harus bernilai 1-12.',
      'number.max': 'Bulan harus bernilai 1-12.',
      'any.required': 'Bulan wajib diisi.'
    }),
    year: Joi.number().integer().min(2000).max(2100).required().messages({
      'number.min': 'Tahun minimal 2000.',
      'any.required': 'Tahun wajib diisi.'
    })
  }),

  goalSchema: Joi.object({
    name: Joi.string().max(150).trim().required().messages({
      'string.empty': 'Nama target tabungan tidak boleh kosong.',
      'any.required': 'Nama target tabungan wajib diisi.'
    }),
    target_amount: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Nominal target harus lebih besar dari 0.',
      'any.required': 'Nominal target tabungan wajib diisi.'
    }),
    current_amount: Joi.number().min(0).precision(2).default(0).messages({
      'number.min': 'Tabungan awal tidak boleh kurang dari 0.'
    }),
    target_date: Joi.string().isoDate().required().messages({
      'string.isoDate': 'Format tanggal salah, gunakan format YYYY-MM-DD.',
      'any.required': 'Tanggal deadline target wajib diisi.'
    })
  }),

  contributionSchema: Joi.object({
    amount: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Nominal alokasi tabungan harus lebih besar dari 0.',
      'any.required': 'Nominal alokasi wajib diisi.'
    })
  }),

  recurringSchema: Joi.object({
    type: Joi.string().valid('income', 'expense').required().messages({
      'any.only': 'Tipe transaksi harus "income" atau "expense".',
      'any.required': 'Tipe transaksi berulang wajib diisi.'
    }),
    amount: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Nominal berkala harus lebih besar dari 0.',
      'any.required': 'Nominal berkala wajib diisi.'
    }),
    category: Joi.string().max(100).trim().required().messages({
      'string.empty': 'Kategori tidak boleh kosong.',
      'any.required': 'Kategori wajib diisi.'
    }),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required().messages({
      'any.only': 'Frekuensi harus berupa: daily, weekly, monthly, atau yearly.',
      'any.required': 'Frekuensi transaksi berulang wajib diisi.'
    }),
    note: Joi.string().max(500).allow('', null),
    next_due_date: Joi.string().isoDate().required().messages({
      'string.isoDate': 'Format tanggal salah, gunakan format YYYY-MM-DD.',
      'any.required': 'Tanggal mulai jatuh tempo pertama wajib diisi.'
    })
  })
};

export default schemas;
