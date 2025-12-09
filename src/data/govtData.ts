// Static data for Government Modules - TraceSafe Platform

export const enamCommodityPrices = [
  { market: "Azadpur, Delhi", commodity: "Tomato", minPrice: 1200, maxPrice: 2500, modalPrice: 1800, date: "09-12-2024" },
  { market: "Vashi, Mumbai", commodity: "Potato", minPrice: 800, maxPrice: 1400, modalPrice: 1100, date: "09-12-2024" },
  { market: "Koyambedu, Chennai", commodity: "Onion", minPrice: 1500, maxPrice: 2800, modalPrice: 2200, date: "09-12-2024" },
  { market: "Bowenpally, Hyderabad", commodity: "Green Chilli", minPrice: 3000, maxPrice: 5500, modalPrice: 4200, date: "09-12-2024" },
  { market: "Gultekdi, Pune", commodity: "Cabbage", minPrice: 600, maxPrice: 1000, modalPrice: 800, date: "09-12-2024" },
  { market: "Yeshwanthpur, Bangalore", commodity: "Carrot", minPrice: 1800, maxPrice: 3200, modalPrice: 2500, date: "09-12-2024" },
];

export const enamBatchData = [
  { batchId: "TOM-2024-1001", commodity: "Tomato", farmerName: "Ramesh Kumar", dispatchDate: "08-12-2024", status: "Received" },
  { batchId: "POT-2024-1002", commodity: "Potato", farmerName: "Suresh Patel", dispatchDate: "08-12-2024", status: "Pending" },
  { batchId: "ONI-2024-1003", commodity: "Onion", farmerName: "Mahesh Yadav", dispatchDate: "07-12-2024", status: "Received" },
  { batchId: "CHI-2024-1004", commodity: "Green Chilli", farmerName: "Rajesh Reddy", dispatchDate: "07-12-2024", status: "Received" },
  { batchId: "CAB-2024-1005", commodity: "Cabbage", farmerName: "Ganesh Sharma", dispatchDate: "06-12-2024", status: "Pending" },
];

export const commodityOptions = ["All Commodities", "Tomato", "Potato", "Onion", "Green Chilli", "Cabbage", "Carrot"];
export const stateOptions = ["All States", "Delhi", "Maharashtra", "Tamil Nadu", "Telangana", "Karnataka"];

export const farmerRegistry = {
  totalRegistered: 12847,
  totalVerified: 11234,
  pendingVerification: 1613,
  linkedToTraceSafe: 8956,
};

export const sampleFarmer = {
  farmerId: "AGS-MH-2024-78234",
  name: "Shri Ramchandra Patil",
  state: "Maharashtra",
  district: "Nashik",
  village: "Sinnar",
  landholding: "4.5 Hectares",
  crops: "Onion, Tomato, Grapes",
  registrationStatus: "Registered",
  verificationStatus: "Verified",
  registrationDate: "15-03-2023",
};

export const fssaiLicenseData = {
  licenseNumber: "10024051000123",
  entityName: "Fresh Farm Produce Pvt. Ltd.",
  entityType: "Manufacturer",
  status: "Valid",
  issueDate: "01-04-2022",
  expiryDate: "31-03-2027",
  state: "Maharashtra",
};

export const batchComplianceData = [
  { batchId: "TOM-2024-1001", commodity: "Tomato", riskAssessment: "Low", status: "Compliant", lastUpdated: "09-12-2024" },
  { batchId: "POT-2024-1002", commodity: "Potato", riskAssessment: "Low", status: "Compliant", lastUpdated: "09-12-2024" },
  { batchId: "TOM-102", commodity: "Tomato", riskAssessment: "High", status: "Non-Compliant", lastUpdated: "08-12-2024" },
  { batchId: "ONI-2024-1003", commodity: "Onion", riskAssessment: "Medium", status: "Compliant", lastUpdated: "08-12-2024" },
  { batchId: "POT-234", commodity: "Potato", riskAssessment: "Medium", status: "Under Review", lastUpdated: "07-12-2024" },
];

export const recallNotices = [
  { batchId: "TOM-102", notice: "Quality Deviation Observed - Pesticide residue above permissible limit", date: "08-12-2024" },
  { batchId: "POT-234", notice: "Under Review - Sample collected for laboratory testing", date: "07-12-2024" },
  { batchId: "CHI-089", notice: "Recall Initiated - Contamination detected during routine inspection", date: "05-12-2024" },
];

export const farmerRecords = [
  { farmer_id: "MH234567890121", name: "Ramesh Patil", land: "1.8 Acres", crops: "Tomato, Onion", verified: true, registry_status: "Active" },
  { farmer_id: "OD778901234562", name: "Suresh Kumar", land: "2.1 Acres", crops: "Potato", verified: false, registry_status: "Pending" },
  { farmer_id: "KA112345678903", name: "Anita Devi", land: "3.4 Acres", crops: "Paddy, Maize", verified: true, registry_status: "Active" },
  { farmer_id: "TN990123456784", name: "Muthu Selvan", land: "0.9 Acres", crops: "Groundnut", verified: false, registry_status: "Pending Verification" },
  { farmer_id: "RJ560987123455", name: "Rajesh Sharma", land: "4.2 Acres", crops: "Wheat, Mustard", verified: true, registry_status: "Verified" },
  { farmer_id: "UP345678901236", name: "Amit Yadav", land: "1.2 Acres", crops: "Sugarcane", verified: true, registry_status: "Active" },
  { farmer_id: "PB908172635417", name: "Harpreet Singh", land: "5.0 Acres", crops: "Wheat, Rice", verified: true, registry_status: "Verified" },
  { farmer_id: "GJ112589674328", name: "Dhruv Patel", land: "3.1 Acres", crops: "Cotton", verified: false, registry_status: "Pending" },
  { farmer_id: "BR776512908949", name: "Vikram Jha", land: "1.6 Acres", crops: "Maize", verified: true, registry_status: "Active" },
  { farmer_id: "AP221134789560", name: "Ravi Teja", land: "2.7 Acres", crops: "Chillies, Rice", verified: false, registry_status: "Under Review" },
  { farmer_id: "TS905678234181", name: "Sai Kiran", land: "3.3 Acres", crops: "Turmeric", verified: true, registry_status: "Verified" },
  { farmer_id: "HR667890123452", name: "Sunita Devi", land: "0.8 Acres", crops: "Vegetables", verified: true, registry_status: "Active" },
  { farmer_id: "KL550987612323", name: "Akhil Menon", land: "1.9 Acres", crops: "Banana, Coconut", verified: false, registry_status: "Pending Verification" },
  { farmer_id: "JK441278903454", name: "Imran Khan", land: "2.5 Acres", crops: "Saffron", verified: true, registry_status: "Verified" },
  { farmer_id: "CH339876541265", name: "Karan Gupta", land: "0.7 Acres", crops: "Vegetables", verified: true, registry_status: "Active" },
  { farmer_id: "DL228974561936", name: "Nisha Verma", land: "1.4 Acres", crops: "Florals", verified: false, registry_status: "Pending" },
  { farmer_id: "AS990761234187", name: "Ritu Bora", land: "3.9 Acres", crops: "Tea", verified: true, registry_status: "Active" },
  { farmer_id: "GA112890765438", name: "Francis D'Souza", land: "2.0 Acres", crops: "Cashew, Coconut", verified: true, registry_status: "Verified" },
  { farmer_id: "MN667342189451", name: "Leisang Singh", land: "1.3 Acres", crops: "Pineapple", verified: false, registry_status: "Under Review" },
  { farmer_id: "TR778456901292", name: "Debojit Das", land: "2.6 Acres", crops: "Rice, Jute", verified: true, registry_status: "Active" },
];
