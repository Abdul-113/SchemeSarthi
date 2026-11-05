export const mockUser = {
  name: "Rahul Sharma",
  mobile: "+91-982XXXXXXX",
  aadhar: "XXXX-XXXX-1234",
  income: 420000,
  family: 4,
  caste: "OBC",
  locationType: "Urban",
  location: "Mumbai, Maharashtra",
  locale: "hi",
  bplEligible: true,
  pmayPriority: true,
  documents: {
    aadhar: "valid",
    pan: "pending",
    incomeCert: "expired",
    bank: "valid"
  }
};

export const mockApplications = [
  {
    id: "APP-001",
    scheme: "PMAY Urban",
    status: "rejected",
    ref: "MH/PMY/2026/0456",
    date: "15 Feb 2026",
    progress: 80,
    diagnosis: {
      missing: ["Updated salary slip"],
      ok: ["Aadhar linkage complete"],
      check: ["Property < ₹10L verified"]
    }
  },
  {
    id: "APP-002",
    scheme: "Post Matric Scholarship",
    status: "pending",
    ref: "MH/SCH/2026/0891",
    date: "10 Jan 2026",
    progress: 65,
    diagnosis: null
  },
  {
    id: "APP-003",
    scheme: "Ration Card (BPL)",
    status: "approved",
    ref: "MH/RAT/2025/1102",
    date: "05 Dec 2025",
    progress: 100,
    diagnosis: null
  }
];

export const mockRecommendations = [
  { scheme: "PMAY-G", match: 92 },
  { scheme: "Yuva Nidhi", match: 87 }
];
