// src/utils/taxCalculators.js - CORRECTED IMPORTS AND IMPLEMENTATIONS
import { FICA_RATES, STATE_TAX_DATA, TAX_TYPES, FEDERAL_TAX_BRACKETS } from '../../../../src/data/tax-data';
import { INDIANA_COUNTIES } from './data/indianaTaxData';
import { MARYLAND_COUNTIES } from './data/marylandTaxData';
import { MICHIGAN_CITIES, calculateMichiganLocalTax } from './data/michiganTaxData';
import { MISSOURI_CITIES } from './data/missouriTaxData';
import { NEW_JERSEY_CITIES } from './data/newJerseyTaxData';
import { NEW_YORK_TAX, calculateNYTax } from './data/newYorkTaxData';
import { OHIO_MUNICIPALITIES } from './data/ohioTaxData';
import { OREGON_TAX } from './data/oregonTaxData';
import { PENNSYLVANIA_TAX } from './data/pennsylvaniaTaxData';
import { WEST_VIRGINIA_TAX } from './data/westVirginiaTaxData';

// Helper function to safely get tax rate value from different tax structures
const getTaxRateValue = (taxData) => {
  if (!taxData) return 0;
  
  if (taxData.type === "percentage" || taxData.type === "flat") {
    return taxData.value;
  } else if (taxData.type === "range") {
    return (taxData.min + taxData.max) / 2; // Use average of range
  } else if (taxData.type === "fixed") {
    return taxData.value;
  }
  
  return 0;
};

// Convert various income types to annual
export const convertToAnnualIncome = (income, payType) => {
  const numericIncome = parseFloat(income);
  
  if (isNaN(numericIncome)) return 0;
  
  switch (payType) {
    case 'hourly':
      return numericIncome * 40 * 52; // 40 hours per week, 52 weeks per year
    case 'weekly':
      return numericIncome * 52;
    case 'biweekly':
      return numericIncome * 26;
    case 'monthly':
      return numericIncome * 12;
    case 'annual':
    default:
      return numericIncome;
  }
};

// Calculate progressive tax (like federal income tax)
export const calculateProgressiveTax = (income, brackets) => {
  let tax = 0;
  let remainingIncome = income;
  let previousLimit = 0;
  
  for (let i = 0; i < brackets.length; i++) {
    const currentBracket = brackets[i];
    
    // Calculate income in this bracket
    const bracketIncome = Math.min(
      remainingIncome,
      currentBracket.limit - previousLimit
    );
    
    if (bracketIncome <= 0) break;
    
    tax += bracketIncome * currentBracket.rate;
    remainingIncome -= bracketIncome;
    previousLimit = currentBracket.limit;
    
    if (remainingIncome <= 0) break;
  }
  
  return tax;
};

// Calculate FICA taxes (Social Security and Medicare)
export const calculateFICATax = (income) => {
  const { socialSecurity, medicare, additionalMedicare, socialSecurityWageCap } = FICA_RATES;
  
  // Social Security has a wage cap
  const socialSecurityTax = Math.min(income, socialSecurityWageCap) * socialSecurity;
  
  // Regular Medicare tax
  let medicareTax = income * medicare;
  
  // Additional Medicare tax for high earners (over $200,000)
  if (income > 200000) {
    medicareTax += (income - 200000) * additionalMedicare;
  }
  
  return socialSecurityTax + medicareTax;
};

// Helper function for progressive tax with base amounts (like NY)
const calculateProgressiveTaxWithBaseAmount = (income, brackets) => {
  // Find the appropriate bracket
  const bracket = brackets.find(b => income >= b.min && income <= b.max);
  
  if (!bracket) return 0;
  
  // Calculate tax: base amount + (rate * (income - bracket min))
  return bracket.baseAmount + ((income - bracket.min) * bracket.rate);
};

// Calculate state tax based on state data and income
export const calculateStateTax = (income, state) => {
  if (!state || !STATE_TAX_DATA[state]) return 0;
  
  const stateData = STATE_TAX_DATA[state];
  const taxType = stateData.taxType || TAX_TYPES.FLAT_RATE;
  
  switch (taxType) {
    case TAX_TYPES.PROGRESSIVE:
      // Handle progressive tax brackets (like NY)
      if (state === 'New York') {
        // Use the existing calculation function from newYorkTaxData.js
        const taxResult = calculateNYTax(income);
        return taxResult.stateTax;
      }
      return income * stateData.rate; // Fallback to flat rate if no specific implementation
      
    case TAX_TYPES.TABLE_BASED:
      // Handle table-based tax (like Oregon)
      if (state === 'Oregon') {
        // Use the calculate function from the Oregon tax data
        return OREGON_TAX.calculateTax(income).localTax;
      }
      return income * stateData.rate; // Fallback
      
    case TAX_TYPES.FLAT_AMOUNT:
      // Fixed dollar amount
      return stateData.amount || 0;
      
    case TAX_TYPES.SURTAX:
      // Additional tax on top of state tax
      const baseTax = income * stateData.rate;
      return baseTax + (baseTax * (stateData.surtaxRate || 0));
      
    case TAX_TYPES.FLAT_RATE:
    default:
      // Simple percentage of income
      return income * stateData.rate;
  }
};

// Calculate local tax (city or county)
export const calculateLocalTax = (income, state, city) => {
  if (!state || !STATE_TAX_DATA[state] || !STATE_TAX_DATA[state].hasLocalTax) {
    return 0;
  }
  
  const stateData = STATE_TAX_DATA[state];
  
  // Handle different local tax types
  switch (stateData.taxType) {
    case 'city':
      // City-specific tax rates
      return calculateCityTax(income, state, city);
      
    case 'county':
      // County-specific tax rates
      return calculateCountyTax(income, state, city);
      
    case 'both':
      // Both city and county taxes (like Pennsylvania)
      const cityTax = calculateCityTax(income, state, city);
      const countyTax = calculateCountyTax(income, state, city);
      return cityTax + countyTax;
      
    case 'school_district':
      // School district taxes (like Iowa)
      return calculateSchoolDistrictTax(income, state, city);
      
    default:
      return 0;
  }
};

const calculateCityTax = (income, state, city) => {
  // Look up city tax rate from the appropriate state file
  switch (state) {
    case 'Indiana':
      if (city && INDIANA_COUNTIES[city]) {
        return income * getTaxRateValue(INDIANA_COUNTIES[city]);
      }
      break;
    case 'Michigan':
      if (city) {
        return calculateMichiganLocalTax(income, city);
      }
      break;
    case 'Missouri':
      if (city && MISSOURI_CITIES[city]) {
        return income * getTaxRateValue(MISSOURI_CITIES[city]);
      }
      break;
    case 'New Jersey':
      if (city && NEW_JERSEY_CITIES[city]) {
        return income * getTaxRateValue(NEW_JERSEY_CITIES[city]);
      }
      break;
    case 'New York':
      if (city && NEW_YORK_TAX.cities[city]) {
        const taxResult = calculateNYTax(income, city);
        return taxResult.cityTax;
      }
      break;
    case 'Ohio':
      if (city && OHIO_MUNICIPALITIES[city]) {
        return income * getTaxRateValue(OHIO_MUNICIPALITIES[city]);
      }
      break;
    case 'Oregon':
      if (OREGON_TAX && OREGON_TAX.calculateTax) {
        return OREGON_TAX.calculateTax(income).localTax;
      }
      return 0;
    case 'Pennsylvania':
      // Check if the city is actually a county in Pennsylvania's data
      if (city && PENNSYLVANIA_TAX.counties[city]) {
        const countyData = PENNSYLVANIA_TAX.counties[city];
        if (countyData.type === "fixed") {
          return income * countyData.value;
        } else if (countyData.type === "range") {
          // Use the midpoint of the range as an approximation
          return income * ((countyData.max + countyData.min) / 2);
        }
      }
      break;
    case 'West Virginia':
      if (city && WEST_VIRGINIA_TAX.cities[city]) {
        // Pass the city parameter to the calculateTax function
        return WEST_VIRGINIA_TAX.calculateTax(city);
      }
      break;
    default:
      return 0;
  }
  return 0;
};

const calculateCountyTax = (income, state, county) => {
  // Similar to city tax, but for counties
  switch (state) {
    case 'Maryland':
      if (county && MARYLAND_COUNTIES[county]) {
        return income * getTaxRateValue(MARYLAND_COUNTIES[county]);
      }
      break;
    // Add cases for other states with county taxes
    default:
      return 0;
  }
  return 0;
};

const calculateSchoolDistrictTax = (income, state, district) => {
  // For states like Iowa with school district taxes
  return 0; // Would need specific school district data
};

// Calculate federal tax
export const calculateFederalTax = (income) => {
  return calculateProgressiveTax(income, FEDERAL_TAX_BRACKETS);
};

// Calculate total tax burden
export const calculateTotalTax = (income, state, city) => {
  const federalTax = calculateFederalTax(income);
  const ficaTax = calculateFICATax(income);
  const stateTax = calculateStateTax(income, state);
  const localTax = calculateLocalTax(income, state, city);
  
  return {
    federal: federalTax,
    fica: ficaTax,
    state: stateTax,
    local: localTax,
    total: federalTax + ficaTax + stateTax + localTax,
    effectiveRate: (federalTax + ficaTax + stateTax + localTax) / income
  };
};

// Validate user inputs
export const validateInputs = (inputs) => {
  const errors = {};
  
  if (!inputs.income || isNaN(parseFloat(inputs.income)) || parseFloat(inputs.income) <= 0) {
    errors.income = 'Please enter a valid income amount';
  }
  
  if (!inputs.state) {
    errors.state = 'Please select a state';
  }
  
  if (inputs.monthlyDebts && (isNaN(parseFloat(inputs.monthlyDebts)) || parseFloat(inputs.monthlyDebts) < 0)) {
    errors.monthlyDebts = 'Please enter a valid monthly debt amount';
  }
  
  return errors;
};

// Export all calculators as an object
export const TAX_CALCULATORS = {
  convertToAnnualIncome,
  calculateProgressiveTax,
  calculateFICATax,
  calculateStateTax,
  calculateLocalTax,
  calculateFederalTax,
  calculateTotalTax,
  validateInputs
};

export default TAX_CALCULATORS;