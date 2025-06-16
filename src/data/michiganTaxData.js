// Michigan City Tax Rates - Only showing exceptions to the standard 1%
export const MICHIGAN_CITIES = {
    defaultRate: 0.01, // Standard 1% rate for most cities
    exceptions: {
      "Detroit": { type: "percentage", value: 0.024 },
      "Grand Rapids": { type: "percentage", value: 0.015 },
      "Highland Park": { type: "percentage", value: 0.02 },
      "Saginaw": { type: "percentage", value: 0.015 }
    }
  };
  
  // Example calculation function
  export const calculateMichiganLocalTax = (income, city) => {
    if (MICHIGAN_CITIES.exceptions[city]) {
      return income * MICHIGAN_CITIES.exceptions[city].value;
    }
    return income * MICHIGAN_CITIES.defaultRate;
  };