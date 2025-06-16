// src/utils/taxValidators.js
import { STATE_TAX_DATA } from './data/tax-data';
import { INDIANA_COUNTIES } from './data/indianaTaxData';
import { MARYLAND_COUNTIES } from './data/marylandTaxData';
import { MICHIGAN_CITIES } from './data/michiganTaxData';
import { MISSOURI_CITIES } from './data/missouriTaxData';
import { NEW_JERSEY_CITIES } from './data/newJerseyTaxData';
import { NEW_YORK_TAX } from './data/newYorkTaxData';
import { OHIO_MUNICIPALITIES } from './data/ohioTaxData';
import { PENNSYLVANIA_TAX } from './data/pennsylvaniaTaxData';
import { WEST_VIRGINIA_TAX } from './data/westVirginiaTaxData';

// Validate an income amount
export const validateIncome = (income) => {
  if (!income || income.trim() === '') {
    return 'Income is required';
  }
  
  const numericIncome = parseFloat(income);
  if (isNaN(numericIncome) || numericIncome <= 0) {
    return 'Please enter a valid income amount';
  }
  
  return null;
};

// Validate state selection
export const validateState = (state) => {
  if (!state) {
    return 'State selection is required';
  }
  
  if (!STATE_TAX_DATA[state]) {
    return 'Please select a valid state';
  }
  
  return null;
};

// Check if city or county exists in the appropriate data structure
const localJurisdictionExists = (state, localJurisdiction) => {
  if (!state || !localJurisdiction) return false;
  
  switch (state) {
    case 'Indiana':
      return INDIANA_COUNTIES[localJurisdiction] !== undefined;
    case 'Maryland':
      return MARYLAND_COUNTIES[localJurisdiction] !== undefined;
    case 'Michigan':
      return MICHIGAN_CITIES.exceptions[localJurisdiction] !== undefined || true; // Michigan has default rate
    case 'Missouri':
      return MISSOURI_CITIES[localJurisdiction] !== undefined;
    case 'New Jersey':
      return NEW_JERSEY_CITIES[localJurisdiction] !== undefined;
    case 'New York':
      return NEW_YORK_TAX.cities[localJurisdiction] !== undefined;
    case 'Ohio':
      return OHIO_MUNICIPALITIES[localJurisdiction] !== undefined;
    case 'Pennsylvania':
      return PENNSYLVANIA_TAX.counties[localJurisdiction] !== undefined;
    case 'West Virginia':
      return WEST_VIRGINIA_TAX.cities[localJurisdiction] !== undefined;
    default:
      return false;
  }
};

// Get the appropriate jurisdiction name (city, county, etc.) based on state
const getLocalJurisdictionLabel = (state) => {
  if (!state || !STATE_TAX_DATA[state]) return 'location';
  
  const stateInfo = STATE_TAX_DATA[state];
  
  if (!stateInfo.hasLocalTax) return 'location';
  
  switch (stateInfo.taxType) {
    case 'county':
      return 'county';
    case 'city':
      return 'city';
    case 'school_district':
      return 'school district';
    case 'both':
      return 'city/county';
    default:
      return 'location';
  }
};

// Validate city/county selection when required
export const validateLocalJurisdiction = (state, localJurisdiction) => {
  if (!state) return null;
  
  const stateInfo = STATE_TAX_DATA[state];
  if (!stateInfo || !stateInfo.hasLocalTax) return null;
  
  if (!localJurisdiction) {
    return `Please select a ${getLocalJurisdictionLabel(state)}`;
  }
  
  if (!localJurisdictionExists(state, localJurisdiction)) {
    return `Please select a valid ${getLocalJurisdictionLabel(state)}`;
  }
  
  return null;
};

// Validate monthly debts
export const validateMonthlyDebts = (debts) => {
  if (!debts || debts.trim() === '') return null;
  
  const numericDebts = parseFloat(debts);
  if (isNaN(numericDebts) || numericDebts < 0) {
    return 'Monthly debts must be a positive number or zero';
  }
  
  return null;
};

// Validate down payment percentage
export const validateDownPaymentPercent = (percent) => {
  if (!percent && percent !== 0) {
    return 'Down payment percentage is required';
  }
  
  const numericPercent = parseFloat(percent);
  if (isNaN(numericPercent) || numericPercent < 0 || numericPercent > 100) {
    return 'Down payment must be between 0% and 100%';
  }
  
  return null;
};

// Validate interest rate
export const validateInterestRate = (rate) => {
  if (!rate && rate !== 0) {
    return 'Interest rate is required';
  }
  
  const numericRate = parseFloat(rate);
  if (isNaN(numericRate) || numericRate < 0 || numericRate > 30) {
    return 'Interest rate must be between 0% and 30%';
  }
  
  return null;
};

// Validate loan term
export const validateLoanTerm = (term) => {
  if (!term) {
    return 'Loan term is required';
  }
  
  const numericTerm = parseInt(term, 10);
  if (isNaN(numericTerm) || numericTerm < 1 || numericTerm > 50) {
    return 'Loan term must be between 1 and 50 years';
  }
  
  return null;
};

// Validate pay type
export const validatePayType = (payType) => {
  const validPayTypes = ['hourly', 'weekly', 'biweekly', 'monthly', 'annual'];
  
  if (!payType) {
    return 'Pay type is required';
  }
  
  if (!validPayTypes.includes(payType)) {
    return 'Please select a valid pay type';
  }
  
  return null;
};

// Validate form inputs
export const validateInputs = (inputs) => {
  const errors = {};
  
  // Validate income
  const incomeError = validateIncome(inputs.income);
  if (incomeError) errors.income = incomeError;
  
  // Validate pay type if provided
  if (inputs.payType) {
    const payTypeError = validatePayType(inputs.payType);
    if (payTypeError) errors.payType = payTypeError;
  }
  
  // Validate state
  const stateError = validateState(inputs.state);
  if (stateError) errors.state = stateError;
  
  // Validate city/county if applicable
  const localError = validateLocalJurisdiction(inputs.state, inputs.city);
  if (localError) errors.city = localError;
  
  // Validate monthly debts
  const debtsError = validateMonthlyDebts(inputs.monthlyDebts);
  if (debtsError) errors.monthlyDebts = debtsError;
  
  // Validate home purchase fields if provided
  if (inputs.homePurchase) {
    // Validate down payment percentage
    const downPaymentError = validateDownPaymentPercent(inputs.downPaymentPercent);
    if (downPaymentError) errors.downPaymentPercent = downPaymentError;
    
    // Validate interest rate
    const interestRateError = validateInterestRate(inputs.interestRate);
    if (interestRateError) errors.interestRate = interestRateError;
    
    // Validate loan term
    const loanTermError = validateLoanTerm(inputs.loanTerm);
    if (loanTermError) errors.loanTerm = loanTermError;
  }
  
  return errors;
};

export default {
  validateIncome,
  validateState,
  validateLocalJurisdiction,
  validateMonthlyDebts,
  validateDownPaymentPercent,
  validateInterestRate,
  validateLoanTerm,
  validatePayType,
  validateInputs
};