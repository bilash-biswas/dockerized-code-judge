const { createProblem, addTestCase } = require('./src/db');

const problems = [
  {
    title: "Sum of Two Numbers",
    description_bn: "দুটি সংখ্যার যোগফল নির্ণয় করো। ইনপুটে দুটি পূর্ণসংখ্যা A এবং B দেওয়া থাকবে।",
    input_format_bn: "এক লাইনে দুটি পূর্ণসংখ্যা A এবং B।",
    output_format_bn: "A + B এর মান।",
    difficulty: "Easy",
    test_cases: [
      { input: "10 20", expected_output: "30", is_sample: true },
      { input: "-5 5", expected_output: "0", is_sample: true },
      { input: "100 200", expected_output: "300", is_sample: false },
      { input: "0 0", expected_output: "0", is_sample: false },
      { input: "123 456", expected_output: "579", is_sample: false }
    ]
  },
  {
    title: "Factorial Calculation",
    description_bn: "একটি সংখ্যা N দেওয়া আছে, তার ফ্যাক্টোরিয়াল (N!) নির্ণয় করো।",
    input_format_bn: "একটি পূর্ণসংখ্যা N (0 <= N <= 12)।",
    output_format_bn: "N! এর মান।",
    difficulty: "Easy",
    test_cases: [
      { input: "5", expected_output: "120", is_sample: true },
      { input: "0", expected_output: "1", is_sample: true },
      { input: "3", expected_output: "6", is_sample: false },
      { input: "10", expected_output: "3628800", is_sample: false },
      { input: "1", expected_output: "1", is_sample: false }
    ]
  },
  {
    title: "Even or Odd",
    description_bn: "একটি সংখ্যা ইভেন (জোড়) নাকি অড (বিজোড়) তা বের করো।",
    input_format_bn: "একটি পূর্ণসংখ্যা N।",
    output_format_bn: "'Even' অথবা 'Odd'।",
    difficulty: "Easy",
    test_cases: [
      { input: "4", expected_output: "Even", is_sample: true },
      { input: "7", expected_output: "Odd", is_sample: true },
      { input: "0", expected_output: "Even", is_sample: false },
      { input: "-2", expected_output: "Even", is_sample: false },
      { input: "1001", expected_output: "Odd", is_sample: false }
    ]
  },
  {
    title: "Palindrome Check",
    description_bn: "একটি স্ট্রিং প্যালেণ্ড্রোম কিনা তা যাচাই করো।",
    input_format_bn: "একটি শব্দ (স্ট্রিং)।",
    output_format_bn: "'Yes' অথবা 'No'।",
    difficulty: "Easy",
    test_cases: [
      { input: "madam", expected_output: "Yes", is_sample: true },
      { input: "hello", expected_output: "No", is_sample: true },
      { input: "racecar", expected_output: "Yes", is_sample: false },
      { input: "aba", expected_output: "Yes", is_sample: false },
      { input: "abc", expected_output: "No", is_sample: false }
    ]
  },
  {
    title: "Find Maximum",
    description_bn: "একটি অ্যারে থেকে সর্বোচ্চ সংখ্যাটি খুঁজে বের করো। প্রথম লাইনে N (অ্যারের আকার) এবং পরের লাইনে N টি সংখ্যা থাকবে।",
    input_format_bn: "N এবং N টি পূর্ণসংখ্যা।",
    output_format_bn: "সর্বোচ্চ সংখ্যা।",
    difficulty: "Medium",
    test_cases: [
      { input: "5\n1 5 3 9 2", expected_output: "9", is_sample: true },
      { input: "3\n-1 -5 -2", expected_output: "-1", is_sample: true },
      { input: "1\n10", expected_output: "10", is_sample: false },
      { input: "4\n0 0 0 0", expected_output: "0", is_sample: false },
      { input: "5\n10 20 5 30 15", expected_output: "30", is_sample: false }
    ]
  },
  {
    title: "Fibonacci Number",
    description_bn: "N-তম ফিবোনাচি সংখ্যাটি বের করো (0-indexed, starting from 0, 1, 1, 2...)।",
    input_format_bn: "একটি পূর্ণসংখ্যা N (0 <= N <= 30)।",
    output_format_bn: "N-তম ফিবোনাচি সংখ্যা।",
    difficulty: "Medium",
    test_cases: [
      { input: "0", expected_output: "0", is_sample: true },
      { input: "1", expected_output: "1", is_sample: true },
      { input: "5", expected_output: "5", is_sample: false },
      { input: "10", expected_output: "55", is_sample: false },
      { input: "20", expected_output: "6765", is_sample: false }
    ]
  },
  {
    title: "Reverse String",
    description_bn: "একটি স্ট্রিং উল্টো করে দেখাও।",
    input_format_bn: "একটি স্ট্রিং।",
    output_format_bn: "ইনভার্টেড স্ট্রিং।",
    difficulty: "Easy",
    test_cases: [
      { input: "abc", expected_output: "cba", is_sample: true },
      { input: "Bangla", expected_output: "algnaB", is_sample: true },
      { input: "12345", expected_output: "54321", is_sample: false },
      { input: "a", expected_output: "a", is_sample: false },
      { input: "hello world", expected_output: "dlrow olleh", is_sample: false }
    ]
  },
  {
    title: "Leap Year",
    description_bn: "একটি বছর লিপ ইয়ার কিনা তা বের করো।",
    input_format_bn: "একটি বছর (পূর্ণসংখ্যা)।",
    output_format_bn: "'Yes' অথবা 'No'।",
    difficulty: "Easy",
    test_cases: [
      { input: "2000", expected_output: "Yes", is_sample: true },
      { input: "1900", expected_output: "No", is_sample: true },
      { input: "2024", expected_output: "Yes", is_sample: false },
      { input: "2023", expected_output: "No", is_sample: false },
      { input: "1600", expected_output: "Yes", is_sample: false }
    ]
  },
  {
    title: "Count Vowels",
    description_bn: "একটি স্ট্রিং-এ কতগুলো ভাওয়েল (a, e, i, o, u) আছে তা গণনা করো। ছোট হাত এবং বড় হাতের অক্ষর উভয়ই বিবেচনা করো।",
    input_format_bn: "একটি স্ট্রিং।",
    output_format_bn: "ভাওয়েলের সংখ্যা।",
    difficulty: "Easy",
    test_cases: [
      { input: "Independent", expected_output: "4", is_sample: true },
      { input: "AEIOU", expected_output: "5", is_sample: true },
      { input: "bcdfg", expected_output: "0", is_sample: false },
      { input: "Hello World", expected_output: "3", is_sample: false },
      { input: "apple", expected_output: "2", is_sample: false }
    ]
  },
  {
    title: "Prime Check",
    description_bn: "একটি সংখ্যা প্রাইম (মৌলিক) কিনা তা যাচাই করো।",
    input_format_bn: "একটি সংখ্যা N (N > 1)।",
    output_format_bn: "'Yes' অথবা 'No'।",
    difficulty: "Medium",
    test_cases: [
      { input: "7", expected_output: "Yes", is_sample: true },
      { input: "10", expected_output: "No", is_sample: true },
      { input: "2", expected_output: "Yes", is_sample: false },
      { input: "1", expected_output: "No", is_sample: false },
      { input: "97", expected_output: "Yes", is_sample: false }
    ]
  }
];

async function seed() {
  console.log("Starting seed...");
  for (const p of problems) {
    try {
      const problem = await createProblem(
        p.title, 
        p.description_bn, 
        p.input_format_bn, 
        p.output_format_bn, 
        p.test_cases[0].input, // sample input
        p.test_cases[0].expected_output, // sample output
        p.difficulty
      );
      console.log(`Created problem: ${p.title} (${problem.id})`);
      
      for (const tc of p.test_cases) {
        await addTestCase(problem.id, tc.input, tc.expected_output, tc.is_sample);
      }
      console.log(`Added ${p.test_cases.length} test cases for ${p.title}`);
    } catch (err) {
      console.error(`Error seeding problem ${p.title}:`, err.message);
    }
  }
  console.log("Seed finished.");
  process.exit(0);
}

seed();
