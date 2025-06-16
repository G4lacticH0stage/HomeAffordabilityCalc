// West Virginia Tax Data
export const WEST_VIRGINIA_TAX = {
    type: "flat_rate_per_period",
    cities: {
      "Charleston": { type: "flat", amount: 4, period: "payPeriod" },
      "Huntington": { type: "flat", amount: 6, period: "payPeriod" },
      "Parkersburg": { type: "flat", amount: 5, period: "payPeriod" }
    },
    calculateTax: (city, payPeriodsPerYear = 26) => {
      if (!WEST_VIRGINIA_TAX.cities[city]) return 0;
      return WEST_VIRGINIA_TAX.cities[city].amount * payPeriodsPerYear;
    }
  };