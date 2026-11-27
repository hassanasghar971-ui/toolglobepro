export const percentageCalculatorTool = {
  slug: "percentage-calculator",
  name: "Percentage Calculator",
  h1: "Percentage Calculator: Percent Of, Change and Difference",
  tagline:
    "Work out percentages, percent change, increases, decreases and differences with every step shown.",
  metaTitle: "Free Percentage Calculator Online",
  metaDescription:
    "Free percentage calculator: find X% of Y, percent change, increase or decrease, percentage difference and reverse percentages with steps. No signup.",
  category: "math-calculators",
  icon: "hash",
  keywords: [
    "percentage calculator",
    "percent calculator",
    "percentage change calculator",
    "percentage increase calculator",
    "percentage decrease calculator",
    "percentage difference calculator",
    "what is x percent of y",
    "how to calculate percentage",
    "reverse percentage calculator",
    "discount percentage calculator",
  ],
  intro:
    "Type two numbers, choose the question you want answered, and get the result together with the formula and every step. All calculations run in your browser, so nothing you enter is sent anywhere.",
  howTo: [
    "Pick the calculation type: percent of, what percent, percent change, add or subtract a percentage, reverse percentage or percentage difference.",
    "Type your two numbers into the labelled fields. Commas and spaces are ignored and negative numbers are accepted.",
    "In add or subtract mode, choose Increase or Decrease.",
    "Set the number of decimal places you need, from 0 to 6.",
    "Read the result, the formula and the step-by-step working, then press Copy result.",
  ],
  sections: [
    {
      heading: "What a percentage tells you",
      paragraphs: [
        "A percentage is a fraction of 100. Saying that 25 percent of a class passed an exam means 25 out of every 100 students, or one quarter of the group. Because the base is always 100, percentages make different quantities easy to compare. A 12 dollar saving on a 40 dollar item and a 30 dollar saving on a 250 dollar item are hard to judge by amount alone, but the first is a 30 percent saving and the second only 12 percent.",
        "Every percentage question has three parts: a part, a whole and a rate. Know any two and you can find the third. The six modes in this calculator are the different ways of asking that question.",
      ],
    },
    {
      heading: "The six calculations explained",
      paragraphs: [
        "X percent of Y multiplies the number by the rate divided by 100. Fifteen percent of 240 is 240 times 0.15, which gives 36. This is the calculation behind tips, sales tax and commissions.",
        "X is what percent of Y divides the part by the whole and multiplies by 100. If you scored 45 points out of 180, you earned 25 percent.",
        "Percentage change compares an ending value with a starting value. Going from 80 to 100 is a 25 percent increase, because the gap of 20 is a quarter of the starting 80.",
        "Add or subtract a percentage gives the new amount directly. Increasing 200 by 20 percent gives 240 and decreasing it by 20 percent gives 160. The calculator also shows the one-step shortcut of multiplying by 1.2 or 0.8.",
        "X is Y percent of what finds the whole when you know a part and its rate. If 30 is 25 percent of a number, the number is 120. It is also the right mode for undoing a discount: if a coat costs 60 after a 25 percent discount, the sale price is 75 percent of the original, so enter 60 and 75 to find that the original price was 80.",
        "Percentage difference compares two values when neither is the starting point. It divides the gap by the average of the two. For 50 and 70 the gap is 20, the average is 60 and the difference is 33.33 percent.",
      ],
    },
    {
      heading: "Percentage change versus percentage difference",
      paragraphs: [
        "These two are often confused. Percentage change has a direction: it starts from one number and moves to another, so going from 50 to 70 is a 40 percent increase while going from 70 back to 50 is a 28.57 percent decrease.",
        "Percentage difference is symmetric. It gives the same answer in either order, 33.33 percent for 50 and 70, because it divides by the average rather than by either value. Use change for before and after situations such as prices, salaries or traffic, and difference when you compare two measurements of equal standing, such as two lab results or two quotes from different suppliers.",
      ],
    },
    {
      heading: "Everyday uses for percentages",
      paragraphs: [
        "Shoppers turn a 30 percent discount into an actual saving and check whether a sale price beats a competitor. Diners work out a tip: 18 percent of a 64 dollar bill is 11.52 dollars. Students convert scores into grades, and employees compare a raise against inflation.",
        "Marketers track conversion rates and website owners track month-over-month growth in visitors. Investors read a percentage change to see how a holding has moved, remembering that a 50 percent loss needs a 100 percent gain to break even.",
      ],
    },
    {
      heading: "Mistakes to avoid",
      paragraphs: [
        "The most common error is using the wrong base. A price that rises 20 percent and then falls 20 percent does not return to where it started: 100 becomes 120 and then 96.",
        "Another is mixing up percentage points with percent. If an interest rate moves from 4 percent to 5 percent, it rises by one percentage point but by 25 percent in relative terms.",
        "Finally, some percentages are undefined. You cannot calculate a percentage change from a starting value of zero, nor express a number as a percentage of zero, so the calculator explains the problem instead of showing a misleading result.",
      ],
    },
  ],
  faqs: [
    {
      q: "How do I calculate X percent of a number?",
      a: "Divide the percentage by 100 and multiply by the number. For 15 percent of 240, 15 divided by 100 is 0.15 and 0.15 times 240 is 36. Choose the X% of Y mode, enter 15 and 240, and the calculator shows the same working along with a table of other common percentages of your number.",
    },
    {
      q: "How do I calculate a percentage increase or decrease?",
      a: "Subtract the starting value from the ending value, divide by the starting value and multiply by 100. Going from 80 to 100 gives 20 divided by 80, which is 25 percent. A negative result means a decrease. Use the percent change mode for this, or the add or subtract mode when you already know the percentage and want the new amount.",
    },
    {
      q: "What is the difference between percentage change and percentage difference?",
      a: "Percentage change measures movement from a starting value to an ending value, so the order matters. Percentage difference compares two values of equal standing and divides the gap by their average, so the order does not matter. Use change for before and after, and difference for side-by-side comparisons.",
    },
    {
      q: "How do I find the original price before a discount?",
      a: "Use the X is Y% of what mode. Enter the sale price as X and the share you actually paid as Y, which is 100 minus the discount. If a coat costs 60 after a 25 percent discount, enter 60 and 75 to find that the original price was 80.",
    },
    {
      q: "Why does the calculator say a value cannot be zero?",
      a: "Some questions have no valid answer when a value is zero. A percentage change from a starting value of zero is undefined, and nothing can be a percentage of a whole of zero. Instead of showing infinity or a misleading figure, the calculator explains which field needs a different number.",
    },
    {
      q: "Are the numbers I enter stored or sent anywhere?",
      a: "No. Every calculation runs in your browser with JavaScript, so your numbers never leave your device and there is nothing to sign up for. When you close or refresh the page the values are gone.",
    },
  ],
  features: [
    "Six calculation modes: percent of, what percent, percent change, add or subtract, reverse percentage and percentage difference",
    "Step-by-step working and the formula for every answer",
    "Adjustable decimal places from 0 to 6",
    "Table of common percentages for any number",
    "One-click copy of the result",
    "Clear messages instead of wrong answers when a value is zero",
    "Runs entirely in your browser with nothing sent to a server",
  ],
  related: ["unit-converter", "timestamp-converter"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default percentageCalculatorTool;
