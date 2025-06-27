import React, { useState, useEffect } from 'react';
import './HomeAffordabilityCalculator.css';
import { INDIANA_COUNTIES } from '../data/indianaTaxData';
import { MARYLAND_COUNTIES } from '../data/marylandTaxData';
import { MICHIGAN_CITIES, calculateMichiganLocalTax } from '../data/michiganTaxData';
import { MISSOURI_CITIES } from '../data/missouriTaxData';
import { NEW_JERSEY_CITIES } from '../data/newJerseyTaxData';
import { NEW_YORK_TAX, calculateNYTax } from '../data/newYorkTaxData';
import { OHIO_MUNICIPALITIES } from '../data/ohioTaxData';
import { OREGON_TAX } from '../data/oregon-tax';
import { PENNSYLVANIA_TAX } from '../data/pennsylvaniaTaxData';
import { WEST_VIRGINIA_TAX } from '../data/westVirginiaTaxData';
import { STATE_TAX_DATA } from '../data/tax-data';
import { PROPERTY_TAX_RATES } from '../data/propertyTaxRates';

// Constants for closing costs and MIP
const CLOSING_COST_RATE = 0.05; // 5% of home price (typical range 2-5%)
const UPFRONT_MIP_RATE = 0.0175; // 1.75% for FHA loans

// Utility functions
const calculateMonthlyMortgage = (homePrice, downPayment, interestRate, loanTermYears) => {
  // Calculate loan amount
  const loanAmount = homePrice - downPayment;
  
  // Convert annual interest rate to monthly and decimal form
  const monthlyInterestRate = (interestRate / 100) / 12;
  
  // Calculate number of payments
  const numberOfPayments = loanTermYears * 12;
  
  // Avoid division by zero for 0% interest
  if (monthlyInterestRate === 0) {
    return loanAmount / numberOfPayments;
  }
  
  // Use mortgage payment formula: M = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
  const monthlyPayment = loanAmount * 
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  
  return monthlyPayment;
};

// Calculate maximum home price based on gross income
const calculateMaxHomePrice = (monthlyGrossIncome, interestRate, loanTermYears, downPayment, monthlyDebts = 0) => {
  // Maximum payment based on whether there are debts included
  // If debts included, use 36% rule (minus debts), otherwise use 28% rule
  const maxMonthlyPaymentPercent = monthlyDebts > 0 ? 0.36 : 0.28;
  const maxMonthlyPayment = (monthlyGrossIncome * maxMonthlyPaymentPercent) - monthlyDebts;
  
  if (maxMonthlyPayment <= 0) return 0;
  
  // Convert annual interest rate to monthly
  const monthlyInterestRate = (interestRate / 100) / 12;
  
  // Number of payments
  const numberOfPayments = loanTermYears * 12;
  
  // Avoid division by zero for 0% interest
  if (monthlyInterestRate === 0) {
    const maxLoanAmount = maxMonthlyPayment * numberOfPayments;
    return maxLoanAmount + downPayment;
  }
  
  // Calculate maximum loan amount
  // Using formula: P = pmt * (1 - (1 + r)^-n) / r
  const maxLoanAmount = maxMonthlyPayment * 
    (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments)) / 
    monthlyInterestRate;
  
  // Calculate max home price (loan amount + down payment)
  const maxHomePrice = maxLoanAmount + downPayment;
  
  return maxHomePrice;
};

// Format currency for display
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

// Format percentage for display
const formatPercentage = (value) => {
  return value.toFixed(1) + '%';
};

// Federal Tax Brackets 2024
const FEDERAL_TAX_BRACKETS_2024 = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 }
];

// Calculate progressive tax (like federal income tax)
const calculateProgressiveTax = (income, brackets) => {
  let tax = 0;
  
  for (let i = 0; i < brackets.length; i++) {
    const currentBracket = brackets[i];
    
    // Calculate income in this bracket
    const bracketMin = currentBracket.min;
    const bracketMax = currentBracket.max;
    
    if (income > bracketMin) {
      // Calculate the portion of income that falls within this bracket
      const taxableInThisBracket = Math.min(income, bracketMax) - bracketMin;
      tax += taxableInThisBracket * currentBracket.rate;
    }
    
    // If we've processed all income, we can stop
    if (income <= bracketMax) break;
  }
  
  return tax;
};

// FICA rates
const FICA_RATES = {
  socialSecurity: 0.062,  // 6.2%
  medicare: 0.0145,      // 1.45%
  additionalMedicare: 0.009, // 0.9% additional Medicare tax for high earners
  socialSecurityWageCap: 168600 // 2024 wage cap for Social Security tax
};

// State tax rates (simplified)
const STATE_TAX_RATES = {
  "Alabama": 0.05,
  "Alaska": 0.00,
  "Arizona": 0.025,
  "Arkansas": 0.039,
  "California": 0.095,
  "Colorado": 0.044,
  "Connecticut": 0.0699,
  "Delaware": 0.066,
  "Florida": 0.00,
  "Georgia": 0.0539,
  "Hawaii": 0.11,
  "Idaho": 0.059,
  "Illinois": 0.049,
  "Indiana": 0.03,
  "Iowa": 0.038,
  "Kansas": 0.055,
  "Kentucky": 0.04,
  "Louisiana": 0.03,
  "Maine": 0.071,
  "Maryland": 0.057,
  "Massachusetts": 0.09,
  "Michigan": 0.042,
  "Minnesota": 0.098,
  "Mississippi": 0.044,
  "Missouri": 0.047,
  "Montana": 0.059,
  "Nebraska": 0.052,
  "Nevada": 0.00,
  "New Hampshire": 0.05,
  "New Jersey": 0.057,
  "New Mexico": 0.059,
  "New York": 0.065,
  "North Carolina": 0.0425,
  "North Dakota": 0.025,
  "Ohio": 0.035,
  "Oklahoma": 0.0475,
  "Oregon": 0.099,
  "Pennsylvania": 0.0307,
  "Rhode Island": 0.0599,
  "South Carolina": 0.062,
  "South Dakota": 0.00,
  "Tennessee": 0.00,
  "Texas": 0.00,
  "Utah": 0.0455,
  "Vermont": 0.0875,
  "Virginia": 0.0575,
  "Washington": 0.00,
  "West Virginia": 0.0482,
  "Wisconsin": 0.0765,
  "Wyoming": 0.00
};

// Default interest rates by term
const DEFAULT_INTEREST_RATES = {
  10: 5.84,
  15: 5.96,
  30: 6.5
};

// Convert various income types to annual
const convertToAnnualIncome = (income, payType) => {
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

// Calculate FICA taxes (Social Security and Medicare)
const calculateFICATax = (income) => {
  const { socialSecurity, medicare, additionalMedicare, socialSecurityWageCap } = FICA_RATES;
  
  // Social Security has a wage cap
  const socialSecurityTax = Math.min(income, socialSecurityWageCap) * socialSecurity;
  
  // Regular Medicare tax
  let medicareTax = income * medicare;
  
  // Additional Medicare tax for high earners (over $200,000)
  if (income > 200000) {
    medicareTax += (income - 200000) * additionalMedicare;
  }
  
  return {
    socialSecurity: socialSecurityTax,
    medicare: medicareTax,
    total: socialSecurityTax + medicareTax
  };
};

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

// Get property tax rate based on state and county
const getPropertyTaxRate = (state, county) => {
  if (!state || !county || !PROPERTY_TAX_RATES[state]) {
    return null;
  }
  
  // Look up specific county
  if (PROPERTY_TAX_RATES[state][county]) {
    return {
      rate: PROPERTY_TAX_RATES[state][county],
      source: `${county}, ${state}`
    };
  }
  
  // Fallback: calculate state average
  const stateData = PROPERTY_TAX_RATES[state];
  const counties = Object.keys(stateData);
  if (counties.length > 0) {
    const totalRate = counties.reduce((sum, countyName) => sum + stateData[countyName], 0);
    const averageRate = totalRate / counties.length;
    return {
      rate: averageRate,
      source: `${state} average (county not found)`
    };
  }
  
  return null;
};

// Get all counties for a state (combined from property tax data and income tax data)
const getAllCountiesForState = (state) => {
  const counties = new Set();
  
  // Add counties from property tax data
  if (PROPERTY_TAX_RATES[state]) {
    Object.keys(PROPERTY_TAX_RATES[state]).forEach(county => counties.add(county));
  }
  
  // Add counties/cities from income tax data if state has local income tax
  if (STATE_TAX_DATA[state]?.hasLocalTax) {
    switch (state) {
      case 'Indiana':
        Object.keys(INDIANA_COUNTIES).forEach(county => counties.add(county));
        break;
      case 'Maryland':
        Object.keys(MARYLAND_COUNTIES).forEach(county => counties.add(county));
        break;
      case 'Michigan':
        Object.keys(MICHIGAN_CITIES.exceptions).forEach(city => counties.add(city));
        counties.add('Other Michigan City');
        break;
      case 'Missouri':
        Object.keys(MISSOURI_CITIES).forEach(city => counties.add(city));
        break;
      case 'New Jersey':
        Object.keys(NEW_JERSEY_CITIES).forEach(city => counties.add(city));
        break;
      case 'New York':
        Object.keys(NEW_YORK_TAX.cities).forEach(city => counties.add(city));
        break;
      case 'Ohio':
        Object.keys(OHIO_MUNICIPALITIES).forEach(city => counties.add(city));
        break;
      case 'Pennsylvania':
        Object.keys(PENNSYLVANIA_TAX.counties).forEach(county => counties.add(county));
        break;
      case 'West Virginia':
        Object.keys(WEST_VIRGINIA_TAX.cities).forEach(city => counties.add(city));
        break;
    }
  }
  
  return Array.from(counties).sort();
};

// Calculate local tax (city or county)
const calculateLocalTax = (income, state, county) => {
  if (!state || !county) {
    return 0;
  }
  
  // Check if state has local income tax using STATE_TAX_DATA
  if (!STATE_TAX_DATA[state]?.hasLocalTax) {
    return 0;
  }
  
  switch (state) {
    case 'Indiana':
      if (INDIANA_COUNTIES[county]) {
        return income * getTaxRateValue(INDIANA_COUNTIES[county]);
      }
      break;
    case 'Maryland':
      if (MARYLAND_COUNTIES[county]) {
        return income * getTaxRateValue(MARYLAND_COUNTIES[county]);
      }
      break;
    case 'Michigan':
      return calculateMichiganLocalTax(income, county);
    case 'Missouri':
      if (MISSOURI_CITIES[county]) {
        return income * getTaxRateValue(MISSOURI_CITIES[county]);
      }
      break;
    case 'New Jersey':
      if (NEW_JERSEY_CITIES[county]) {
        return income * getTaxRateValue(NEW_JERSEY_CITIES[county]);
      }
      break;
    case 'New York':
      if (NEW_YORK_TAX.cities[county]) {
        const taxResult = calculateNYTax(income, county);
        return taxResult.cityTax;
      }
      break;
    case 'Ohio':
      if (OHIO_MUNICIPALITIES[county]) {
        return income * getTaxRateValue(OHIO_MUNICIPALITIES[county]);
      }
      break;
    case 'Oregon':
      return OREGON_TAX.calculateTax(income).localTax;
    case 'Pennsylvania':
      if (PENNSYLVANIA_TAX.counties[county]) {
        const countyData = PENNSYLVANIA_TAX.counties[county];
        if (countyData.type === "fixed") {
          return income * countyData.value;
        } else if (countyData.type === "range") {
          return income * ((countyData.max + countyData.min) / 2);
        }
      }
      break;
    case 'West Virginia':
      if (WEST_VIRGINIA_TAX.cities[county]) {
        return WEST_VIRGINIA_TAX.calculateTax(county);
      }
      break;
  }
  
  return 0;
};

// Calculate federal tax
const calculateFederalTax = (income) => {
  return calculateProgressiveTax(income, FEDERAL_TAX_BRACKETS_2024);
};

// Calculate state tax (simplified)
const calculateStateTax = (income, state) => {
  if (!state || !STATE_TAX_RATES[state]) return 0;
  return income * STATE_TAX_RATES[state];
};

// Calculate total tax burden
const calculateTotalTax = (income, state, county) => {
  const federalTax = calculateFederalTax(income);
  const ficaTaxes = calculateFICATax(income);
  const stateTax = calculateStateTax(income, state);
  const localTax = calculateLocalTax(income, state, county);
  
  return {
    federal: federalTax,
    fica: ficaTaxes.total,
    ficaSocialSecurity: ficaTaxes.socialSecurity,
    ficaMedicare: ficaTaxes.medicare,
    state: stateTax,
    local: localTax,
    total: federalTax + ficaTaxes.total + stateTax + localTax,
    effectiveRate: (federalTax + ficaTaxes.total + stateTax + localTax) / income
  };
};

// Get affordability color class based on income percentage and debt situation
const getAffordabilityColorClass = (percentage, hasDebts) => {
  if (hasDebts) {
    // Using 36% rule with debts
    if (percentage <= 36) return "green";
    if (percentage <= 42) return "yellow";
    return "red";
  } else {
    // Using 28% rule without debts
    if (percentage <= 28) return "green";
    if (percentage <= 32) return "yellow";
    return "red";
  }
};

const HomeAffordabilityCalculator = () => {
  // Income and tax state
  const [incomeData, setIncomeData] = useState({
    income: '',
    payType: 'annual',
    state: '',
    county: '',
    useCustomTakeHome: false,
    monthlyTakeHome: ''
  });

  // Housing state
  const [housingData, setHousingData] = useState({
    homePrice: '',
    downPaymentType: 'percent',
    downPaymentPercent: '20',
    downPaymentAmount: '',
    loanTermYears: '30',
    interestRate: '6.5',
    includeHomeInsurance: true,
    homeInsurance: '1200',
    enableFHA: false
  });

  // Additional financial details
  const [financialData, setFinancialData] = useState({
    monthlyDebts: ''
  });

  // Results and UI state
  const [errors, setErrors] = useState({});
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('what-can-i-afford');
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [paymentsByTerm, setPaymentsByTerm] = useState(null);
  const [propertyTaxInfo, setPropertyTaxInfo] = useState(null);

  // Set interest rate based on loan term
  useEffect(() => {
    const term = parseInt(housingData.loanTermYears, 10);
    const defaultRate = DEFAULT_INTEREST_RATES[term] || DEFAULT_INTEREST_RATES[30];
    setHousingData(prev => ({ ...prev, interestRate: defaultRate.toString() }));
  }, [housingData.loanTermYears]);

  // Handle FHA toggle and set down payment to 3.5%
  useEffect(() => {
    if (housingData.enableFHA) {
      setHousingData(prev => ({
        ...prev,
        downPaymentPercent: '3.5'
      }));
    }
  }, [housingData.enableFHA]);

  // Calculate down payment amount when percent changes
  useEffect(() => {
    if (housingData.downPaymentType === 'percent' && housingData.homePrice) {
      const homePrice = parseFloat(housingData.homePrice);
      const percent = parseFloat(housingData.downPaymentPercent);
      if (!isNaN(homePrice) && !isNaN(percent)) {
        const amount = homePrice * (percent / 100);
        setHousingData(prev => ({ 
          ...prev, 
          downPaymentAmount: amount.toFixed(0)
        }));
      }
    }
  }, [housingData.downPaymentPercent, housingData.homePrice, housingData.downPaymentType]);

  // Calculate down payment percent when amount changes
  useEffect(() => {
    if (housingData.downPaymentType === 'amount' && housingData.homePrice) {
      const homePrice = parseFloat(housingData.homePrice);
      const amount = parseFloat(housingData.downPaymentAmount);
      if (!isNaN(homePrice) && !isNaN(amount) && homePrice > 0) {
        const percent = (amount / homePrice) * 100;
        setHousingData(prev => ({ 
          ...prev, 
          downPaymentPercent: percent.toFixed(1)
        }));
      }
    }
  }, [housingData.downPaymentAmount, housingData.homePrice, housingData.downPaymentType]);

  // Update property tax info when state/county changes
  useEffect(() => {
    if (incomeData.state && incomeData.county) {
      const propTaxInfo = getPropertyTaxRate(incomeData.state, incomeData.county);
      setPropertyTaxInfo(propTaxInfo);
    } else {
      setPropertyTaxInfo(null);
    }
  }, [incomeData.state, incomeData.county]);

  // Handle changes to income data
  const handleIncomeChange = (field, value) => {
    setIncomeData(prev => {
      // If changing state, reset county
      if (field === 'state') {
        return { ...prev, [field]: value, county: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  // Handle changes to housing data
  const handleHousingChange = (field, value) => {
    setHousingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle changes to financial data
  const handleFinancialChange = (field, value) => {
    setFinancialData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Switch between percentage and amount for down payment
  const handleDownPaymentTypeChange = (type) => {
    setHousingData(prev => ({
      ...prev,
      downPaymentType: type
    }));
  };

  // Validate the input form
  const validateForm = () => {
    const newErrors = {};

    if (!incomeData.useCustomTakeHome) {
      // Validate income inputs
      if (!incomeData.income) {
        newErrors.income = 'Income is required';
      } else if (isNaN(parseFloat(incomeData.income)) || parseFloat(incomeData.income) <= 0) {
        newErrors.income = 'Please enter a valid income amount';
      }

      if (!incomeData.state) {
        newErrors.state = 'State selection is required';
      }
      
      // Always require county selection
      if (!incomeData.county) {
        newErrors.county = 'County selection is required for property tax calculation';
      }
    } else {
      // Validate custom take-home pay
      if (!incomeData.monthlyTakeHome) {
        newErrors.monthlyTakeHome = 'Monthly take-home pay is required';
      } else if (isNaN(parseFloat(incomeData.monthlyTakeHome)) || parseFloat(incomeData.monthlyTakeHome) <= 0) {
        newErrors.monthlyTakeHome = 'Please enter a valid monthly take-home amount';
      }
      
      // Always require county even for custom take-home (for property tax)
      if (!incomeData.state) {
        newErrors.state = 'State selection is required for property tax calculation';
      }
      
      if (!incomeData.county) {
        newErrors.county = 'County selection is required for property tax calculation';
      }
    }

    // If we're analyzing a specific home, validate home price
    if (activeTab === 'analyze-mortgage' && !housingData.homePrice) {
      newErrors.homePrice = 'Home price is required';
    } else if (activeTab === 'analyze-mortgage' && (isNaN(parseFloat(housingData.homePrice)) || parseFloat(housingData.homePrice) <= 0)) {
      newErrors.homePrice = 'Please enter a valid home price';
    }

    // Validate down payment
    if (housingData.downPaymentType === 'percent') {
      if (!housingData.downPaymentPercent || isNaN(parseFloat(housingData.downPaymentPercent)) || 
          parseFloat(housingData.downPaymentPercent) < 0 || parseFloat(housingData.downPaymentPercent) > 100) {
        newErrors.downPaymentPercent = 'Down payment must be between 0% and 100%';
      }
    } else {
      if (!housingData.downPaymentAmount || isNaN(parseFloat(housingData.downPaymentAmount)) || parseFloat(housingData.downPaymentAmount) < 0) {
        newErrors.downPaymentAmount = 'Please enter a valid down payment amount';
      }
    }

    // Validate interest rate
    if (!housingData.interestRate || isNaN(parseFloat(housingData.interestRate)) || parseFloat(housingData.interestRate) < 0) {
      newErrors.interestRate = 'Please enter a valid interest rate';
    }

    // Validate optional financial data
    if (financialData.monthlyDebts && (isNaN(parseFloat(financialData.monthlyDebts)) || parseFloat(financialData.monthlyDebts) < 0)) {
      newErrors.monthlyDebts = 'Please enter a valid monthly debt amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate affordability with proper property tax integration and closing costs
  const calculateAffordability = () => {
    if (!validateForm()) return;

    try {
      let annualIncome = 0;
      let monthlyGrossIncome = 0;
      let monthlyTakeHome = 0;
      let taxResults = { total: 0, federal: 0, fica: 0, state: 0, local: 0, effectiveRate: 0 };
      
      // Calculate gross income and taxes
      if (!incomeData.useCustomTakeHome) {
        // Convert to annual income and calculate taxes including local taxes
        annualIncome = convertToAnnualIncome(incomeData.income, incomeData.payType);
        taxResults = calculateTotalTax(annualIncome, incomeData.state, incomeData.county);
        monthlyGrossIncome = annualIncome / 12;
        const takeHomePay = annualIncome - taxResults.total;
        monthlyTakeHome = takeHomePay / 12;
      } else {
        // Use custom take-home pay
        monthlyTakeHome = parseFloat(incomeData.monthlyTakeHome);
        // Estimate gross income based on take-home pay (assuming ~30% tax rate)
        monthlyGrossIncome = monthlyTakeHome / 0.7;
        annualIncome = monthlyGrossIncome * 12;
      }

      // Parse other inputs
      const monthlyDebts = parseFloat(financialData.monthlyDebts) || 0;
      const hasDebts = monthlyDebts > 0;
      const interestRate = parseFloat(housingData.interestRate) || DEFAULT_INTEREST_RATES[30];
      const loanTermYears = parseInt(housingData.loanTermYears, 10);
      
      // Determine down payment based on type
      let downPaymentPercent, downPaymentAmount;
      if (housingData.downPaymentType === 'percent') {
        downPaymentPercent = parseFloat(housingData.downPaymentPercent);
      } else {
        downPaymentAmount = parseFloat(housingData.downPaymentAmount);
      }
      
      // Calculate affordability ratios
      const frontEndMaxPayment = monthlyGrossIncome * 0.28;
      const backEndMaxPayment = (monthlyGrossIncome * 0.36) - monthlyDebts;
      const maxMonthlyPayment = Math.min(frontEndMaxPayment, backEndMaxPayment);
      
      // Get property tax rate info
      const propTaxInfo = getPropertyTaxRate(incomeData.state, incomeData.county);
      let propertyTaxRate = 0.011; // Default fallback rate (1.1%)
      
      if (propTaxInfo) {
        propertyTaxRate = propTaxInfo.rate;
      }
      
      // Estimate additional housing costs
      let additionalHousingCosts = 0;
      
      // Property tax (always included now)
      const estimatedHomePrice = 300000; // Placeholder for initial calculation
      additionalHousingCosts += (estimatedHomePrice * propertyTaxRate) / 12;
      
      if (housingData.includeHomeInsurance) {
        const annualInsurance = parseFloat(housingData.homeInsurance) || 1200;
        additionalHousingCosts += annualInsurance / 12;
      }
      
      // Add MIP if FHA loan is enabled
      if (housingData.enableFHA) {
        const monthlyMIP = (estimatedHomePrice * 0.0055) / 12;
        additionalHousingCosts += monthlyMIP;
      }
      
      // Adjust max payment to account for property tax and insurance
      const maxPIPayment = maxMonthlyPayment - additionalHousingCosts;
      
      if (maxPIPayment <= 0) {
        setErrors({ 
          general: 'Your expenses and debts are too high relative to your income for a mortgage'
        });
        return;
      }
      
      // Calculate max home price based on the down payment situation with closing costs
      let maxHomePrice, maxLoanAmount;
      
      if (housingData.downPaymentType === 'percent') {
        downPaymentPercent = parseFloat(housingData.downPaymentPercent);
        
        // Calculate iteratively to account for closing costs
        let estimatedHomePrice = calculateMaxHomePrice(
          monthlyGrossIncome,
          interestRate,
          loanTermYears,
          0,
          monthlyDebts
        );
        
        // Iterate to find true max price accounting for closing costs
        for (let i = 0; i < 10; i++) {
          const downPayment = estimatedHomePrice * (downPaymentPercent / 100);
          const loanAmount = estimatedHomePrice - downPayment;
          
          // Calculate closing costs
          let closingCosts = estimatedHomePrice * CLOSING_COST_RATE;
          
          // Add upfront MIP for FHA loans
          if (housingData.enableFHA) {
            closingCosts += loanAmount * UPFRONT_MIP_RATE;
          }
          
          // Total cash needed
          const totalCashNeeded = downPayment + closingCosts;
          
          // Recalculate max home price considering cash requirements
          const adjustedMaxPrice = calculateMaxHomePrice(
            monthlyGrossIncome,
            interestRate,
            loanTermYears,
            totalCashNeeded,
            monthlyDebts
          );
          
          // If the difference is small, we've converged
          if (Math.abs(estimatedHomePrice - adjustedMaxPrice) < 100) {
            maxHomePrice = adjustedMaxPrice;
            break;
          }
          
          estimatedHomePrice = adjustedMaxPrice;
        }
        
        downPaymentAmount = maxHomePrice * (downPaymentPercent / 100);
        maxLoanAmount = maxHomePrice - downPaymentAmount;
      } else {
        // Fixed amount down payment
        const fixedDownPayment = parseFloat(housingData.downPaymentAmount);
        
        // Calculate max loan amount first
        const maxLoanPayment = maxPIPayment;
        const monthlyInterestRate = (interestRate / 100) / 12;
        const numberOfPayments = loanTermYears * 12;
        
        if (monthlyInterestRate === 0) {
          maxLoanAmount = maxLoanPayment * numberOfPayments;
        } else {
          maxLoanAmount = maxLoanPayment * 
            (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments)) / 
            monthlyInterestRate;
        }
        
        maxHomePrice = maxLoanAmount + fixedDownPayment;
        downPaymentAmount = fixedDownPayment;
        downPaymentPercent = (fixedDownPayment / maxHomePrice) * 100;
      }
      
      // Calculate monthly mortgage payment
      const baseMonthlyPayment = calculateMonthlyMortgage(
        maxHomePrice,
        downPaymentAmount,
        interestRate,
        loanTermYears
      );
      
      // Calculate precise property tax and insurance now that we know max home price
      let totalMonthlyPayment = baseMonthlyPayment;
      let monthlyPropertyTax = 0;
      let monthlyInsurance = 0;
      let monthlyMIP = 0;
      
      // Property tax (always calculated now)
      monthlyPropertyTax = (maxHomePrice * propertyTaxRate) / 12;
      totalMonthlyPayment += monthlyPropertyTax;
      
      if (housingData.includeHomeInsurance) {
        const annualInsurance = parseFloat(housingData.homeInsurance) || 1200;
        monthlyInsurance = annualInsurance / 12;
        totalMonthlyPayment += monthlyInsurance;
      }
      
      // Add MIP for FHA loans
      if (housingData.enableFHA) {
        monthlyMIP = (maxHomePrice * 0.0055) / 12;
        totalMonthlyPayment += monthlyMIP;
      }
      
      // Calculate closing costs for display
      const finalClosingCosts = maxHomePrice * CLOSING_COST_RATE;
      let finalUpfrontMIP = 0;
      
      if (housingData.enableFHA) {
        finalUpfrontMIP = maxLoanAmount * UPFRONT_MIP_RATE;
      }
      
      const totalClosingCosts = finalClosingCosts + finalUpfrontMIP;
      const totalCashNeeded = downPaymentAmount + totalClosingCosts;
      
      // Calculate payment options for different terms
      const termOptions = [10, 15, 30];
      const paymentOptions = {};
      
      termOptions.forEach(term => {
        const termInterestRate = DEFAULT_INTEREST_RATES[term] || DEFAULT_INTEREST_RATES[30];
        
        const termPayment = calculateMonthlyMortgage(
          maxHomePrice,
          downPaymentAmount,
          termInterestRate,
          term
        );
        
        let totalTermPayment = termPayment;
        
        // Property tax (always included)
        totalTermPayment += monthlyPropertyTax;
        
        if (housingData.includeHomeInsurance) {
          totalTermPayment += monthlyInsurance;
        }
        
        if (housingData.enableFHA) {
          totalTermPayment += monthlyMIP;
        }
        
        const totalInterest = (termPayment * term * 12) - (maxHomePrice - downPaymentAmount);
        const percentOfGrossIncome = (totalTermPayment / monthlyGrossIncome) * 100;
        const percentOfTakeHomeIncome = (totalTermPayment / monthlyTakeHome) * 100;
        const affordabilityClass = getAffordabilityColorClass(percentOfGrossIncome, hasDebts);
        
        paymentOptions[term] = {
          interestRate: termInterestRate,
          payment: termPayment,
          totalPayment: totalTermPayment,
          totalInterest: totalInterest,
          percentOfGrossIncome: percentOfGrossIncome,
          percentOfTakeHomeIncome: percentOfTakeHomeIncome,
          affordabilityClass: affordabilityClass
        };
      });
      
      // Calculate percentage of gross income
      const percentOfGrossIncome = (totalMonthlyPayment / monthlyGrossIncome) * 100;
      const percentOfTakeHomeIncome = (totalMonthlyPayment / monthlyTakeHome) * 100;
      const affordabilityClass = getAffordabilityColorClass(percentOfGrossIncome, hasDebts);
      
      // Set results for display
      setResults({
        annualIncome: annualIncome,
        monthlyGrossIncome: monthlyGrossIncome,
        monthlyTakeHome: monthlyTakeHome,
        maxHomePrice: maxHomePrice,
        maxLoanAmount: maxLoanAmount,
        downPaymentAmount: downPaymentAmount,
        downPaymentPercent: downPaymentPercent,
        baseMonthlyPayment: baseMonthlyPayment,
        monthlyPropertyTax: monthlyPropertyTax,
        monthlyInsurance: monthlyInsurance,
        monthlyMIP: monthlyMIP,
        totalMonthlyPayment: totalMonthlyPayment,
        percentOfGrossIncome: percentOfGrossIncome,
        percentOfTakeHomeIncome: percentOfTakeHomeIncome,
        affordabilityClass: affordabilityClass,
        taxResults: taxResults,
        enableFHA: housingData.enableFHA,
        propertyTaxRate: propertyTaxRate,
        propertyTaxInfo: propTaxInfo,
        closingCosts: finalClosingCosts,
        upfrontMIP: finalUpfrontMIP,
        totalClosingCosts: totalClosingCosts,
        totalCashNeeded: totalCashNeeded
      });
      
      setPaymentsByTerm(paymentOptions);
      
    } catch (error) {
      console.error("Calculation error:", error);
      setErrors({ general: 'An error occurred during calculations. Please check your inputs.' });
    }
  };
  
  // Calculate affordability for a specific home price with proper property tax integration
  const analyzeMortgage = () => {
    if (!validateForm()) return;
    
    try {
      let annualIncome = 0;
      let monthlyGrossIncome = 0;
      let monthlyTakeHome = 0;
      let taxResults = { total: 0, federal: 0, fica: 0, state: 0, local: 0, effectiveRate: 0 };
      
      // Calculate gross income and taxes
      if (!incomeData.useCustomTakeHome) {
        annualIncome = convertToAnnualIncome(incomeData.income, incomeData.payType);
        taxResults = calculateTotalTax(annualIncome, incomeData.state, incomeData.county);
        monthlyGrossIncome = annualIncome / 12;
        const takeHomePay = annualIncome - taxResults.total;
        monthlyTakeHome = takeHomePay / 12;
      } else {
        monthlyTakeHome = parseFloat(incomeData.monthlyTakeHome);
        // Estimate gross income based on take-home pay (assuming ~30% tax rate)
        monthlyGrossIncome = monthlyTakeHome / 0.7;
        annualIncome = monthlyGrossIncome * 12;
      }
      
      // Parse inputs for the specified home
      const homePrice = parseFloat(housingData.homePrice);
      const monthlyDebts = parseFloat(financialData.monthlyDebts) || 0;
      const hasDebts = monthlyDebts > 0;
      const interestRate = parseFloat(housingData.interestRate) || DEFAULT_INTEREST_RATES[30];
      const loanTermYears = parseInt(housingData.loanTermYears, 10);
      
      // Calculate down payment
      let downPaymentAmount, downPaymentPercent;
      if (housingData.downPaymentType === 'percent') {
        downPaymentPercent = parseFloat(housingData.downPaymentPercent);
        downPaymentAmount = homePrice * (downPaymentPercent / 100);
      } else {
        downPaymentAmount = parseFloat(housingData.downPaymentAmount);
        downPaymentPercent = (downPaymentAmount / homePrice) * 100;
      }
      
      // Calculate loan amount
      const loanAmount = homePrice - downPaymentAmount;
      
      // Calculate monthly mortgage payment
      const baseMonthlyPayment = calculateMonthlyMortgage(
        homePrice,
        downPaymentAmount,
        interestRate,
        loanTermYears
      );
      
      // Get property tax rate info
      const propTaxInfo = getPropertyTaxRate(incomeData.state, incomeData.county);
      let propertyTaxRate = 0.011; // Default fallback rate (1.1%)
      
      if (propTaxInfo) {
        propertyTaxRate = propTaxInfo.rate;
      }
      
      // Calculate property tax and insurance
      let totalMonthlyPayment = baseMonthlyPayment;
      let monthlyPropertyTax = 0;
      let monthlyInsurance = 0;
      let monthlyMIP = 0;
      
      // Property tax (always calculated now)
      monthlyPropertyTax = (homePrice * propertyTaxRate) / 12;
      totalMonthlyPayment += monthlyPropertyTax;
      
      if (housingData.includeHomeInsurance) {
        const annualInsurance = parseFloat(housingData.homeInsurance) || 1200;
        monthlyInsurance = annualInsurance / 12;
        totalMonthlyPayment += monthlyInsurance;
      }
      
      // Add MIP for FHA loans
      if (housingData.enableFHA) {
        monthlyMIP = (homePrice * 0.0055) / 12;
        totalMonthlyPayment += monthlyMIP;
      }
      
      // Calculate closing costs
      const closingCosts = homePrice * CLOSING_COST_RATE;
      let upfrontMIP = 0;
      
      if (housingData.enableFHA) {
        upfrontMIP = loanAmount * UPFRONT_MIP_RATE;
      }
      
      const totalClosingCosts = closingCosts + upfrontMIP;
      const totalCashNeeded = downPaymentAmount + totalClosingCosts;
      
      // Calculate percentage of gross income
      const percentOfGrossIncome = (totalMonthlyPayment / monthlyGrossIncome) * 100;
      const percentOfTakeHomeIncome = (totalMonthlyPayment / monthlyTakeHome) * 100;
      
      // Determine affordability using standard rules
      let isAffordable = false;
      if (hasDebts) {
        const totalMonthlyDebtPayments = totalMonthlyPayment + monthlyDebts;
        const backEndRatio = (totalMonthlyDebtPayments / monthlyGrossIncome) * 100;
        isAffordable = backEndRatio <= 36;
      } else {
        isAffordable = percentOfGrossIncome <= 28;
      }
      
      const affordabilityClass = getAffordabilityColorClass(percentOfGrossIncome, hasDebts);
      
      // Calculate payment options for different terms
      const termOptions = [10, 15, 30];
      const paymentOptions = {};
      
      termOptions.forEach(term => {
        const termInterestRate = DEFAULT_INTEREST_RATES[term] || DEFAULT_INTEREST_RATES[30];
        
        const termPayment = calculateMonthlyMortgage(
          homePrice,
          downPaymentAmount,
          termInterestRate,
          term
        );
        
        let totalTermPayment = termPayment;
        
        // Property tax (always included)
        totalTermPayment += monthlyPropertyTax;
        
        if (housingData.includeHomeInsurance) {
          totalTermPayment += monthlyInsurance;
        }
        
        if (housingData.enableFHA) {
          totalTermPayment += monthlyMIP;
        }
        
        const totalInterest = (termPayment * term * 12) - (homePrice - downPaymentAmount);
        const percentOfGrossIncome = (totalTermPayment / monthlyGrossIncome) * 100;
        const percentOfTakeHomeIncome = (totalTermPayment / monthlyTakeHome) * 100;
        const affordabilityClass = getAffordabilityColorClass(percentOfGrossIncome, hasDebts);
        
        paymentOptions[term] = {
          interestRate: termInterestRate,
          payment: termPayment,
          totalPayment: totalTermPayment,
          totalInterest: totalInterest,
          percentOfGrossIncome: percentOfGrossIncome,
          percentOfTakeHomeIncome: percentOfTakeHomeIncome,
          affordabilityClass: affordabilityClass
        };
      });
      
      // Set results for display
      setResults({
        annualIncome: annualIncome,
        monthlyGrossIncome: monthlyGrossIncome,
        monthlyTakeHome: monthlyTakeHome,
        homePrice: homePrice,
        loanAmount: loanAmount,
        downPaymentAmount: downPaymentAmount,
        downPaymentPercent: downPaymentPercent,
        baseMonthlyPayment: baseMonthlyPayment,
        monthlyPropertyTax: monthlyPropertyTax,
        monthlyInsurance: monthlyInsurance,
        monthlyMIP: monthlyMIP,
        totalMonthlyPayment: totalMonthlyPayment,
        percentOfGrossIncome: percentOfGrossIncome,
        percentOfTakeHomeIncome: percentOfTakeHomeIncome,
        affordabilityClass: affordabilityClass,
        isAffordable: isAffordable,
        taxResults: taxResults,
        enableFHA: housingData.enableFHA,
        propertyTaxRate: propertyTaxRate,
        propertyTaxInfo: propTaxInfo,
        closingCosts: closingCosts,
        upfrontMIP: upfrontMIP,
        totalClosingCosts: totalClosingCosts,
        totalCashNeeded: totalCashNeeded
      });
      
      setPaymentsByTerm(paymentOptions);
      
    } catch (error) {
      console.error("Calculation error:", error);
      setErrors({ general: 'An error occurred during calculations. Please check your inputs.' });
    }
  };
  
  // Handle calculation based on active tab
  const handleCalculate = () => {
    if (activeTab === 'what-can-i-afford') {
      calculateAffordability();
    } else {
      analyzeMortgage();
    }
  };
  
  return (
    <div className="calculator-container">
      <div className="calculator-header">
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'what-can-i-afford' ? 'active' : ''}`}
            onClick={() => setActiveTab('what-can-i-afford')}
          >
            What Can I Afford?
          </button>
          <button 
            className={`tab-button ${activeTab === 'analyze-mortgage' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyze-mortgage')}
          >
            Analyze Mortgage
          </button>
        </div>
      </div>
      
      <div className="calculator-body" style={{ display: 'flex', flexDirection: 'row' }}>
        {/* Left Column - Inputs */}
        <div className="calculator-inputs" style={{ flex: '1', marginRight: '20px' }}>
          {/* Income & Location Section */}
          <div className="input-section">
            <h2>Income & Location</h2>
            
            <div className="input-row">
              <div className="input-group">
                <label>Income Amount</label>
                <input
                  type="number"
                  value={incomeData.income}
                  onChange={(e) => handleIncomeChange('income', e.target.value)}
                  placeholder="Enter income"
                  disabled={incomeData.useCustomTakeHome}
                  className={errors.income ? 'error' : ''}
                />
                {errors.income && <div className="error-message">{errors.income}</div>}
              </div>
              
              <div className="input-group">
                <label>Pay Frequency</label>
                <select
                  value={incomeData.payType}
                  onChange={(e) => handleIncomeChange('payType', e.target.value)}
                  disabled={incomeData.useCustomTakeHome}
                >
                  <option value="hourly">Hourly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
            
            <div className="input-row">
              <div className="input-group">
                <label>State</label>
                <select
                  value={incomeData.state}
                  onChange={(e) => handleIncomeChange('state', e.target.value)}
                  className={errors.state ? 'error' : ''}
                >
                  <option value="">Select State</option>
                  {Object.keys(STATE_TAX_RATES).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && <div className="error-message">{errors.state}</div>}
              </div>
              
              {/* Always show county when state is selected */}
              {incomeData.state && (
                <div className="input-group">
                  <label>County</label>
                  <select
                    value={incomeData.county}
                    onChange={(e) => handleIncomeChange('county', e.target.value)}
                    className={errors.county ? 'error' : ''}
                  >
                    <option value="">Select County</option>
                    {getAllCountiesForState(incomeData.state).map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                  {errors.county && <div className="error-message">{errors.county}</div>}
                  <small className="help-text">Required for property tax calculation{STATE_TAX_DATA[incomeData.state]?.hasLocalTax ? ' and local income tax' : ''}</small>
                </div>
              )}
            </div>
            
            {/* Show property tax rate info when available */}
            {propertyTaxInfo && (
              <div className="property-tax-info">
                <small>
                  <strong>Property tax rate:</strong> {(propertyTaxInfo.rate * 100).toFixed(2)}% ({propertyTaxInfo.source})
                </small>
              </div>
            )}
            
            <div className="input-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={incomeData.useCustomTakeHome}
                  onChange={(e) => handleIncomeChange('useCustomTakeHome', e.target.checked)}
                />
                I know my monthly take-home pay
              </label>
            </div>
            
            {incomeData.useCustomTakeHome && (
              <div className="input-group">
                <label>Monthly Take-Home Pay</label>
                <input
                  type="number"
                  value={incomeData.monthlyTakeHome}
                  onChange={(e) => handleIncomeChange('monthlyTakeHome', e.target.value)}
                  placeholder="Enter monthly take-home pay"
                  className={errors.monthlyTakeHome ? 'error' : ''}
                />
                {errors.monthlyTakeHome && <div className="error-message">{errors.monthlyTakeHome}</div>}
              </div>
            )}
          </div>
          
          {/* Home Details Section */}
          <div className="input-section">
            <h2>Home Details</h2>
            
            {activeTab === 'analyze-mortgage' && (
              <div className="input-group">
                <label>Home Price</label>
                <input
                  type="number"
                  value={housingData.homePrice}
                  onChange={(e) => handleHousingChange('homePrice', e.target.value)}
                  placeholder="Enter home price"
                  className={errors.homePrice ? 'error' : ''}
                />
                {errors.homePrice && <div className="error-message">{errors.homePrice}</div>}
              </div>
            )}
            
            <div className="input-row">
              <div className="input-group">
                <label>Down Payment</label>
                <div className="toggle-input-group">
                  <div className="toggle-buttons">
                    <button
                      type="button"
                      className={`toggle-button ${housingData.downPaymentType === 'percent' ? 'active' : ''}`}
                      onClick={() => handleDownPaymentTypeChange('percent')}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      className={`toggle-button ${housingData.downPaymentType === 'amount' ? 'active' : ''}`}
                      onClick={() => handleDownPaymentTypeChange('amount')}
                    >
                      $
                    </button>
                  </div>
                  
                  {housingData.downPaymentType === 'percent' ? (
                    <input
                      type="number"
                      value={housingData.downPaymentPercent}
                      onChange={(e) => handleHousingChange('downPaymentPercent', e.target.value)}
                      placeholder="Enter percentage"
                      className={errors.downPaymentPercent ? 'error' : ''}
                      disabled={housingData.enableFHA}
                    />
                  ) : (
                    <input
                      type="number"
                      value={housingData.downPaymentAmount}
                      onChange={(e) => handleHousingChange('downPaymentAmount', e.target.value)}
                      placeholder="Enter amount"
                      className={errors.downPaymentAmount ? 'error' : ''}
                    />
                  )}
                </div>
                {errors.downPaymentPercent && <div className="error-message">{errors.downPaymentPercent}</div>}
                {errors.downPaymentAmount && <div className="error-message">{errors.downPaymentAmount}</div>}
              </div>
              
              <div className="input-group">
                <label>Loan Term</label>
                <select
                  value={housingData.loanTermYears}
                  onChange={(e) => handleHousingChange('loanTermYears', e.target.value)}
                >
                  <option value="10">10 years</option>
                  <option value="15">15 years</option>
                  <option value="30">30 years</option>
                </select>
              </div>
            </div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Interest Rate (%)</label>
                <input
                  type="number"
                  value={housingData.interestRate}
                  onChange={(e) => handleHousingChange('interestRate', e.target.value)}
                  step="0.01"
                  min="0"
                  max="15"
                  className={errors.interestRate ? 'error' : ''}
                />
                {errors.interestRate && <div className="error-message">{errors.interestRate}</div>}
              </div>
            </div>
            
            {/* FHA Loan Toggle */}
            <div className="input-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={housingData.enableFHA}
                  onChange={(e) => handleHousingChange('enableFHA', e.target.checked)}
                />
                FHA Loan (5% down payment + upfront MIP charge of 1.75% of the loan amount)
              </label>
            </div>
            
            {/* Simplified advanced options */}
            <div className="toggle-section">
              <button
                type="button"
                className="toggle-advanced-btn"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </button>
              
              {showAdvancedOptions && (
                <div className="advanced-options">
                  <div className="input-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={housingData.includeHomeInsurance}
                        onChange={(e) => handleHousingChange('includeHomeInsurance', e.target.checked)}
                      />
                      Include Home Insurance
                    </label>
                  </div>
                  
                  {housingData.includeHomeInsurance && (
                    <div className="input-group">
                      <label>Annual Home Insurance ($)</label>
                      <input
                        type="number"
                        value={housingData.homeInsurance}
                        onChange={(e) => handleHousingChange('homeInsurance', e.target.value)}
                        min="0"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Financial Details */}
          <div className="input-section">
            <h2>Additional Financial Details</h2>
            
            <div className="input-group">
              <label>Monthly Debt Payments</label>
              <input
                type="number"
                value={financialData.monthlyDebts}
                onChange={(e) => handleFinancialChange('monthlyDebts', e.target.value)}
                placeholder="Car loans, credit cards, etc."
                className={errors.monthlyDebts ? 'error' : ''}
              />
              {errors.monthlyDebts && <div className="error-message">{errors.monthlyDebts}</div>}
            </div>
          </div>
          
          {/* Error message and calculate button */}
          {errors.general && (
            <div className="error-message general-error">{errors.general}</div>
          )}
          
          <button 
            className="calculate-btn"
            onClick={handleCalculate}
          >
            Calculate
          </button>
        </div>

        {/* Right Column - Results */}
        <div className="calculator-results" style={{ flex: '1', marginLeft: '20px' }}>
          {results ? (
            <div className="results">
              <h2>Results Summary</h2>

              {/* Only show mortgage impact section in "Analyze Mortgage" tab when home price is provided */}
              {activeTab === 'analyze-mortgage' && results && results.homePrice && (
                <div className="affordability-visual">
                  <h3>Mortgage Impact on Monthly Budget</h3>
                  <div className="affordability-meter">
                    <div className="meter-header">
                      <span>Monthly Gross Income: {formatCurrency(results.monthlyGrossIncome)}</span>
                      <span className={results.affordabilityClass}>
                        {results.percentOfGrossIncome.toFixed(1)}% of Gross Income
                      </span>
                    </div>
                    <div className="meter-header">
                      <span>Monthly Take-Home: {formatCurrency(results.monthlyTakeHome)}</span>
                      <span className={results.affordabilityClass}>
                        {results.percentOfTakeHomeIncome.toFixed(1)}% of Take-Home Pay
                      </span>
                    </div>
                    <div className="meter-bar">
                      <div 
                        className={`meter-fill ${results.affordabilityClass}`} 
                        style={{width: `${Math.min(results.percentOfGrossIncome * 2, 100)}%`}}
                      ></div>
                    </div>
                    <div className="meter-labels">
                      <span>0%</span>
                      <span>28%</span>
                      <span>32%</span>
                      <span>50%</span>
                    </div>
                    <div className={`affordability-message ${results.affordabilityClass}`}>
                      {results.affordabilityClass === "green" ? (
                        "You are well within budget, you should be proud!"
                      ) : results.affordabilityClass === "yellow" ? (
                        "This house is a little outside of your budget. It is manageable, but you'll need to be more conscious about spending."
                      ) : (
                        "This house is outside of your budget. Maybe another home will be more suitable, but if your heart is set on this one be sure to cut expenses elsewhere."
                      )}
                    </div> 
                  </div>
                </div>
              )}

              {/* Affordability Summary */}
              <div className="result-summary">
                {activeTab === 'what-can-i-afford' ? (
                  <>
                    <div className="result-item total">
                      <span>Maximum Home Price:</span>
                      <span className="highlight">
                        {formatCurrency(results.maxHomePrice)}
                      </span>
                    </div>

                    <div className="result-row">
                      <div className="result-item">
                        <span>Down Payment ({results.downPaymentPercent.toFixed(1)}%):</span>
                        <span>
                          {formatCurrency(results.downPaymentAmount)}
                        </span>
                      </div>

                      <div className="result-item">
                        <span>Loan Amount:</span>
                        <span>
                          {formatCurrency(results.maxLoanAmount)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="result-row">
                      <div className="result-item">
                        <span>Home Price:</span>
                        <span>
                          {formatCurrency(results.homePrice)}
                        </span>
                      </div>
                      
                      <div className="result-item">
                        <span>Loan Amount:</span>
                        <span>
                          {formatCurrency(results.loanAmount)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cash Requirements Summary */}
              <div className="cash-requirements">
                <h3>Cash Requirements</h3>
                <div className="result-item">
                  <span>Down Payment ({results.downPaymentPercent.toFixed(1)}%):</span>
                  <span>{formatCurrency(results.downPaymentAmount)}</span>
                </div>
                <div className="result-item">
                  <span>Closing Costs ({(CLOSING_COST_RATE * 100).toFixed(1)}%):</span>
                  <span>{formatCurrency(results.closingCosts)}</span>
                </div>
                {results.enableFHA && results.upfrontMIP > 0 && (
                  <div className="result-item">
                    <span>Upfront MIP (1.75%):</span>
                    <span>{formatCurrency(results.upfrontMIP)}</span>
                  </div>
                )}
                <div className="result-item total">
                  <span>Total Cash Needed:</span>
                  <span className="highlight">{formatCurrency(results.totalCashNeeded)}</span>
                </div>
              </div>

              {/* Monthly Payment Breakdown */}
              <div className="payment-breakdown">
                <h3>Monthly Payment Breakdown</h3>

                <div className="payment-details">
                  <div className="result-item">
                    <span>Principal & Interest:</span>
                    <span>
                      {formatCurrency(results.baseMonthlyPayment)}
                    </span>
                  </div>

                  {/* Property tax always shown now */}
                  <div className="result-item">
                    <span>Property Tax:</span>
                    <span>
                      {formatCurrency(results.monthlyPropertyTax)}
                    </span>
                  </div>
                  
                  {/* Show property tax rate info */}
                  {results.propertyTaxInfo && (
                    <div className="property-tax-detail">
                      <small>Property tax rate: {(results.propertyTaxRate * 100).toFixed(2)}% ({results.propertyTaxInfo.source})</small>
                    </div>
                  )}

                  {results.monthlyInsurance > 0 && (
                    <div className="result-item">
                      <span>Home Insurance:</span>
                      <span>
                        {formatCurrency(results.monthlyInsurance)}
                      </span>
                    </div>
                  )}

                  {results.enableFHA && results.monthlyMIP > 0 && (
                    <div className="result-item">
                      <span>MIP (Mortgage Insurance Premium):</span>
                      <span>
                        {formatCurrency(results.monthlyMIP)}
                      </span>
                    </div>
                  )}

                  <div className="result-item total">
                    <span>Total Monthly Payment:</span>
                    <span>
                      {formatCurrency(results.totalMonthlyPayment)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Results Toggle Section */}
              <div className="financial-details">
                <button 
                  className="toggle-details-btn"
                  onClick={() => setShowDetailedResults(!showDetailedResults)}
                >
                  {showDetailedResults ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
                </button>
                
                {showDetailedResults && (
                  <div className="detailed-results">
                    {/* Payment options by term */}
                    {paymentsByTerm && (
                      <div className="term-comparison">
                        <h3>Payment Options by Term</h3>

                        <div className="term-options">
                          {Object.entries(paymentsByTerm).map(([term, data]) => (
                            <div key={term} className={`term-option ${data.affordabilityClass}`}>
                              <div className="term-header">
                                <span>{term} Year {term === housingData.loanTermYears ? '(selected)' : ''}</span>
                                <span className="term-payment">{formatCurrency(data.totalPayment)}/mo</span>
                              </div>
                              
                              <div className="term-details">
                                <div className="term-detail">
                                  <span>Rate:</span>
                                  <span>{data.interestRate.toFixed(2)}%</span>
                                </div>
                                
                                <div className="term-detail">
                                  <span>% of Gross Income:</span>
                                  <span>
                                    {data.percentOfGrossIncome.toFixed(1)}%
                                  </span>
                                </div>
                                
                                <div className="term-detail">
                                  <span>% of Take-Home Pay:</span>
                                  <span>
                                    {data.percentOfTakeHomeIncome.toFixed(1)}%
                                  </span>
                                </div>
                                
                                <div className="term-detail">
                                  <span>Total Interest:</span>
                                  <span>{formatCurrency(data.totalInterest)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tax breakdown */}
                    <div className="tax-breakdown">
                      <h3>Tax Breakdown</h3>
                      <div className="result-item">
                        <span>Federal Tax:</span>
                        <span>{formatCurrency(results.taxResults.federal)}/year</span>
                      </div>
                      <div className="result-item">
                        <span>FICA:</span>
                        <span>{formatCurrency(results.taxResults.fica)}/year</span>
                      </div>
                      <div className="result-item">
                        <span>State Tax:</span>
                        <span>{formatCurrency(results.taxResults.state)}/year</span>
                      </div>
                      {results.taxResults.local > 0 && (
                        <div className="result-item">
                          <span>Local Tax:</span>
                          <span>{formatCurrency(results.taxResults.local)}/year</span>
                        </div>
                      )}
                      <div className="result-item total">
                        <span>Total Tax:</span>
                        <span>{formatCurrency(results.taxResults.total)}/year</span>
                      </div>
                      <div className="result-item">
                        <span>Effective Tax Rate:</span>
                        <span>{(results.taxResults.effectiveRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-results">
              <p>Enter your details and click "Calculate" to see results</p>
              
              <div className="calculator-info">
                <h3>How This Calculator Works</h3>
                <p>This calculator uses industry-standard affordability guidelines:</p>
                <ul>
                  <li><strong>28% Rule:</strong> Your monthly mortgage payment should not exceed 28% of your gross monthly income.</li>
                  <li><strong>36% Rule:</strong> Your total monthly debt payments (including mortgage) should not exceed 36% of your gross monthly income.</li>
                </ul>
                <p>The calculator uses these rules to determine either how much home you can afford or whether a specific home price is affordable for you.</p>
                
                <h4>Property Tax Integration</h4>
                <p>Property taxes are automatically calculated based on your selected county and are always included in your monthly payment estimate for accurate affordability calculations.</p>
                
                <h4>Closing Costs & Cash Requirements</h4>
                <p>The calculator accounts for closing costs (5% of home price) and upfront MIP for FHA loans when determining your maximum affordable home price and total cash needed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeAffordabilityCalculator;