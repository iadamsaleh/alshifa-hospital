const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@alshifa.com";
  const password = bcrypt.hashSync("admin123", 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrator",
      email,
      password,
      role: "ADMIN",
    },
  });

  console.log(`Seeded admin account: ${email}`);

  const doctors = [
    {
      name: "Dr. Ahmed Khan",
      specialization: "Cardiology",
      phone: "0301-1111111",
      email: "ahmed.khan@alshifa.com",
      consultationFee: 1500,
      schedule: { days: ["MON", "WED", "FRI"], times: { start: "09:00", end: "13:00" } },
    },
    {
      name: "Dr. Sara Ali",
      specialization: "General Medicine",
      phone: "0301-2222222",
      email: "sara.ali@alshifa.com",
      consultationFee: 800,
      schedule: { days: ["MON", "TUE", "WED", "THU", "FRI"], times: { start: "10:00", end: "17:00" } },
    },
    { name: "Dr. Imran Sheikh", specialization: "Orthopedics", phone: "0301-3333333", email: "imran.sheikh@alshifa.com", consultationFee: 1200 },
    { name: "Dr. Ayesha Malik", specialization: "Pediatrics", phone: "0301-4444444", email: "ayesha.malik@alshifa.com", consultationFee: 900 },
    {
      name: "Dr. Amjad Mehmood",
      specialization: "General Surgery",
      phone: "0301-6666666",
      email: "amjad.mehmood@alshifa.com",
      consultationFee: 2000,
      title: "Head of Hospital",
    },
    { name: "Dr. Farzana", specialization: "Gynecology", phone: "0301-5555555", email: "farzana@alshifa.com", consultationFee: 1000 },
  ];

  for (const doctor of doctors) {
    await prisma.doctor.upsert({
      where: { email: doctor.email },
      update: {},
      create: doctor,
    });
  }

  console.log(`Seeded ${doctors.length} doctors`);

  const doctorUser = await prisma.user.upsert({
    where: { email: "sara.ali@alshifa.com" },
    update: {},
    create: {
      name: "Dr. Sara Ali",
      email: "sara.ali@alshifa.com",
      password: bcrypt.hashSync("doctor123", 10),
      role: "DOCTOR",
    },
  });

  await prisma.doctor.update({
    where: { email: "sara.ali@alshifa.com" },
    data: { userId: doctorUser.id },
  });

  console.log(`Seeded doctor login: sara.ali@alshifa.com (linked to Dr. Sara Ali)`);

  const rooms = [
    { roomNumber: "101", type: "GENERAL", totalBeds: 4 },
    { roomNumber: "102", type: "GENERAL", totalBeds: 4 },
    { roomNumber: "201", type: "PRIVATE", totalBeds: 1 },
    { roomNumber: "202", type: "PRIVATE", totalBeds: 1 },
    { roomNumber: "301", type: "ICU", totalBeds: 2 },
  ];

  for (const room of rooms) {
    const createdRoom = await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
      create: { ...room, availableBeds: room.totalBeds },
    });

    for (let i = 0; i < room.totalBeds; i++) {
      const bedNumber = `${room.roomNumber}-${String.fromCharCode(65 + i)}`;
      await prisma.bed.upsert({
        where: { roomId_bedNumber: { roomId: createdRoom.id, bedNumber } },
        update: {},
        create: { bedNumber, roomId: createdRoom.id },
      });
    }
  }

  console.log(`Seeded ${rooms.length} rooms with beds`);

  const roomRates = [
    { roomType: "GENERAL", dailyRate: 1000 },
    { roomType: "PRIVATE", dailyRate: 2500 },
    { roomType: "ICU", dailyRate: 5000 },
  ];

  for (const rate of roomRates) {
    await prisma.roomRate.upsert({
      where: { roomType: rate.roomType },
      update: {},
      create: rate,
    });
  }

  console.log(`Seeded ${roomRates.length} room rates`);

  const labTests = [
    { testName: "CBC (Complete Blood Count)", testCode: "CBC", category: "Haematology", price: 500 },
    { testName: "Blood Sugar Fasting", testCode: "BSF", category: "Biochemistry", price: 200 },
    { testName: "Blood Sugar Random", testCode: "BSR", category: "Biochemistry", price: 200 },
    { testName: "Urine RE (Routine Examination)", testCode: "URE", category: "Microbiology", price: 300 },
    { testName: "LFTs (Liver Function Tests)", testCode: "LFT", category: "Biochemistry", price: 800 },
    { testName: "RFTs (Renal Function Tests)", testCode: "RFT", category: "Biochemistry", price: 800 },
    { testName: "Thyroid Profile (T3/T4/TSH)", testCode: "TFT", category: "Biochemistry", price: 1200 },
    { testName: "HBsAg (Hepatitis B)", testCode: "HBSAG", category: "Serology", price: 500 },
    { testName: "Anti HCV (Hepatitis C)", testCode: "HCV", category: "Serology", price: 500 },
    { testName: "Pregnancy Test", testCode: "PREG", category: "Serology", price: 300 },
    { testName: "ECG", testCode: "ECG", category: "Cardiology", price: 500 },
    { testName: "X-Ray Chest", testCode: "XRAY-CHEST", category: "Radiology", price: 700 },
    { testName: "Ultrasound Abdomen", testCode: "USG-ABD", category: "Radiology", price: 1500 },
    { testName: "Typhoid Test (Widal)", testCode: "WIDAL", category: "Microbiology", price: 400 },
    { testName: "ESR", testCode: "ESR", category: "Haematology", price: 200 },
  ];

  for (const test of labTests) {
    await prisma.labTest.upsert({
      where: { testCode: test.testCode },
      update: {},
      create: test,
    });
  }

  console.log(`Seeded ${labTests.length} lab tests`);

  const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const pharmacyItems = [
    { name: "Panadol 500mg tablets", category: "Analgesic", unit: "Tablet", pricePerUnit: 2, stockQuantity: 500, expiryDate: daysFromNow(400), supplier: "GSK Pakistan" },
    { name: "Augmentin 625mg tablets", category: "Antibiotic", unit: "Tablet", pricePerUnit: 45, stockQuantity: 8, expiryDate: daysFromNow(300), supplier: "GSK Pakistan" },
    { name: "Brufen 400mg tablets", category: "Analgesic", unit: "Tablet", pricePerUnit: 3, stockQuantity: 200, expiryDate: daysFromNow(25), supplier: "Abbott" },
    { name: "Flagyl 400mg tablets", category: "Antibiotic", unit: "Tablet", pricePerUnit: 4, stockQuantity: 150, expiryDate: daysFromNow(365), supplier: "Sanofi" },
    { name: "Omeprazole 20mg capsules", category: "Gastrointestinal", unit: "Capsule", pricePerUnit: 8, stockQuantity: 5, expiryDate: daysFromNow(200), supplier: "Getz Pharma" },
    { name: "Ventolin Inhaler", category: "Respiratory", unit: "Inhaler", pricePerUnit: 350, stockQuantity: 30, expiryDate: daysFromNow(-10), supplier: "GSK Pakistan" },
    { name: "ORS Sachet", category: "Electrolyte", unit: "Sachet", pricePerUnit: 15, stockQuantity: 300, expiryDate: daysFromNow(500), supplier: "Local Distributor" },
    { name: "Disprin tablets", category: "Analgesic", unit: "Tablet", pricePerUnit: 2, stockQuantity: 400, expiryDate: daysFromNow(450), supplier: "Reckitt Benckiser" },
    { name: "Cough Syrup 120ml", category: "Respiratory", unit: "Bottle", pricePerUnit: 120, stockQuantity: 60, expiryDate: daysFromNow(250), supplier: "Local Distributor" },
    { name: "Normal Saline 1000ml", category: "IV Fluid", unit: "Bottle", pricePerUnit: 180, stockQuantity: 40, expiryDate: daysFromNow(300), supplier: "Otsuka Pakistan" },
  ];

  for (const item of pharmacyItems) {
    await prisma.pharmacyItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }

  console.log(`Seeded ${pharmacyItems.length} pharmacy items`);

  const procedures = [
    { name: "Oxygen per day", category: "Nursing Care", defaultPrice: 500 },
    { name: "Specialist Visit", category: "Consultation", defaultPrice: 2000 },
    { name: "ECG", category: "Diagnostics", defaultPrice: 500 },
    { name: "Nebulization per session", category: "Respiratory Care", defaultPrice: 300 },
    { name: "IV Drip setup", category: "Nursing Care", defaultPrice: 400 },
    { name: "Dressing/Wound Care", category: "Nursing Care", defaultPrice: 600 },
    { name: "Catheter insertion", category: "Procedures", defaultPrice: 800 },
    { name: "Blood Transfusion", category: "Procedures", defaultPrice: 1500 },
    { name: "Surgical procedure", category: "Surgery", defaultPrice: 5000 },
    { name: "Physiotherapy session", category: "Therapy", defaultPrice: 1000 },
  ];

  for (const procedure of procedures) {
    await prisma.procedure.upsert({
      where: { name: procedure.name },
      update: {},
      create: procedure,
    });
  }

  console.log(`Seeded ${procedures.length} procedures`);

  const num = (parameterName, unit, normalRangeMin, normalRangeMax) => ({
    parameterName,
    unit,
    normalRangeMin,
    normalRangeMax,
    normalRangeText: `${normalRangeMin}-${normalRangeMax} ${unit}`,
    inputType: "numeric",
  });
  const text = (parameterName, options, normalRangeText) => ({
    parameterName,
    unit: null,
    normalRangeMin: null,
    normalRangeMax: null,
    normalRangeText,
    inputType: "text",
    options,
  });

  const labTestTemplates = [
    {
      testName: "CBC (Complete Blood Count)",
      testCode: "CBC",
      parameters: [
        num("HB", "g/dl", 12, 16),
        num("TLC", "/cmm", 4000, 11000),
        num("Platelets", "/cmm", 150000, 400000),
        num("RBCs", "million/cmm", 4.5, 5.5),
        num("HCT", "%", 36, 46),
        num("MCV", "fl", 80, 100),
        num("MCH", "pg", 27, 32),
      ],
    },
    {
      testName: "Blood Sugar Fasting",
      testCode: "BSF",
      parameters: [num("Glucose Fasting", "mg/dl", 70, 100)],
    },
    {
      testName: "Blood Sugar Random",
      testCode: "BSR",
      parameters: [num("Glucose Random", "mg/dl", 70, 140)],
    },
    {
      testName: "LFTs (Liver Function Tests)",
      testCode: "LFT",
      parameters: [
        num("Total Bilirubin", "mg/dl", 0.2, 1.2),
        num("Direct Bilirubin", "mg/dl", 0, 0.3),
        num("SGPT", "U/L", 7, 56),
        num("SGOT", "U/L", 10, 40),
        num("ALP", "U/L", 44, 147),
        num("Total Protein", "g/dl", 6, 8),
      ],
    },
    {
      testName: "RFTs (Renal Function Tests)",
      testCode: "RFT",
      parameters: [
        num("Urea", "mg/dl", 15, 45),
        num("Creatinine", "mg/dl", 0.6, 1.2),
        num("Uric Acid", "mg/dl", 3.5, 7.2),
        num("Sodium", "mEq/L", 135, 145),
        num("Potassium", "mEq/L", 3.5, 5.0),
      ],
    },
    {
      testName: "Thyroid Profile (T3/T4/TSH)",
      testCode: "TFT",
      parameters: [
        num("T3", "ng/dl", 80, 200),
        num("T4", "ug/dl", 5.1, 14.1),
        num("TSH", "mIU/L", 0.4, 4.0),
      ],
    },
    {
      testName: "HBsAg (Hepatitis B)",
      testCode: "HBSAG",
      parameters: [text("Result", ["Reactive", "Non-Reactive"], "Non-Reactive")],
    },
    {
      testName: "Anti HCV (Hepatitis C)",
      testCode: "HCV",
      parameters: [text("Result", ["Reactive", "Non-Reactive"], "Non-Reactive")],
    },
    {
      testName: "Urine RE (Routine Examination)",
      testCode: "URE",
      parameters: [
        text("Color", null, "Pale Yellow"),
        text("Appearance", null, "Clear"),
        num("pH", null, 4.5, 8.0),
        num("Specific Gravity", null, 1.005, 1.03),
        text("Protein", ["Nil", "Trace", "+1", "+2", "+3"], "Nil"),
        text("Glucose", ["Nil", "+1", "+2", "+3"], "Nil"),
        num("RBCs", "/hpf", 0, 2),
        num("Pus Cells", "/hpf", 0, 5),
        text("Casts", null, "Nil"),
        text("Crystals", null, "Nil"),
      ],
    },
    {
      testName: "Typhoid Test (Widal)",
      testCode: "WIDAL",
      parameters: [
        text("TO", ["Negative", "<1:20", "1:20", "1:40", "1:80", "1:160"], "Negative"),
        text("TH", ["Negative", "<1:20", "1:20", "1:40", "1:80", "1:160"], "Negative"),
      ],
    },
    {
      testName: "Pregnancy Test",
      testCode: "PREG",
      parameters: [text("Result", ["Positive", "Negative"], "Negative")],
    },
    {
      testName: "ESR",
      testCode: "ESR",
      parameters: [
        {
          parameterName: "ESR 1st Hour",
          unit: "mm/hr",
          normalRangeMin: 0,
          normalRangeMax: 30,
          normalRangeText: "0-20 mm/hr (Male) / 0-30 mm/hr (Female)",
          inputType: "numeric",
        },
      ],
    },
  ];

  for (const template of labTestTemplates) {
    await prisma.labTestTemplate.upsert({
      where: { testCode: template.testCode },
      update: {},
      create: template,
    });
  }

  console.log(`Seeded ${labTestTemplates.length} lab test templates`);

  const nursingCharges = [
    { name: "General Nursing Care", type: "DAILY", defaultPrice: 500 },
    { name: "ICU Nursing Care", type: "DAILY", defaultPrice: 1500 },
    { name: "Night Shift Nursing", type: "ONETIME", defaultPrice: 800 },
    { name: "Special Nursing Care", type: "ONETIME", defaultPrice: 1200 },
  ];

  for (const charge of nursingCharges) {
    await prisma.nursingCharge.upsert({
      where: { name: charge.name },
      update: {},
      create: charge,
    });
  }

  console.log(`Seeded ${nursingCharges.length} nursing charges`);

  const commonDiagnoses = [
    { name: "Typhoid", category: "Infections" },
    { name: "Malaria", category: "Infections" },
    { name: "Hepatitis A", category: "Infections" },
    { name: "Hepatitis B", category: "Infections" },
    { name: "Hepatitis C", category: "Infections" },
    { name: "Tuberculosis", category: "Infections" },
    { name: "UTI", category: "Infections" },
    { name: "Pneumonia", category: "Infections" },
    { name: "Gastritis", category: "Gastro" },
    { name: "Peptic Ulcer", category: "Gastro" },
    { name: "GERD", category: "Gastro" },
    { name: "IBS", category: "Gastro" },
    { name: "Constipation", category: "Gastro" },
    { name: "Diarrhea", category: "Gastro" },
    { name: "Hypertension", category: "Cardiac" },
    { name: "Angina", category: "Cardiac" },
    { name: "Heart Failure", category: "Cardiac" },
    { name: "Diabetes Type 1", category: "Metabolic" },
    { name: "Diabetes Type 2", category: "Metabolic" },
    { name: "Hypothyroidism", category: "Metabolic" },
    { name: "Hyperthyroidism", category: "Metabolic" },
    { name: "Asthma", category: "Respiratory" },
    { name: "Bronchitis", category: "Respiratory" },
    { name: "COPD", category: "Respiratory" },
    { name: "Allergic Rhinitis", category: "Respiratory" },
    { name: "Anemia", category: "Other" },
    { name: "Arthritis", category: "Other" },
    { name: "Migraine", category: "Other" },
    { name: "Anxiety", category: "Other" },
    { name: "Depression", category: "Other" },
    { name: "Fever", category: "Other" },
    { name: "Viral URTI", category: "Other" },
  ];

  for (const d of commonDiagnoses) {
    await prisma.commonDiagnosis.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }

  console.log(`Seeded ${commonDiagnoses.length} common diagnoses`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
