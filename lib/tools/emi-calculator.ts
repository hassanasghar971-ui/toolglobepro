export const emiCalculatorTool = {
  slug: "emi-calculator",
  name: "EMI / Loan Calculator",
  h1: "EMI Calculator: Monthly Loan Payment, Interest and Schedule",
  tagline:
    "Work out your monthly loan payment, total interest and a full payment schedule. Add extra payments to see how much interest you save. Free, private, no sign-up.",
  metaTitle: "EMI Calculator - Loan Payment & Amortization Schedule",
  metaDescription:
    "Free EMI and loan calculator. Get your monthly payment, total interest and a month-by-month schedule, and see how extra payments cut interest. Runs in your browser.",
  category: "math-calculators",
  icon: "trending-up",
  keywords: [
    "emi calculator",
    "loan calculator",
    "loan payment calculator",
    "monthly payment calculator",
    "amortization schedule calculator",
    "car loan calculator",
    "personal loan calculator",
    "loan calculator with extra payments",
  ],
  intro:
    "Before you sign for a car loan, a personal loan or a home loan, you want to know one number first: what will I pay every month? This EMI calculator answers that in a second. Enter the loan amount, the yearly interest rate and the term, and you get the monthly payment, the total interest you will pay over the life of the loan and a full schedule showing how each payment is split between principal and interest. Everything is calculated in your browser, so your numbers stay private.",
  howTo: [
    "Enter the loan amount and choose your currency.",
    "Type the annual interest rate as a percentage, for example 7.5.",
    "Enter the loan term and pick years or months.",
    "Optionally add an extra monthly payment to see how much interest you would save and how much sooner the loan ends.",
    "Read the monthly payment and totals, then open the schedule by year or by month. Use Copy summary or Download schedule (CSV) to keep the result.",
  ],
  sections: [
    {
      heading: "How an EMI is calculated",
      paragraphs: [
        "EMI stands for equated monthly instalment. It is a fixed payment that you make every month until the loan is paid off. The standard formula is EMI = P x r x (1+r)^n / ((1+r)^n - 1), where P is the loan amount, r is the monthly interest rate (the yearly rate divided by 12 and by 100) and n is the number of monthly payments.",
        "If the interest rate is zero, the formula simply divides the loan amount by the number of months. This calculator handles that case as well, so you can check interest-free offers.",
      ],
    },
    {
      heading: "Why early payments are mostly interest",
      paragraphs: [
        "Interest is charged on the balance you still owe. At the start of a loan the balance is at its highest, so a large part of each payment goes to interest and only a small part reduces the debt. As the balance falls, the interest part shrinks and the principal part grows. The schedule table shows this clearly, month by month or year by year.",
        "This is also why a longer term lowers the monthly payment but raises the total cost. A 30 year loan feels cheaper every month than a 15 year loan, yet you pay interest for twice as long.",
      ],
    },
    {
      heading: "Using extra payments to save interest",
      paragraphs: [
        "Any extra money you pay goes straight to the principal, so the balance drops faster and less interest is charged next month. Even a small extra amount can shorten the loan by months or years. Enter an extra monthly payment and the calculator shows the interest you would save and the new payoff time. Before you do this in real life, check that your lender does not charge a prepayment fee.",
      ],
    },
    {
      heading: "What this calculator does not include",
      paragraphs: [
        "The calculator assumes a fixed interest rate, equal monthly payments made at the end of each month and no extra costs. Real loans can also include processing fees, insurance, property tax, a variable rate or daily interest calculation, which can change the final figure. Use the result as a clear estimate for comparing options, and ask your lender for the official numbers before you decide.",
      ],
    },
  ],
  faqs: [
    {
      q: "What does EMI mean?",
      a: "EMI means equated monthly instalment. It is the fixed amount you pay each month to repay a loan, and it covers both interest and part of the principal.",
    },
    {
      q: "Can I use this calculator for a car loan, personal loan or home loan?",
      a: "Yes. It works for any fixed-rate loan with equal monthly payments. Enter the amount, rate and term. For a mortgage, remember that taxes and insurance are not included.",
    },
    {
      q: "How do extra payments change the loan?",
      a: "Extra payments reduce the principal faster, so you are charged less interest and the loan ends sooner. The calculator shows the interest saved and the time saved.",
    },
    {
      q: "Why is my bank's figure slightly different?",
      a: "Banks may add fees, use a different day count, round each payment or apply a variable rate. This calculator uses the standard formula with monthly compounding, so small differences are normal.",
    },
    {
      q: "What is the longest loan term I can enter?",
      a: "You can enter up to 50 years, which is 600 monthly payments. The interest rate can be between 0 and 100 percent.",
    },
    {
      q: "Is my loan information stored or sent anywhere?",
      a: "No. All calculations run in your browser. Nothing you type is uploaded, saved or shared.",
    },
  ],
  features: [
    "Monthly payment, total interest and total cost",
    "Schedule by year or by month",
    "Extra monthly payment with interest and time saved",
    "Terms in years or months, up to 50 years",
    "Nine currencies",
    "Copy summary and download the schedule as CSV",
    "Private: nothing leaves your browser",
  ],
  schemaType: "WebApplication",
  related: ["percentage-calculator", "unit-converter"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default emiCalculatorTool;
