// New York Tax Structure
export const NEW_YORK_TAX = {
    // City tax rates
    cities: {
      "New York City": { type: "percentage", value: 0.0397 },
      "Yonkers": { type: "percentage", value: 0.015 }
    },
    // Progressive state tax brackets
    stateBrackets: [
      { min: 0, max: 8500, rate: 0.04, baseAmount: 0 },
      { min: 8500, max: 11700, rate: 0.045, baseAmount: 340 },
      { min: 11700, max: 13900, rate: 0.0525, baseAmount: 484 },
      { min: 13900, max: 80650, rate: 0.055, baseAmount: 600 },
      { min: 80650, max: 215400, rate: 0.06, baseAmount: 4271 },
      { min: 215400, max: 1077550, rate: 0.0685, baseAmount: 12356 },
      { min: 1077550, max: 5000000, rate: 0.0965, baseAmount: 71413 },
      { min: 5000000, max: 25000000, rate: 0.103, baseAmount: 449929 },
      { min: 25000000, max: Infinity, rate: 0.109, baseAmount: 2509929 }
    ]
  };
  
  // Helper function for NY tax calculation
  export const calculateNYTax = (income, city = null) => {
    // Find applicable tax bracket
    const bracket = NEW_YORK_TAX.stateBrackets.find(
      b => income >= b.min && income <= b.max
    );
  
    // Calculate state tax
    const stateTax = bracket ? 
      bracket.baseAmount + ((income - bracket.min) * bracket.rate) : 0;
  
    // Calculate city tax if applicable
    const cityTax = city && NEW_YORK_TAX.cities[city] ?
      income * NEW_YORK_TAX.cities[city].value : 0;
  
    return {
      stateTax,
      cityTax,
      totalTax: stateTax + cityTax
    };
  };