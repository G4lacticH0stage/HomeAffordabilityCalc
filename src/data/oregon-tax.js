// Oregon Tax Data
export const OREGON_TAX = {
  type: "flat",
  rate: 0.058, // 5.8% flat local rate
  calculateTax: (income) => {
    return {
      localTax: income * 0.058,
      type: "flat_percentage"
    };
  }
};