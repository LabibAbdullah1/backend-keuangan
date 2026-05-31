import CalculatorService from '../services/calculatorService.js';

const CalculatorController = {
  /**
   * POST /api/calculators/budget-allocation
   */
  async getBudgetAllocation(req, res, next) {
    try {
      const { monthly_income } = req.body;
      const allocation = await CalculatorService.calculateBudgetAllocation(monthly_income);

      res.json({
        success: true,
        message: 'Kalkulasi alokasi anggaran 50/30/20 berhasil didapatkan.',
        data: allocation
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/calculators/savings-simulator
   */
  async getSavingsProjection(req, res, next) {
    try {
      const result = await CalculatorService.calculateSavingsProjection(req.body);

      res.json({
        success: true,
        message: 'Kalkulasi simulasi target tabungan berhasil didapatkan.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/calculators/emergency-fund (supports POST/GET since we fetch user transaction data)
   */
  async getEmergencyFundRecommendation(req, res, next) {
    try {
      const userId = req.user.id;
      // We read from req.body (or default to empty object)
      const inputData = req.body || {};
      const recommendation = await CalculatorService.calculateEmergencyFund(userId, inputData);

      res.json({
        success: true,
        message: 'Rekomendasi dana darurat berhasil dihitung.',
        data: recommendation
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/calculators/debt-payoff
   */
  async getDebtPayoffStrategy(req, res, next) {
    try {
      const result = await CalculatorService.calculateDebtPayoff(req.body);

      res.json({
        success: true,
        message: 'Kalkulasi strategi pelunasan utang berhasil didapatkan.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};

export default CalculatorController;
