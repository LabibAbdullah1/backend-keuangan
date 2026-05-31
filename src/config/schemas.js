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
  }),

  registerSchema: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).trim().required().messages({
      'string.alphanum': 'Username hanya boleh berisi huruf dan angka.',
      'string.min': 'Username minimal harus 3 karakter.',
      'string.max': 'Username maksimal 30 karakter.',
      'any.required': 'Username wajib diisi.'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Format email tidak valid.',
      'any.required': 'Email wajib diisi.'
    }),
    password: Joi.string().min(6).max(100).required().messages({
      'string.min': 'Password minimal harus 6 karakter.',
      'string.max': 'Password maksimal 100 karakter.',
      'any.required': 'Password wajib diisi.'
    })
  }),

  loginSchema: Joi.object({
    emailOrUsername: Joi.string().trim().required().messages({
      'any.required': 'Username atau Email wajib diisi.'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password wajib diisi.'
    })
  }),

  updateProfileSchema: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).trim().required().messages({
      'string.alphanum': 'Username hanya boleh berisi huruf dan angka.',
      'string.min': 'Username minimal harus 3 karakter.',
      'string.max': 'Username maksimal 30 karakter.',
      'any.required': 'Username wajib diisi.'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Format email tidak valid.',
      'any.required': 'Email wajib diisi.'
    }),
    password: Joi.string().min(6).max(100).allow('', null).messages({
      'string.min': 'Password baru minimal harus 6 karakter.',
      'string.max': 'Password baru maksimal 100 karakter.'
    })
  }),

  budgetAllocationSchema: Joi.object({
    monthly_income: Joi.number().positive().required().messages({
      'number.base': 'Pendapatan bulanan harus berupa angka.',
      'number.positive': 'Pendapatan bulanan harus bernilai positif.',
      'any.required': 'Pendapatan bulanan wajib diisi.'
    })
  }),

  savingsSimulatorSchema: Joi.object({
    target_amount: Joi.number().positive().required().messages({
      'number.base': 'Target nominal harus berupa angka.',
      'number.positive': 'Target nominal harus bernilai positif.',
      'any.required': 'Target nominal wajib diisi.'
    }),
    current_amount: Joi.number().min(0).default(0).messages({
      'number.base': 'Tabungan saat ini harus berupa angka.',
      'number.min': 'Tabungan saat ini tidak boleh bernilai negatif.'
    }),
    duration_months: Joi.number().integer().positive().messages({
      'number.base': 'Durasi bulan harus berupa angka.',
      'number.integer': 'Durasi bulan harus berupa bilangan bulat.',
      'number.positive': 'Durasi bulan harus bernilai positif.'
    }),
    monthly_contribution: Joi.number().positive().messages({
      'number.base': 'Kontribusi bulanan harus berupa angka.',
      'number.positive': 'Kontribusi bulanan harus bernilai positif.'
    }),
    annual_interest_rate: Joi.number().min(0).default(0).messages({
      'number.base': 'Suku bunga tahunan harus berupa angka.',
      'number.min': 'Suku bunga tahunan tidak boleh bernilai negatif.'
    })
  }).or('duration_months', 'monthly_contribution').messages({
    'object.missing': 'Harus menyertakan salah satu dari duration_months atau monthly_contribution.'
  }),

  emergencyFundSchema: Joi.object({
    monthly_expense: Joi.number().positive().messages({
      'number.base': 'Pengeluaran bulanan harus berupa angka.',
      'number.positive': 'Pengeluaran bulanan harus bernilai positif.'
    }),
    marital_status: Joi.string().valid('single', 'married').default('single').messages({
      'any.only': 'Status pernikahan harus berupa "single" atau "married".'
    }),
    dependents_count: Joi.number().integer().min(0).default(0).messages({
      'number.base': 'Jumlah tanggungan harus berupa angka.',
      'number.integer': 'Jumlah tanggungan harus berupa bilangan bulat.',
      'number.min': 'Jumlah tanggungan tidak boleh bernilai negatif.'
    }),
    include_partner: Joi.boolean().default(false).messages({
      'boolean.base': 'Parameter include_partner harus berupa boolean.'
    })
  }),

  debtPayoffSchema: Joi.object({
    debts: Joi.array().items(
      Joi.object({
        name: Joi.string().max(100).trim().required().messages({
          'string.empty': 'Nama utang tidak boleh kosong.',
          'any.required': 'Nama utang wajib diisi.'
        }),
        balance: Joi.number().positive().required().messages({
          'number.base': 'Saldo utang harus berupa angka.',
          'number.positive': 'Saldo utang harus bernilai positif.',
          'any.required': 'Saldo utang wajib diisi.'
        }),
        interest_rate: Joi.number().min(0).required().messages({
          'number.base': 'Suku bunga utang harus berupa angka.',
          'number.min': 'Suku bunga utang tidak boleh bernilai negatif.',
          'any.required': 'Suku bunga utang wajib diisi.'
        }),
        minimum_payment: Joi.number().positive().required().messages({
          'number.base': 'Cicilan minimum harus berupa angka.',
          'number.positive': 'Cicilan minimum harus bernilai positif.',
          'any.required': 'Cicilan minimum wajib diisi.'
        })
      })
    ).min(1).required().messages({
      'array.min': 'Daftar utang minimal harus berisi 1 utang.',
      'any.required': 'Daftar utang wajib diisi.'
    }),
    extra_monthly_payment: Joi.number().min(0).default(0).messages({
      'number.base': 'Dana ekstra bulanan harus berupa angka.',
      'number.min': 'Dana ekstra bulanan tidak boleh bernilai negatif.'
    })
  })
};

export default schemas;
