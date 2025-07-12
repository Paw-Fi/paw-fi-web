-- =========================================================================================
-- MONEKO pSEO DATABASE SCRIPT (COMPLETE & CORRECTED)
-- This script defines the schema and inserts a comprehensive dataset covering all
-- 42 logical combinations of target groups and financial goals.
-- Running this script from a clean state will resolve any "data not found" errors.
-- =========================================================================================

-- Step 1: Drop existing objects to ensure a clean slate
DROP TABLE IF EXISTS seo_pages_data;

-- Step 2: Create the table with the correct schema
CREATE TABLE seo_pages_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  target_group TEXT NOT NULL,
  financial_goal TEXT NOT NULL,
  region TEXT,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT[],
  intro_content TEXT NOT NULL,
  feature_benefit_snippet TEXT NOT NULL,
  cta_snippet TEXT NOT NULL,
  secondary_content TEXT NOT NULL,
  benefits JSONB NOT NULL DEFAULT '[]'::JSONB,
  faqs JSONB NOT NULL DEFAULT '[]'::JSONB,
  suggestions JSONB NOT NULL DEFAULT '[]'::JSONB,
  related_article_slugs TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS seo_pages_data_slug_idx ON seo_pages_data (slug);
CREATE INDEX IF NOT EXISTS seo_pages_data_target_group_idx ON seo_pages_data (target_group);
CREATE INDEX IF NOT EXISTS seo_pages_data_financial_goal_idx ON seo_pages_data (financial_goal);

-- Step 4: Create a function and trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_pages_data_updated_at
BEFORE UPDATE ON seo_pages_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Add a comment to the table for documentation
COMMENT ON TABLE seo_pages_data IS 'Stores data for programmatic SEO pages with dynamic content variables';

-- Step 6: Insert the comprehensive pSEO data, covering all 42 primary combinations.
INSERT INTO seo_pages_data (
  slug, target_group, financial_goal, region, title, meta_description, keywords,
  intro_content, feature_benefit_snippet, cta_snippet, secondary_content,
  benefits, faqs, suggestions, related_article_slugs
) VALUES

-- ===================================
-- Target Group: STUDENTS (6 of 6 pages)
-- ===================================

('students-budgeting', 'students', 'budgeting', null,
 'Student Budgeting: AI-Powered Financial Planning for College | Moneko',
 'Master student budgeting with Moneko''s AI tools. Track expenses, manage limited income, and build healthy financial habits during college.',
 ARRAY['student budgeting', 'college finances', 'student budget app', 'AI financial planning', 'expense tracking'],
 'Student life comes with unique financial challenges - from textbook costs to irregular income from part-time jobs. Moneko''s AI-powered budgeting tools are specifically designed to help students manage their money effectively while focusing on their studies.',
 'Smart budgeting tools designed for student life, helping you track expenses, set spending limits, and save money on a tight budget.',
 'Start your financial journey with smart student budgeting tools',
 'Our platform understands the reality of student finances: ramen budgets, textbook expenses, and the need to make every dollar count. Get personalized insights that work with your lifestyle.',
 '[{"title": "Textbook & Supply Tracking", "description": "Monitor educational expenses and find savings opportunities."}, {"title": "Part-Time Income Management", "description": "Balance irregular income with consistent budgeting."}, {"title": "Campus Spending Insights", "description": "AI analysis of dining, entertainment, and lifestyle costs"}]'::JSONB,
 '[{"question": "How much should students budget for monthly expenses?", "answer": "Student budgets typically range from $800-2000/month depending on location and lifestyle. Moneko helps you create a realistic budget based on your actual income and necessary expenses."}, {"question": "How can I save money as a student?", "answer": "Focus on textbook rentals, meal planning, student discounts, and tracking small daily expenses. Our AI identifies spending patterns and suggests specific areas for savings."}]'::JSONB,
 '["Help me create a budget for students", "How to save money on a tight student budget?", "Best budgeting strategies for college students"]'::JSONB,
 ARRAY['students-saving', 'students-debt-repayment']),

('students-saving', 'students', 'saving', null,
 'Saving for Students: Build Your First Emergency Fund & Savings Goals | Moneko',
 'Learn how to save money as a student with Moneko''s AI. Track savings goals, build an emergency fund, and create lifelong financial habits on a college budget.',
 ARRAY['student saving', 'college savings plan', 'emergency fund for students', 'how to save money in college', 'saving on a budget'],
 'Saving money as a student can feel impossible, but it''s the first step towards financial freedom. Moneko helps you build an emergency fund and save for goals like a new laptop or spring break, even with a limited or irregular income.',
 'AI-powered tools to help students form powerful saving habits, automate contributions, and reach their financial goals faster.',
 'Build your financial foundation by starting to save today',
 'Moneko makes saving simple and achievable. We help you identify small opportunities to save, automate the process, and watch your money grow, giving you a head start on your financial future.',
 '[{"title": "Micro-Saving Goals", "description": "Set and track small, achievable targets like saving for textbooks or a weekend trip."}, {"title": "Emergency Fund Builder", "description": "Start with a small, manageable goal like a $500 safety net for unexpected costs."}, {"title": "Automated Round-Ups", "description": "Automatically save spare change from your daily coffee or lunch purchases."}]'::JSONB,
 '[{"question": "How much should a student save?", "answer": "Aim to save 10-20% of any income you receive. If you have no income, focus on reducing expenses. Start with a small goal like saving $20/week to build the habit."}, {"question": "What is the best way for students to save?", "answer": "Automate it! Set up a recurring transfer to a separate high-yield savings account right after you get paid, even if it''s a small amount. Moneko can help automate this process."}]'::JSONB,
 '["Help me create a savings plan as a student", "How can I build an emergency fund in college?", "Best saving strategies for students"]'::JSONB,
 ARRAY['students-budgeting', 'students-investing']),

('students-debt-repayment', 'students', 'debt-repayment', null,
 'Student Debt Repayment: Tackle Student Loans & Build Credit | Moneko',
 'Get a head start on student loan repayment with Moneko. Understand your options, from in-school payments to post-graduation strategies, and build good credit.',
 ARRAY['student loan repayment', 'pay off student loans', 'student debt', 'in-school deferment', 'credit building for students'],
 'Student loans can be a major source of stress. Moneko demystifies the repayment process, helping you understand your loans, explore repayment options, and create a plan to become debt-free without overwhelming your post-graduation budget.',
 'Plan your student loan payoff strategy before your first bill is even due, giving you a powerful head start on your financial life.',
 'Take control of your student loans and build a bright financial future',
 'We provide the tools to visualize your debt, model different payment scenarios, and understand how your actions today can save you thousands in interest over the life of your loans.',
 '[{"title": "Loan Repayment Simulator", "description": "Model how extra payments can shorten your loan term and save you money on interest."}, {"title": "Credit Impact Analysis", "description": "Understand how on-time payments will build your credit score from day one."}, {"title": "Post-Graduation Budgeting", "description": "Proactively plan how your loan payments will fit into your future professional salary."}]'::JSONB,
 '[{"question": "Should I make payments on student loans while in school?", "answer": "If you have unsubsidized loans, paying the interest while in school can prevent it from capitalizing (being added to your principal), saving you money in the long run. Even small payments help."}, {"question": "What is the best way to start paying off loans after graduation?", "answer": "First, understand all your loans and their interest rates. Then, choose a strategy: Snowball (smallest balance first for motivation) or Avalanche (highest interest first to save the most money). Moneko can help you decide."}]'::JSONB,
 '["Help me plan my student loan repayment", "How to pay off student loans faster?", "What is the debt avalanche method?"]'::JSONB,
 ARRAY['students-budgeting', 'young-professionals-debt-repayment']),

('students-investing', 'students', 'investing', null,
 'Investing for Students: Start Building Wealth in College | Moneko',
 'Learn how to start investing as a student with Moneko. Even small amounts can grow significantly over time thanks to compound interest. Explore beginner-friendly options.',
 ARRAY['student investing', 'investing for beginners', 'micro-investing apps', 'compound interest', 'custodial account', 'how to invest in college'],
 'As a student, your greatest investing asset is time. Starting to invest now, even with small amounts, can have a massive impact on your future wealth. Moneko makes it easy and accessible for students to get started with investing.',
 'Start investing with as little as $5 and let the power of time and compound interest build your long-term wealth.',
 'Unlock your future wealth by starting to invest today',
 'Don''t wait until you graduate. Our platform demystifies investing with easy-to-understand guides and tools, helping you make your money work for you while you focus on your studies.',
 '[{"title": "Compound Growth Visualizer", "description": "See how investing just $10 a month can grow into a significant sum over 40 years."}, {"title": "Beginner-Friendly Portfolios", "description": "Get started with low-cost, diversified index funds (like S&P 500 ETFs) that are perfect for beginners."}, {"title": "Educational Resources", "description": "Learn the basics of investing, from stocks and bonds to risk management, without the jargon."}]'::JSONB,
 '[{"question": "How can a student with little money start investing?", "answer": "You can start with as little as $5-10 a month using micro-investing apps or buying fractional shares. The key is to build the habit early. The amount can grow as your income does."}, {"question": "Is it risky for students to invest?", "answer": "All investing carries risk. To manage it, start with low-risk, diversified funds and only invest money you won''t need for at least 5-7 years. This gives your money time to grow and recover from market dips."}]'::JSONB,
 '["Help me start investing as a student", "How can I invest $100 as a college student?", "Best investment strategies for students"]'::JSONB,
 ARRAY['students-saving', 'young-professionals-investing']),

('students-retirement', 'students', 'retirement', null,
 'Retirement Planning for Students: The Power of an Early Start | Moneko',
 'It''s never too early to plan for retirement. Learn how students can leverage compound interest to build a massive head start on their retirement goals with Moneko.',
 ARRAY['retirement for students', 'compound interest', 'Roth IRA for young people', 'early retirement planning', 'investing early'],
 'Thinking about retirement as a student might seem strange, but it''s the single most powerful time to start. A small amount saved in your early 20s can be worth more than a much larger amount saved in your 40s. Moneko shows you how.',
 'Unlock the magic of compound interest by starting your retirement savings journey decades before everyone else.',
 'Give your future self the ultimate gift: an early start',
 'We make it simple to open a Roth IRA and start contributing small amounts. Our tools visualize how these early contributions can grow exponentially, setting you up for financial independence later in life.',
 '[{"title": "Compound Interest Simulator", "description": "Visually see how $1,000 invested at age 20 can grow to be more valuable than $10,000 invested at age 40."}, {"title": "Roth IRA Setup Guide", "description": "Step-by-step guidance on opening and contributing to a retirement account as a young person."}, {"title": "Micro-Contribution Goals", "description": "Set small, achievable goals to contribute to your retirement fund from part-time job income."}]'::JSONB,
 '[{"question": "How can a student save for retirement with no money?", "answer": "You need earned income to contribute to an IRA. Even a small part-time or summer job qualifies. The key is to start with any amount, no matter how small, as soon as you have that income."}, {"question": "What is a Roth IRA and why is it good for students?", "answer": "A Roth IRA is a retirement account where you contribute after-tax money. It grows tax-free, and you pay no taxes when you withdraw in retirement. It''s perfect for students who are in a low tax bracket now."}]'::JSONB,
 '["How to start saving for retirement in college?", "Explain compound interest", "Help me open a Roth IRA as a student"]'::JSONB,
 ARRAY['students-investing', 'young-professionals-retirement']),

('students-home-buying', 'students', 'home-buying', null,
 'Planning for a Home as a Student: The Long-Term Game | Moneko',
 'Dreaming of buying a home one day? Learn how students can start planning and saving for a future down payment with Moneko''s long-term goal tools.',
 ARRAY['saving for a house in college', 'future home buyer', 'long-term savings goals', 'down payment planning for students'],
 'While you may not be buying a home tomorrow, the financial habits you build as a student can make your dream of homeownership a reality much sooner. Moneko helps you create a long-term savings plan for a future down payment.',
 'Set a long-term goal for your first home and start building the financial foundation for it today, one dollar at a time.',
 'Turn your future homeownership dream into a concrete plan',
 'We provide tools to help you understand the costs of homeownership, set a realistic down payment goal, and create a dedicated savings bucket that can grow over many years, putting you far ahead of your peers.',
 '[{"title": "Future Down Payment Calculator", "description": "Estimate your future down payment needs based on projected home prices in your desired area."}, {"title": "Long-Term Savings Buckets", "description": "Create a dedicated savings goal for a house and automate small, regular contributions."}, {"title": "Credit Score Foundation", "description": "Learn how managing your finances now builds the credit score you''ll need for a future mortgage."}]'::JSONB,
 '[{"question": "Is it realistic for a student to save for a house?", "answer": "It''s about building the habit and starting early. Saving even $25 a month in a dedicated high-yield account for 10 years can grow into a few thousand dollars, forming the seed of your future down payment."}, {"question": "What should a student focus on to buy a house in the future?", "answer": "Focus on three things: 1) Building an excellent credit score. 2) Avoiding unnecessary debt. 3) Starting a small, consistent savings habit in a separate account. These actions will give you a massive advantage later."}]'::JSONB,
 '["How can a student start saving for a house?", "Plan a long-term down payment goal", "What credit score do I need to buy a house?"]'::JSONB,
 ARRAY['students-saving', 'young-professionals-home-buying']),

-- ===================================
-- Target Group: YOUNG PROFESSIONALS (6 of 6 pages)
-- ===================================

('young-professionals-budgeting', 'young-professionals', 'budgeting', null,
 'Young Professional Budgeting: Smart Money Management for Career Growth | Moneko',
 'Build wealth as a young professional with Moneko''s AI budgeting tools. Balance career growth, lifestyle, and savings with intelligent financial planning.',
 ARRAY['young professional budget', 'career budgeting', 'salary management', 'AI financial planning', 'lifestyle budgeting'],
 'Starting your career brings new financial opportunities and responsibilities. Moneko helps young professionals navigate salary management, lifestyle inflation, and building wealth while enjoying life.',
 'AI-powered budgeting that grows with your career, helping you balance professional development, lifestyle goals, and long-term financial security.',
 'Take control of your finances and accelerate your wealth building',
 'From entry-level to promotions, our platform adapts to your changing income and helps you make smart financial decisions at every career stage.',
 '[{"title": "Salary Optimization", "description": "Maximize your income through strategic budgeting and negotiation insights."}, {"title": "Career Investment Tracking", "description": "Budget for professional development, certifications, and networking."}, {"title": "Lifestyle Balance", "description": "Enjoy your success while building long-term wealth"}]'::JSONB,
 '[{"question": "How much should young professionals save?", "answer": "Aim for a 20% savings rate: 10% for retirement, 5-10% for an emergency fund/goals. Our AI helps optimize this based on your salary and expenses."}, {"question": "How do I avoid lifestyle inflation?", "answer": "Set automatic savings increases with each raise, track discretionary spending, and use our AI to identify when lifestyle costs are growing faster than income."}]'::JSONB,
 '["Help me create a budget for young professionals", "How to achieve budgeting as a young professional?", "Best saving strategies for young professionals"]'::JSONB,
 ARRAY['young-professionals-saving', 'young-professionals-investing']),

('young-professionals-saving', 'young-professionals', 'saving', null,
 'Smart Saving Strategies for Young Professionals | Moneko',
 'Build wealth through intelligent saving with Moneko''s AI tools. Optimize emergency funds, goal-based saving, and automated wealth building.',
 ARRAY['young professional saving', 'emergency fund', 'goal-based saving', 'automated saving', 'AI wealth building'],
 'Building wealth starts with smart saving habits. Moneko helps young professionals optimize their saving strategies, build emergency funds, and automate wealth accumulation.',
 'AI-powered saving strategies that help young professionals build emergency funds and achieve financial goals faster.',
 'Start building serious wealth with automated saving strategies',
 'From emergency funds to down payments, our AI helps you save efficiently and reach your goals faster than traditional approaches.',
 '[{"title": "Emergency Fund Optimization", "description": "Build the right emergency fund size for your situation."}, {"title": "Goal-Based Saving", "description": "Separate savings for different goals with optimal allocation."}, {"title": "Automated Wealth Building", "description": "Set up systems that build wealth without constant attention"}]'::JSONB,
 '[{"question": "How much should young professionals save monthly?", "answer": "Aim for 20% of income: build a 3-6 month emergency fund first, then direct savings to other goals like a down payment or investments. Our AI helps optimize this based on your income and expenses."}, {"question": "What''s the best way to automate saving?", "answer": "Set up automatic transfers right after payday to a high-yield savings account. Use the ''pay yourself first'' method. Our tools help optimize these systems."}]'::JSONB,
 '["Help me create a savings plan for young professionals", "How to build an emergency fund?", "Best saving strategies for young professionals"]'::JSONB,
 ARRAY['young-professionals-budgeting', 'young-professionals-home-buying']),

('young-professionals-debt-repayment', 'young-professionals', 'debt-repayment', null,
 'Student Loan & Debt Payoff for Young Professionals | Moneko',
 'Eliminate debt strategically with Moneko''s AI tools. Optimize student loan payments, credit cards, and build wealth while paying off debt.',
 ARRAY['student loan payoff', 'debt repayment strategy', 'young professional debt', 'AI debt management', 'credit card debt'],
 'Many young professionals start their careers with student loans and other debt. Moneko''s AI helps create optimal payoff strategies while still building wealth and enjoying life.',
 'Smart debt elimination strategies that balance aggressive payoff with wealth building and lifestyle goals.',
 'Become debt-free faster with AI-optimized payoff strategies',
 'Our platform analyzes your debts, income, and goals to create personalized payoff plans that eliminate debt efficiently without sacrificing your future.',
 '[{"title": "Debt Avalanche vs Snowball", "description": "AI determines the optimal payoff strategy for your situation."}, {"title": "Student Loan Optimization", "description": "Navigate forgiveness programs, refinancing, and payment strategies."}, {"title": "Credit Score Improvement", "description": "Strategic debt payoff that maximizes credit score gains"}]'::JSONB,
 '[{"question": "Should I pay off student loans or invest?", "answer": "Compare loan interest rates to expected investment returns. Generally, pay minimums on low-rate loans (<6%) and invest the difference. Aggressively pay high-rate debt first."}, {"question": "What''s the fastest way to pay off debt?", "answer": "The Debt Avalanche (highest interest first) saves the most money. The Debt Snowball (smallest balance first) provides psychological wins. Our AI recommends a strategy based on your personality and situation."}]'::JSONB,
 '["Help me pay off debt as a young professional", "How to eliminate student loans faster?", "Best debt repayment strategies for young professionals"]'::JSONB,
 ARRAY['students-debt-repayment', 'young-professionals-budgeting']),

('young-professionals-investing', 'young-professionals', 'investing', null,
 'Investment Guide for Young Professionals | Moneko',
 'Start building wealth through smart investing with Moneko''s AI guidance. Learn stocks, retirement accounts, and portfolio optimization.',
 ARRAY['young professional investing', 'beginner investing', '401k optimization', 'portfolio management', 'AI investment advice'],
 'Young professionals have the most valuable asset for building wealth: time. Moneko''s AI helps you start investing early and optimize your portfolio for long-term growth.',
 'AI-guided investment strategies designed for young professionals to build wealth through compound growth and smart asset allocation.',
 'Start building serious wealth through intelligent investing',
 'From 401k optimization to building your first investment portfolio, our AI provides personalized guidance based on your risk tolerance and goals.',
 '[{"title": "401k Optimization", "description": "Maximize employer matches and optimize contribution strategies."}, {"title": "Portfolio Diversification", "description": "Build balanced portfolios appropriate for your age and goals."}, {"title": "Tax-Efficient Investing", "description": "Minimize taxes while maximizing long-term growth"}]'::JSONB,
 '[{"question": "How much should young professionals invest?", "answer": "Start by capturing your full employer 401k match, then aim to invest 10-15% of your gross income for retirement. Begin with broad market index funds and increase complexity as you learn."}, {"question": "Should I use a robo-advisor or pick my own stocks?", "answer": "Most young professionals benefit from low-cost index funds or robo-advisors initially. Individual stock picking requires significant time and knowledge investment."}]'::JSONB,
 '["Help me start investing as a young professional", "How to build an investment portfolio?", "Best investing strategies for young professionals"]'::JSONB,
 ARRAY['young-professionals-retirement', 'young-professionals-saving']),

('young-professionals-retirement', 'young-professionals', 'retirement', null,
 'Retirement Planning for Young Professionals | Moneko',
 'Start retirement planning early with Moneko''s AI tools. Optimize 401k contributions, Roth IRAs, and long-term wealth building strategies.',
 ARRAY['retirement planning', 'young professional retirement', '401k strategy', 'Roth IRA', 'AI retirement planning'],
 'Starting retirement planning in your 20s and 30s is the single best financial decision you can make. Moneko''s AI helps young professionals maximize compound growth and build wealth for retirement.',
 'Early retirement planning strategies that leverage compound interest and smart tax planning to build substantial wealth.',
 'Secure your retirement with early planning and compound growth',
 'The earlier you start, the less you need to save monthly. Our AI helps you take advantage of compound interest and time to build retirement wealth efficiently.',
 '[{"title": "Compound Interest Maximization", "description": "Start early to leverage decades of compound growth."}, {"title": "401k and IRA Optimization", "description": "Navigate retirement account rules and maximize benefits."}, {"title": "FIRE Planning", "description": "Strategies for Financial Independence, Retire Early (FIRE)."}]'::JSONB,
 '[{"question": "How much should young professionals save for retirement?", "answer": "Aim for 10-15% of your income including employer match. Starting at 25, saving $500/month can grow to over $1M by retirement through compound interest."}, {"question": "Roth 401k vs Traditional 401k for young professionals?", "answer": "Young professionals often benefit from Roth contributions since they''re likely in lower tax brackets now than in retirement. Our AI helps optimize this decision."}]'::JSONB,
 '["Help me plan retirement as a young professional", "How to maximize my 401k?", "Best retirement strategies for young professionals"]'::JSONB,
 ARRAY['young-professionals-investing', 'entrepreneurs-retirement']),

('young-professionals-home-buying', 'young-professionals', 'home-buying', null,
 'Home Buying Guide for Young Professionals | Moneko',
 'Navigate first-time home buying with Moneko''s AI tools. Plan down payments, understand mortgages, and make smart real estate decisions.',
 ARRAY['first time home buyer', 'young professional real estate', 'down payment planning', 'mortgage strategy', 'AI home buying'],
 'Buying your first home is a major financial milestone for young professionals. Moneko''s AI helps you plan for down payments, understand mortgage options, and make informed decisions.',
 'Complete home buying guidance from down payment planning to mortgage optimization, designed specifically for young professional buyers.',
 'Make smart home buying decisions with AI-powered guidance',
 'From determining how much house you can afford to optimizing your mortgage terms, our AI helps you navigate the complex home buying process.',
 '[{"title": "Down Payment Strategy", "description": "Plan and save for optimal down payment amounts."}, {"title": "Mortgage Optimization", "description": "Compare loan types and terms to minimize long-term costs."}, {"title": "Affordability Analysis", "description": "Determine realistic home prices based on income and goals"}]'::JSONB,
 '[{"question": "How much should young professionals save for a down payment?", "answer": "Aim for 20% to avoid Private Mortgage Insurance (PMI), but many programs allow for 3-5% down. Factor in closing costs (2-5% of home price) and moving expenses."}, {"question": "Should I buy or rent as a young professional?", "answer": "Consider job stability, local market conditions, and the opportunity cost of the down payment. Generally, it makes sense to buy if you plan to stay in one place for 5+ years."}]'::JSONB,
 '["Help me buy a home as a young professional", "How to save for a down payment?", "Best home buying strategies for young professionals"]'::JSONB,
 ARRAY['couples-home-buying', 'young-professionals-saving']),

-- ===================================
-- Target Group: PARENTS (6 of 6 pages)
-- ===================================

('parents-budgeting', 'parents', 'budgeting', null,
 'Family Budgeting for Parents: AI-Powered Financial Planning | Moneko',
 'Manage family finances with confidence using Moneko''s AI budgeting tools. Handle childcare costs, education planning, and family goals efficiently.',
 ARRAY['family budgeting', 'parent budget app', 'childcare costs', 'family financial planning', 'AI budgeting'],
 'Raising a family brings joy and financial complexity. Moneko''s AI understands the unique challenges parents face, from childcare costs to education planning, helping you budget effectively for your family''s needs.',
 'Family-focused budgeting tools that account for childcare, education, healthcare, and all the unexpected costs that come with raising children.',
 'Secure your family''s financial future with smart budgeting',
 'Our platform helps you balance immediate family needs with long-term goals like college savings and retirement, ensuring your family thrives financially.',
 '[{"title": "Childcare Cost Management", "description": "Track and optimize daycare, babysitting, and activity expenses."}, {"title": "Education Planning", "description": "Budget for current school costs and future college expenses."}, {"title": "Family Emergency Planning", "description": "Build larger emergency funds appropriate for family responsibilities"}]'::JSONB,
 '[{"question": "How much should families budget for children?", "answer": "Families typically spend $12,000-$15,000 annually per child. Our AI helps track these costs and find optimization opportunities while maintaining quality of life."}, {"question": "How do I balance family expenses with retirement savings?", "answer": "Prioritize your own retirement savings first (you can''t borrow for retirement). Our tools help optimize this balance based on your family''s situation."}]'::JSONB,
 '["Help me create a budget for parents", "How to manage family expenses?", "Best budgeting strategies for families"]'::JSONB,
 ARRAY['parents-saving', 'parents-retirement']),

('parents-saving', 'parents', 'saving', null,
 'Saving Strategies for Parents: College Funds, Goals & More | Moneko',
 'Plan for your family''s future with Moneko''s saving tools. Learn about 529 plans for college, saving for family vacations, and building a robust emergency fund.',
 ARRAY['saving for college', '529 plan', 'family savings goals', 'parent savings plan', 'UTMA/UGMA accounts'],
 'As a parent, your savings goals expand from personal ambitions to dreams for your children. Moneko helps you strategically save for everything from college tuition and braces to unforgettable family vacations.',
 'AI-powered savings plans that help you prioritize and automate contributions to multiple family goals simultaneously.',
 'Build a secure and bright future for your children',
 'We help you navigate the best ways to save for your kids, like 529 plans and custodial accounts, while ensuring your own financial security is never compromised.',
 '[{"title": "College Savings Planner (529)", "description": "Understand the benefits of 529 plans and set up automated savings goals for education."}, {"title": "Multi-Goal Savings Buckets", "description": "Create and track separate savings funds for different family needs, like a new car, home renovation, or vacation."}, {"title": "Family Emergency Fund", "description": "Calculate and build a 6-9 month emergency fund to protect your family from unexpected events."}]'::JSONB,
 '[{"question": "What is the best way to save for my child''s college?", "answer": "A 529 plan is often the best vehicle due to its tax advantages. Contributions grow tax-deferred, and withdrawals for qualified education expenses are tax-free."}, {"question": "How do I save for multiple goals at once?", "answer": "Prioritize your goals (e.g., retirement first), then automate savings for each. Even small, consistent contributions to each goal add up significantly over time. Moneko helps you allocate funds effectively."}]'::JSONB,
 '["How to save for my child''s education?", "Best savings accounts for parents", "Help me create a family savings plan"]'::JSONB,
 ARRAY['parents-budgeting', 'parents-investing']),
 
('parents-debt-repayment', 'parents', 'debt-repayment', null,
 'Debt Repayment for Parents: Managing Mortgages & Family Debt | Moneko',
 'Create a debt repayment plan that fits your family''s life with Moneko. Strategize paying down your mortgage, car loans, and credit cards while raising kids.',
 ARRAY['family debt', 'mortgage payoff', 'paying off credit cards', 'debt management for parents', 'car loan repayment'],
 'Family life often comes with significant debt, like a mortgage or car loans. Moneko helps parents create a manageable plan to reduce debt, freeing up cash flow for other family priorities and building long-term wealth.',
 'Intelligent debt repayment strategies that help you save on interest and pay off your family''s debts faster.',
 'Free your family from debt and create more financial freedom',
 'Our platform helps you visualize the impact of extra payments on your mortgage and other loans, showing you the fastest path to becoming debt-free without sacrificing your family''s quality of life.',
 '[{"title": "Mortgage Payoff Accelerator", "description": "See how small extra principal payments can shave years off your mortgage and save thousands in interest."}, {"title": "Family Debt Consolidation Analysis", "description": "Analyze whether consolidating high-interest credit card debt into a single lower-interest loan is right for you."}, {"title": "Cash Flow Optimization", "description": "Identify areas in your budget to redirect towards aggressive debt repayment."}]'::JSONB,
 '[{"question": "Should we pay off our mortgage early?", "answer": "It depends on your mortgage''s interest rate compared to potential investment returns. If you have a low-rate mortgage (<5%), you may be better off investing extra money. Moneko can help you analyze this trade-off."}, {"question": "What debt should our family pay off first?", "answer": "Typically, you should aggressively pay down high-interest debt like credit cards first, while making minimum payments on lower-interest debt like mortgages or federal student loans."}]'::JSONB,
 '["How to pay off our mortgage faster?", "Family debt repayment plan", "Best way to pay off credit card debt"]'::JSONB,
 ARRAY['parents-budgeting', 'couples-debt-repayment']),

('parents-investing', 'parents', 'investing', null,
 'Investing for Parents: Build Wealth for Your Family''s Future | Moneko',
 'Learn how to invest as a parent with Moneko. Balance your retirement goals with investing for your children''s future using smart, AI-driven strategies.',
 ARRAY['investing for parents', 'family investment plan', 'UTMA/UGMA accounts', 'investing for children', 'balancing retirement and college savings'],
 'Investing as a parent is a powerful way to secure your family''s long-term financial future. Moneko helps you navigate the options, from your own retirement to accounts for your children, ensuring you''re building wealth for the next generation.',
 'AI-driven investment plans that help parents balance their own retirement with saving and investing for their children''s future.',
 'Secure your family''s legacy through smart investing',
 'Our platform provides the clarity you need to make confident investment decisions for your family, helping you manage multiple goals at once.',
 '[{"title": "Goal-Based Portfolio Allocation", "description": "Tailor investment strategies for different goals, like long-term retirement and medium-term college savings."}, {"title": "Custodial Account Guidance (UTMA/UGMA)", "description": "Understand and manage investment accounts for your kids that offer tax benefits."}, {"title": "Risk Management for Families", "description": "Build a resilient portfolio that protects your family''s financial foundation while aiming for growth."}]'::JSONB,
 '[{"question": "Should I prioritize my retirement or my kids'' college?", "answer": "Financial experts strongly advise securing your own retirement first—you can get loans for college, but not for retirement. Moneko helps you plan for both, but with the right priorities."}, {"question": "What''s the difference between a 529 and a custodial account (UTMA)?", "answer": "A 529 plan offers tax advantages specifically for qualified education expenses. A custodial account (UTMA/UGMA) is more flexible and can be used for anything, but the assets legally transfer to the child once they reach adulthood."}]'::JSONB,
 '["Help me create an investment plan for my family", "How to invest for my children''s future?", "Best investment strategies for parents"]'::JSONB,
 ARRAY['parents-saving', 'parents-retirement']),

('parents-retirement', 'parents', 'retirement', null,
 'Retirement Planning for Parents: Securing Your Future and Theirs | Moneko',
 'Navigate retirement planning as a parent with Moneko. Learn to balance saving for your own retirement with the costs of raising children and saving for their college.',
 ARRAY['retirement planning for parents', 'balancing retirement and college savings', 'family retirement plan', '401k for parents'],
 'Planning for retirement while raising children presents a unique challenge. Moneko helps parents prioritize their own financial future, ensuring they can retire comfortably without burdening their children later in life.',
 'AI-powered retirement planning that accounts for family-related expenses and helps you stay on track for your own goals.',
 'Confidently plan for your retirement while providing for your family',
 'It''s the classic "put on your own oxygen mask first" scenario. We provide tools to maximize your 401k and IRA contributions, helping you create a secure retirement plan that is the best gift you can give your children.',
 '[{"title": "Retirement vs. College Savings", "description": "Tools to help you allocate funds effectively between your retirement accounts and your children''s college funds."}, {"title": "Spousal IRA Strategies", "description": "Learn how a working spouse can contribute to an IRA for a non-working or low-income spouse, boosting family retirement savings."}, {"title": "Catch-Up Contribution Planner", "description": "If you''re over 50, plan to take advantage of higher contribution limits to accelerate your savings."}]'::JSONB,
 '[{"question": "How much should parents save for retirement?", "answer": "Aim to save at least 15% of your household income for retirement. It''s crucial to prioritize this over college savings, as there are many ways to fund education, but limited options for retirement."}, {"question": "We feel behind on retirement savings because of kids. What can we do?", "answer": "First, automate your savings. Second, ensure you''re getting any employer 401k match. Third, use Moneko''s tools to find areas in your budget to trim and redirect to savings. Finally, plan to use catch-up contributions after age 50."}]'::JSONB,
 '["Retirement planning tips for parents", "How to balance retirement and college funds?", "Best retirement accounts for parents"]'::JSONB,
 ARRAY['parents-investing', 'couples-retirement']),

('parents-home-buying', 'parents', 'home-buying', null,
 'Home Buying for Parents: Finding the Right Home for Your Family | Moneko',
 'Plan your family''s home purchase or upgrade with Moneko. Analyze affordability considering school districts, space needs, and family budgets.',
 ARRAY['family home buying', 'upgrading your home', 'buying a house with kids', 'school district real estate', 'family mortgage'],
 'Buying a home as a parent involves more than just floor plans; it''s about schools, safety, and space to grow. Moneko helps you navigate the complexities of buying a family home, ensuring your purchase is a wise financial and lifestyle decision.',
 'Family-centric home affordability analysis that factors in school quality, childcare costs, and long-term family needs.',
 'Find the perfect nest for your growing family with smart financial planning',
 'We help you determine a realistic budget for a larger home, plan for the costs of selling your current one, and secure a mortgage that fits comfortably within your family''s financial picture.',
 '[{"title": "Upgrade Affordability Calculator", "description": "Calculate how much more home you can afford, factoring in the equity from your current home."}, {"title": "School District Cost Analysis", "description": "Compare property taxes and home values across different school districts to make an informed choice."}, {"title": "Family Budget Integration", "description": "Model how a new, larger mortgage payment will impact your overall family budget and other savings goals."}]'::JSONB,
 '[{"question": "How do we know if we should move or renovate?", "answer": "Compare the total cost of renovating and staying (including potential disruptions) with the cost of moving (including realtor fees, closing costs, and moving expenses). Moneko can help you model both financial scenarios."}, {"question": "How much does the school district affect home value?", "answer": "Highly-rated school districts can significantly increase home values and property taxes. It''s a key factor in both the initial cost and the home''s future resale value. Our tools help you weigh these factors."}]'::JSONB,
 '["How to buy a bigger house for our family?", "Should we move or renovate?", "Family home buying checklist"]'::JSONB,
 ARRAY['parents-budgeting', 'couples-home-buying']),

-- ===================================
-- Target Group: COUPLES (6 of 6 pages)
-- ===================================

('couples-budgeting', 'couples', 'budgeting', null,
 'Couple Budgeting: Joint Financial Planning Made Simple | Moneko',
 'Navigate shared finances with your partner using Moneko''s AI tools. Merge budgets, align goals, and build wealth together with intelligent planning.',
 ARRAY['couple budgeting', 'joint finances', 'shared budget app', 'relationship money management', 'AI financial planning'],
 'Managing money as a couple requires communication, planning, and the right tools. Moneko helps couples align their financial goals, merge their budgets effectively, and build wealth together.',
 'Collaborative budgeting tools designed for couples to manage joint expenses, individual goals, and shared financial dreams.',
 'Build your future together with unified financial planning',
 'From combining incomes to planning major purchases, our AI helps couples navigate the complexities of shared financial responsibility while respecting individual needs.',
 '[{"title": "Joint Account Management", "description": "Track shared expenses and individual contributions fairly."}, {"title": "Goal Alignment Tools", "description": "Merge individual financial goals into cohesive couple objectives."}, {"title": "Financial Communication Frameworks", "description": "Structured approaches to discussing money and making financial decisions."}]'::JSONB,
 '[{"question": "How should couples split shared expenses?", "answer": "Common approaches include 50/50, proportional to income, or a hybrid ''yours, mine, and ours'' method. Our AI helps you find the method that works best for your relationship and financial situation."}, {"question": "How do we budget for individual and shared goals?", "answer": "Allocate percentages for joint goals (home, vacation) and individual goals (hobbies, personal purchases). Our tools help balance these priorities effectively."}]'::JSONB,
 '["Help me create a budget for couples", "How to manage shared finances?", "Best budgeting strategies for couples"]'::JSONB,
 ARRAY['couples-saving', 'couples-debt-repayment']),

('couples-saving', 'couples', 'saving', null,
 'Saving Together: A Couple''s Guide to Reaching Joint Goals | Moneko',
 'Achieve your shared dreams faster with Moneko. We help couples create joint savings plans for big goals like a wedding, a down payment, or a dream vacation.',
 ARRAY['saving as a couple', 'joint savings account', 'saving for a wedding', 'couple savings goals', 'shared financial goals'],
 'Combining your efforts is the superpower of couple finances. Moneko provides the tools for you and your partner to set, track, and crush your shared savings goals, turning your future dreams into a present-day plan.',
 'Collaborative savings tools that make it easy and motivating to save for your biggest life goals together.',
 'Team up to build your dream future, one savings goal at a time',
 'Whether you''re saving for a ring, a house, or a trip around the world, our platform helps you create a unified plan, automate your contributions, and celebrate your progress as a team.',
 '[{"title": "Joint Goal Planner", "description": "Set a target amount and date for your big goals and track your combined progress in real-time."}, {"title": "Automated Joint Contributions", "description": "Set up automatic transfers from both of your accounts into a shared high-yield savings account."}, {"title": "Contribution Tracker", "description": "Fairly track who has contributed what towards a shared goal to ensure transparency and fairness."}]'::JSONB,
 '[{"question": "Should we have a joint savings account?", "answer": "A joint high-yield savings account is excellent for shared goals as it promotes transparency and teamwork. Many couples find success by also maintaining their own individual savings accounts for personal goals."}, {"question": "How do we decide which savings goal to prioritize?", "answer": "Have an open conversation about what''s most important to you both in the short-term and long-term. Rank your goals together and use Moneko to create a plan that allocates your savings accordingly."}]'::JSONB,
 '["How to save for a house as a couple?", "Best joint savings strategies", "Help us create a savings plan for our wedding"]'::JSONB,
 ARRAY['couples-budgeting', 'couples-home-buying']),

('couples-debt-repayment', 'couples', 'debt-repayment', null,
 'Tackling Debt as a Couple: A Unified Strategy for Freedom | Moneko',
 'Pay off debt faster by working as a team. Moneko helps couples combine their financial power to eliminate student loans, credit cards, and other debts.',
 ARRAY['paying off debt together', 'couple debt strategy', 'joint debt repayment', 'marrying someone with debt'],
 'Whether you entered the relationship with debt or accumulated it together, tackling it as a team is the fastest way to freedom. Moneko provides a framework for couples to create a unified debt-repayment strategy.',
 'Collaborative debt-payoff tools that help you decide on a strategy and track your progress to becoming debt-free together.',
 'Unite against your debt and accelerate your journey to freedom',
 'Our platform helps you lay all your debts on the table, analyze the numbers without emotion, and build a powerful, unified plan to eliminate them, strengthening your financial and personal relationship.',
 '[{"title": "Joint Debt Analysis", "description": "Combine all your individual debts into one clear picture to see the total amount and average interest rate."}, {"title": "Team Payoff Planner", "description": "Decide together whether to use the Avalanche or Snowball method on your combined debts."}, {"title": "Financial Transparency Tools", "description": "Create a safe space to discuss financial histories and build a plan based on honesty and teamwork."}]'::JSONB,
 '[{"question": "My partner has a lot of debt. Am I responsible for it?", "answer": "Legally, you are generally not responsible for debt your partner incurred before marriage. However, their debt can impact your joint ability to get loans (like a mortgage). Tackling it together is often a smart financial decision for the household."}, {"question": "How do we decide whose debt to pay off first?", "answer": "From a purely mathematical standpoint, you should always pay off the debt with the highest interest rate first, regardless of whose name is on it. This saves the most money."}]'::JSONB,
 '["How to pay off debt as a couple?", "My partner has student loans, what do we do?", "Debt repayment strategies for married couples"]'::JSONB,
 ARRAY['couples-budgeting', 'parents-debt-repayment']),

('couples-investing', 'couples', 'investing', null,
 'Investing as a Couple: Building Your Joint Portfolio | Moneko',
 'Build long-term wealth together with Moneko. We help couples align their investment strategies, manage joint taxable accounts, and plan for a prosperous future.',
 ARRAY['investing for couples', 'joint investment account', 'couple investment strategy', 'aligning risk tolerance'],
 'Investing as a couple can significantly accelerate your wealth-building journey. Moneko helps you and your partner align on goals, risk tolerance, and strategy to build a powerful joint investment portfolio.',
 'Collaborative investment tools that help couples merge their financial goals into a single, cohesive investment strategy.',
 'Build your empire together through smart, unified investing',
 'From opening a joint brokerage account to designing a portfolio that reflects your shared vision, our platform provides the guidance you need to invest confidently as a team.',
 '[{"title": "Risk Tolerance Alignment", "description": "Tools and questionnaires to help you and your partner find a shared investment risk level you''re both comfortable with."}, {"title": "Joint Portfolio Builder", "description": "Design a diversified portfolio that is geared towards your shared long-term goals, like retirement or financial independence."}, {"title": "Taxable Account Management", "description": "Learn the benefits and strategies for managing a joint taxable brokerage account for goals outside of retirement."}]'::JSONB,
 '[{"question": "What if my partner and I have different risk tolerances?", "answer": "This is very common. The key is to communicate and compromise. You might decide on a portfolio that is a middle ground, or you can maintain separate individual investment accounts alongside a more conservatively invested joint account."}, {"question": "Should we have a joint investment account?", "answer": "A joint taxable investment account can be great for simplifying your financial life and working towards shared non-retirement goals. For retirement, it''s often best to maximize your individual tax-advantaged accounts (like 401ks and IRAs) first."}]'::JSONB,
 '["How to start investing as a couple?", "Best investment strategies for couples", "Help us align our investment goals"]'::JSONB,
 ARRAY['couples-retirement', 'couples-saving']),

('couples-retirement', 'couples', 'retirement', null,
 'Retirement Planning for Couples: Designing Your Dream Future Together | Moneko',
 'Plan your retirement as a team with Moneko. We help couples combine their retirement accounts, optimize savings, and create a shared vision for their golden years.',
 ARRAY['retirement planning for couples', 'joint retirement goals', 'spousal IRA', 'how much to save for retirement as a couple'],
 'Retirement planning is a team sport. Moneko helps couples merge their individual financial pictures into a single, powerful retirement strategy, ensuring you can both enjoy a long, comfortable, and shared retirement.',
 'A holistic view of your combined retirement assets, helping you optimize contributions and create a unified withdrawal strategy.',
 'Plan, save, and dream of a shared retirement together',
 'Our platform helps you answer the big questions: When can we retire? How much do we need? We combine your 401ks, IRAs, and other assets to give you a clear picture of your shared future.',
 '[{"title": "Joint Retirement Calculator", "description": "Combine your and your partner''s retirement savings to see your joint retirement readiness number."}, {"title": "Spousal IRA Strategy", "description": "Optimize your savings by allowing a working spouse to contribute to an IRA for a non-working or lower-income partner."}, {"title": "Social Security Optimization", "description": "Analyze different claiming strategies for both partners to maximize your total lifetime benefits as a couple."}]'::JSONB,
 '[{"question": "How much does a couple need to save for retirement?", "answer": "A common rule of thumb is to aim for a nest egg of 25 times your desired annual retirement spending. For example, to spend $80,000 per year, you''d need $2 million saved. Moneko can help you calculate a more personalized number."}, {"question": "How do we manage our retirement accounts as a couple?", "answer": "First, you should each maximize your own tax-advantaged accounts like 401ks and IRAs. Think of these as two pillars supporting your one shared retirement goal. View the total portfolio as one, even if it''s in separate accounts."}]'::JSONB,
 '["How much do we need to retire as a couple?", "Retirement planning for married couples", "Social Security strategies for couples"]'::JSONB,
 ARRAY['couples-investing', 'parents-retirement']),

('couples-home-buying', 'couples', 'home-buying', null,
 'Home Buying for Couples: A Joint Path to Your First Home | Moneko',
 'Navigate buying a home together with Moneko. We help couples merge finances for a down payment, understand joint mortgages, and make a smart purchase.',
 ARRAY['home buying for couples', 'joint mortgage', 'first home together', 'saving for a house as a couple', 'couple real estate'],
 'Buying a home is often a couple''s first major financial step together. Moneko simplifies the process, helping you align your goals, combine your financial power, and navigate the journey to homeownership with confidence.',
 'Collaborative tools for couples to plan a down payment, analyze joint affordability, and streamline the home buying process.',
 'Build your life together, starting with your new home',
 'From clarifying how much you can afford to strategizing your down payment, our AI-powered platform provides the clarity you need to buy a home as a team.',
 '[{"title": "Joint Affordability Calculator", "description": "Get a clear picture of what you can afford by combining both incomes and debts."}, {"title": "Shared Down Payment Planner", "description": "Create a unified savings plan and track your progress toward your down payment goal together."}, {"title": "Credit Score Analysis", "description": "Understand how both of your credit scores impact your mortgage eligibility and rates."}]'::JSONB,
 '[{"question": "How do our credit scores affect a joint mortgage?", "answer": "Lenders typically consider the lower of the two credit scores when determining eligibility and interest rates. It''s crucial for both partners to have good credit or to work on improving the lower score before applying."}, {"question": "How should we title the house?", "answer": "Common options include ''Joint Tenancy with Right of Survivorship'' or ''Tenancy in Common''. Each has different legal implications for ownership and inheritance. It''s wise to consult with a real estate attorney to decide what''s best for you."}]'::JSONB,
 '["Help us create a home buying plan as a couple", "How to save for a down payment together?", "Calculate our joint mortgage affordability"]'::JSONB,
 ARRAY['young-professionals-home-buying', 'couples-saving']),

-- ===================================
-- Target Group: FREELANCERS (6 of 6 pages)
-- ===================================

('freelancers-budgeting', 'freelancers', 'budgeting', null,
 'Freelancer Budgeting: Manage Variable Income with AI | Moneko',
 'Master freelance finances with Moneko''s AI budgeting tools. Handle irregular income, plan for taxes, and build financial stability as a freelancer.',
 ARRAY['freelancer budgeting', 'variable income budget', 'freelance finances', 'irregular income planning', 'AI financial management'],
 'Freelancing offers freedom but comes with financial unpredictability. Moneko''s AI helps freelancers manage variable income, plan for tax obligations, and build the financial stability needed for long-term success.',
 'Specialized budgeting tools for freelancers that handle income fluctuations, tax planning, and business expense tracking.',
 'Achieve financial stability with smart freelancer budgeting',
 'Our platform understands the feast-or-famine cycle of freelance work, helping you smooth out income volatility and build a sustainable financial foundation.',
 '[{"title": "Income Smoothing", "description": "Average irregular income across months for stable budgeting."}, {"title": "Tax Reserve Management", "description": "Automatically set aside money for quarterly tax payments."}, {"title": "Business Expense Tracking", "description": "Separate personal and business expenses for better financial clarity."}]'::JSONB,
 '[{"question": "How much should freelancers save for taxes?", "answer": "Set aside 25-30% of gross income for taxes, depending on your tax bracket. Our AI tracks this automatically and reminds you about quarterly payments."}, {"question": "How do I budget with irregular freelance income?", "answer": "Use a baseline budget based on your lowest monthly income, then allocate extra earnings to savings and goals. Our tools help smooth out income fluctuations."}]'::JSONB,
 '["Help me create a budget for freelancers", "How to manage variable income?", "Best budgeting strategies for freelancers"]'::JSONB,
 ARRAY['freelancers-saving', 'freelancers-retirement']),

('freelancers-saving', 'freelancers', 'saving', null,
 'Saving for Freelancers: Build a Safety Net with Irregular Income | Moneko',
 'Master saving as a freelancer with Moneko. Our AI tools help you manage variable income, build a robust emergency fund, and save for long-term goals.',
 ARRAY['freelancer savings', 'saving with variable income', 'emergency fund for freelancers', 'self-employed savings', 'irregular income saving'],
 'For freelancers, a strong savings plan is not a luxury—it''s the foundation of financial stability. Moneko is designed for the reality of variable income, helping you build a robust emergency fund and save consistently, even when your income isn''t.',
 'Smart saving tools that help freelancers automate savings based on income percentage, ensuring you save more in good months.',
 'Create financial stability in your freelance career',
 'Our platform helps you smooth out the feast-or-famine cycle. We''ll help you create a plan to set aside money for taxes, emergencies, and big goals, so you can focus on your work with peace of mind.',
 '[{"title": "Percentage-Based Savings", "description": "Automatically save a percentage of every payment you receive, adapting to your income flow."}, {"title": "Robust Emergency Fund", "description": "Plan for a larger emergency fund (6-12 months of expenses) to cover income gaps."}, {"title": "Tax Savings Bucket", "description": "Create a separate, dedicated savings account for your estimated quarterly taxes so you''re never caught off guard."}]'::JSONB,
 '[{"question": "How much should a freelancer save for an emergency fund?", "answer": "Due to income volatility, freelancers should aim for a larger emergency fund than traditional employees—ideally 6 to 12 months of essential living expenses."}, {"question": "What is the best way to save with irregular income?", "answer": "Pay yourself a fixed ''salary'' each month into your personal account from your business account. On high-income months, the surplus stays in the business account to cover your salary during lower-income months. Also, save a fixed percentage of every single invoice."}]'::JSONB,
 '["Help me create a savings plan for a freelancer", "How to build an emergency fund with variable income?", "Best saving strategies for the self-employed"]'::JSONB,
 ARRAY['freelancers-budgeting', 'freelancers-investing']),

('freelancers-debt-repayment', 'freelancers', 'debt-repayment', null,
 'Debt Repayment for Freelancers: Paying Off Debt with Variable Income | Moneko',
 'Create a flexible debt repayment plan for your freelance life. Moneko helps you make consistent progress on debt even when your income fluctuates.',
 ARRAY['freelancer debt', 'debt repayment variable income', 'paying off loans as a freelancer'],
 'Paying down debt with a variable income requires a different strategy. Moneko helps freelancers create a flexible plan to consistently tackle debt, allocating more in high-income months and ensuring progress in leaner times.',
 'Flexible debt repayment plans that adapt to your freelance cash flow, helping you get out of debt without the stress.',
 'Conquer your debt with a plan built for the freelance life',
 'We help you create a baseline debt payment for your budget, with a strategy to make larger "lump sum" payments when you land big projects, accelerating your journey to being debt-free.',
 '[{"title": "Variable Payment Planning", "description": "Set a minimum monthly payment and a target ''power payment'' for high-income months."}, {"title": "Debt-to-Income Analysis", "description": "Track your debt-to-income ratio to see your progress and improve your financial health."}, {"title": "Emergency Fund Priority", "description": "Guidance on building a solid emergency fund before aggressively tackling debt, which is crucial for freelancers."}]'::JSONB,
 '[{"question": "How do I pay off debt with an irregular income?", "answer": "Establish a budget with a minimum debt payment you can make even in a slow month. When you have a high-income month, allocate a significant portion of the extra income directly to your highest-interest debt."}, {"question": "Should I pay off debt or save as a freelancer?", "answer": "For freelancers, having a robust emergency fund (6+ months of expenses) is critical. Build this first while making minimum debt payments. Once your emergency fund is solid, you can aggressively tackle high-interest debt."}]'::JSONB,
 '["How to pay off debt as a freelancer?", "Debt repayment with irregular income", "Help me create a debt plan"]'::JSONB,
 ARRAY['freelancers-budgeting', 'entrepreneurs-debt-repayment']),

('freelancers-investing', 'freelancers', 'investing', null,
 'Investing for Freelancers: Building Wealth with Variable Income | Moneko',
 'Learn to invest consistently as a freelancer with Moneko. We help you manage investments with a fluctuating income and plan for long-term growth.',
 ARRAY['freelancer investing', 'investing with variable income', 'self-employed investing', 'SEP IRA for freelancers'],
 'Investing with a variable income can be challenging, but it''s essential for long-term wealth. Moneko helps freelancers create a disciplined investment plan that works with their cash flow, not against it.',
 'Flexible investing strategies that allow you to invest more in good months and maintain consistency through automation.',
 'Build your long-term wealth, one project at a time',
 'Our platform helps you set up automated investments and provides guidance on retirement accounts for the self-employed, like SEP IRAs, so you can build a secure future.',
 '[{"title": "Automated Percentage Investing", "description": "Automatically invest a set percentage of every client payment, ensuring consistency."}, {"title": "Retirement Account Guidance", "description": "Explore and manage self-employed retirement plans like a SEP IRA or Solo 401k."}, {"title": "Lump-Sum Investment Strategy", "description": "Guidance on how to effectively invest windfalls from large projects or year-end profits."}]'::JSONB,
 '[{"question": "How can I invest regularly with an irregular income?", "answer": "Pay yourself a regular ''salary'' and set up automated investments from that amount. Additionally, commit to investing a certain percentage (e.g., 20%) of any income that comes in above your monthly needs."}, {"question": "What are the best investment accounts for freelancers?", "answer": "A SEP IRA or Solo 401k are excellent choices as they allow for high contribution limits and are designed for self-employed individuals. A traditional or Roth IRA is also a great starting point."}]'::JSONB,
 '["How to invest as a freelancer?", "Best investment accounts for self-employed", "Investing with irregular income"]'::JSONB,
 ARRAY['freelancers-retirement', 'freelancers-saving']),

('freelancers-retirement', 'freelancers', 'retirement', null,
 'Retirement Planning for Freelancers: Your Guide to a Secure Future | Moneko',
 'As a freelancer, you are your own retirement plan. Moneko helps you navigate SEP IRAs, Solo 401ks, and other options to build a secure retirement.',
 ARRAY['freelancer retirement', 'self-employed retirement plan', 'SEP IRA', 'Solo 401k for freelancers', 'retirement savings for gig workers'],
 'Without an employer 401k, freelancers must take charge of their own retirement. Moneko demystifies the process, helping you choose the right account, calculate your contributions, and build a nest egg that supports your independent lifestyle.',
 'Powerful retirement planning tools designed for the self-employed, helping you maximize your savings and tax advantages.',
 'Be your own boss now, and be your own hero in retirement',
 'Our platform helps you leverage the unique advantages available to freelancers, like high contribution limits on SEP IRAs and Solo 401ks, to build substantial wealth for your future.',
 '[{"title": "SEP IRA & Solo 401k Planner", "description": "Compare retirement plans for the self-employed and calculate your maximum allowable contribution."}, {"title": "Automated Retirement Savings", "description": "Set up rules to automatically transfer a percentage of your income to your retirement account."}, {"title": "Retirement Goal Tracking", "description": "See how your freelance contributions are tracking towards your ultimate retirement independence number."}]'::JSONB,
 '[{"question": "What''s the best retirement plan for a freelancer?", "answer": "It depends on your income. A SEP IRA is simple and allows you to contribute up to 25% of your net adjusted self-employment income. A Solo 401k can be even better, as it allows for both ''employee'' and ''employer'' contributions, often resulting in a higher total limit."}, {"question": "How much should a freelancer save for retirement?", "answer": "Aim to save 15-20% of your income for retirement. Because your income is variable, it''s crucial to be disciplined and save more in high-earning months to make up for leaner ones."}]'::JSONB,
 '["How to save for retirement as a freelancer?", "SEP IRA vs Solo 401k", "Best retirement accounts for freelancers"]'::JSONB,
 ARRAY['freelancers-investing', 'entrepreneurs-retirement']),

('freelancers-home-buying', 'freelancers', 'home-buying', null,
 'Home Buying for Freelancers: How to Get a Mortgage | Moneko',
 'Navigate the challenges of buying a home as a freelancer. Moneko helps you organize your finances, prove your income, and qualify for a mortgage.',
 ARRAY['freelancer mortgage', 'home buying self-employed', 'getting a mortgage with variable income', '1099 income mortgage'],
 'Buying a home as a freelancer can feel daunting, but it''s entirely achievable with the right preparation. Moneko helps you get your financial documents in order and present a strong case to mortgage lenders.',
 'Get your finances "mortgage-ready" with tools designed to track income, organize expenses, and prove your financial stability.',
 'Turn your freelance success into homeownership reality',
 'We help you navigate the specific requirements for self-employed borrowers, such as providing two years of tax returns and maintaining clean financial records, to make your home-buying journey smooth and successful.',
 '[{"title": "Income Documentation Organizer", "description": "Easily track and categorize your income and expenses to prepare your profit and loss statements."}, {"title": "Tax Return Analysis", "description": "Understand how lenders view your tax returns and what they look for in terms of stable, qualifying income."}, {"title": "Savings & Down Payment Planner", "description": "Build a strong savings history and plan your down payment to present the strongest possible application."}]'::JSONB,
 '[{"question": "How do lenders calculate a freelancer''s income for a mortgage?", "answer": "Lenders typically average your net income (after business expenses) from the last two years of your tax returns. They want to see stable or increasing income over that period."}, {"question": "What documents do I need to get a mortgage as a freelancer?", "answer": "You''ll typically need at least two years of personal and business tax returns, a year-to-date profit and loss statement, and several months of personal and business bank statements."}]'::JSONB,
 '["How to get a mortgage as a freelancer?", "Home buying guide for the self-employed", "What do I need to buy a house as a freelancer?"]'::JSONB,
 ARRAY['freelancers-saving', 'entrepreneurs-home-buying']),

-- ===================================
-- Target Group: ENTREPRENEURS (6 of 6 pages)
-- ===================================

('entrepreneurs-budgeting', 'entrepreneurs', 'budgeting', null,
 'Entrepreneur Budgeting: Business & Personal Finance Management | Moneko',
 'Balance business and personal finances with Moneko''s AI tools. Track cash flow, separate business expenses, and plan for entrepreneurial success.',
 ARRAY['entrepreneur budgeting', 'business personal finance', 'startup budgeting', 'cash flow management', 'AI business planning'],
 'Entrepreneurs face unique challenges managing both business and personal finances. Moneko''s AI helps separate these concerns while optimizing cash flow and building wealth through business success.',
 'Comprehensive budgeting for entrepreneurs balancing business investments, personal needs, and long-term wealth building.',
 'Scale your business while securing your personal financial future',
 'Our platform helps entrepreneurs make smart decisions about reinvestment vs. personal financial security, ensuring both business growth and personal wealth building.',
 '[{"title": "Business-Personal Separation", "description": "Clear boundaries between business and personal expenses."}, {"title": "Cash Flow Optimization", "description": "Manage irregular business income and plan for growth investments."}, {"title": "Wealth Building Strategy", "description": "Balance business reinvestment with personal financial goals."}]'::JSONB,
 '[{"question": "How do entrepreneurs separate business and personal budgets?", "answer": "Maintain separate bank accounts, pay yourself a consistent salary, and track business expenses meticulously. Our AI helps categorize and optimize both budgets."}, {"question": "How much should entrepreneurs save personally vs. reinvest?", "answer": "First, build a personal emergency fund. Then, the decision to reinvest depends on your business''s potential ROI vs. the guaranteed returns of paying down debt or the expected returns of investing personally. It''s a balance of risk and opportunity."}]'::JSONB,
 '["Help me create a budget for my business", "How to separate business and personal finances?", "Best budgeting strategies for entrepreneurs"]'::JSONB,
 ARRAY['entrepreneurs-saving', 'entrepreneurs-investing']),

('entrepreneurs-saving', 'entrepreneurs', 'saving', null,
 'Saving for Entrepreneurs: Building Capital for Business & Life | Moneko',
 'Master the art of saving as an entrepreneur with Moneko. Build a business war chest for opportunities, a personal emergency fund, and save for future goals.',
 ARRAY['entrepreneur savings', 'business savings account', 'saving for business growth', 'retained earnings'],
 'For entrepreneurs, saving isn''t just personal—it''s strategic. It''s about building capital to seize opportunities, weather downturns, and fund growth. Moneko helps you build and manage both your business and personal savings.',
 'Strategic savings tools that help you distinguish between personal safety nets and business capital for growth.',
 'Fuel your business growth and secure your personal life with a powerful savings strategy',
 'We help you create a disciplined approach to retaining earnings in the business for future investment, while consistently building your own personal savings and emergency fund for ultimate security.',
 '[{"title": "Business Opportunity Fund", "description": "Create a dedicated savings fund within your business to quickly act on growth opportunities."}, {"title": "Personal Emergency Fund", "description": "Build a robust 6-12 month personal emergency fund to separate your family''s security from business volatility."}, {"title": "Profit-First Saving Method", "description": "Implement a system to allocate a percentage of every revenue dollar to profit and savings first."}]'::JSONB,
 '[{"question": "How much cash should a business keep on hand?", "answer": "A common guideline is to have 3-6 months of operating expenses in a business savings account. This provides a cushion to manage cash flow fluctuations and unexpected costs."}, {"question": "What''s the difference between saving and retaining earnings?", "answer": "Saving is setting money aside. Retained earnings are the cumulative profits that a business has saved over time and not paid out as dividends. These retained earnings are a key source of funding for future growth."}]'::JSONB,
 '["How to save money as a business owner?", "Building a business emergency fund", "Profit-First method for entrepreneurs"]'::JSONB,
 ARRAY['entrepreneurs-budgeting', 'freelancers-saving']),

('entrepreneurs-debt-repayment', 'entrepreneurs', 'debt-repayment', null,
 'Debt Management for Entrepreneurs: Business Loans & Personal Debt | Moneko',
 'Strategically manage and pay down debt as an entrepreneur. Moneko helps you handle business loans, lines of credit, and personal debt to optimize cash flow.',
 ARRAY['business debt management', 'paying off business loans', 'SBA loan repayment', 'entrepreneur debt strategy'],
 'Entrepreneurs often use debt as a tool for growth, but it must be managed wisely. Moneko helps you create a strategy to service business debt effectively while also paying down any personal loans, optimizing your company''s and your own financial health.',
 'An integrated view of your business and personal debt, helping you create an optimal repayment strategy for both.',
 'Leverage debt wisely and create a clear path to profitability',
 'Our platform helps you analyze the terms of your business loans, create a cash flow-conscious repayment plan, and balance your obligations to grow your business sustainably.',
 '[{"title": "Business Loan Amortization", "description": "Track the payoff progress of your business loans and see how extra payments can reduce total interest paid."}, {"title": "Good Debt vs. Bad Debt Analysis", "description": "Differentiate between strategic business debt that fuels growth and high-interest personal debt that drains wealth."}, {"title": "Cash Flow-Based Repayment", "description": "Plan your debt service around your business''s cash flow cycles to avoid financial strain."}]'::JSONB,
 '[{"question": "Should my business take on debt to grow?", "answer": "Strategic debt can be a powerful growth lever if the expected return on the investment (e.g., new equipment, marketing) is significantly higher than the interest rate of the loan. It''s a calculated risk."}, {"question": "How do I pay off business debt faster?", "answer": "Improve your business''s profitability and cash flow, then dedicate a portion of the increased profit to making extra principal payments on your highest-interest business loans."}]'::JSONB,
 '["How to manage business loan debt?", "Debt strategies for entrepreneurs", "Paying off an SBA loan"]'::JSONB,
 ARRAY['entrepreneurs-budgeting', 'freelancers-debt-repayment']),

('entrepreneurs-investing', 'entrepreneurs', 'investing', null,
 'Investing for Entrepreneurs: Reinvest in Business vs. Personal Portfolio | Moneko',
 'Navigate the critical investment decisions of an entrepreneur with Moneko. Learn to balance reinvesting in your business with building a diversified personal portfolio.',
 ARRAY['entrepreneur investing', 'reinvesting in business', 'building personal wealth', 'diversification for business owners'],
 'The entrepreneur''s biggest investment is their business, but true wealth comes from diversification. Moneko helps you answer the critical question: "Should I reinvest the next dollar in my business or in my personal portfolio?"',
 'Sophisticated tools to help you analyze the risk and reward of reinvesting in your business versus diversifying into public markets.',
 'Build an empire, not just a company, by investing wisely',
 'Your business is your engine for wealth creation. Our platform helps you use that engine to fund a diversified personal investment portfolio, creating long-term security that exists outside of your company.',
 '[{"title": "Business Reinvestment ROI Calculator", "description": "Analyze the potential return on investment for new business projects or expansions."}, {"title": "Personal Portfolio Diversification", "description": "Create a plan to systematically move profits from your business into a diversified, low-cost personal investment portfolio."}, {"title": "Wealth Concentration Risk Analysis", "description": "Understand the risk of having your entire net worth tied up in your business and create a strategy to mitigate it."}]'::JSONB,
 '[{"question": "Should I reinvest in my business or invest in the stock market?", "answer": "Early on, reinvesting in your own high-growth business can offer the highest returns. As the business matures, it becomes crucial to de-risk by systematically investing profits into a diversified personal portfolio (e.g., index funds)."}, {"question": "How can an entrepreneur build wealth outside their business?", "answer": "Pay yourself a reasonable salary and set up automated investments into a personal brokerage account and retirement accounts (like a SEP IRA or Solo 401k). This discipline builds a separate pot of wealth."}]'::JSONB,
 '["How to invest as a business owner?", "Reinvest in business vs. personal investing", "Wealth diversification for entrepreneurs"]'::JSONB,
 ARRAY['entrepreneurs-retirement', 'entrepreneurs-budgeting']),

('entrepreneurs-retirement', 'entrepreneurs', 'retirement', null,
 'Retirement Planning for Entrepreneurs: Self-Employed Strategies | Moneko',
 'Build retirement wealth as an entrepreneur with Moneko''s AI guidance. Navigate SEP-IRAs, Solo 401ks, and business-focused retirement planning.',
 ARRAY['entrepreneur retirement', 'self-employed retirement', 'SEP-IRA', 'Solo 401k', 'AI retirement planning'],
 'Entrepreneurs face unique retirement planning challenges without employer benefits. Moneko''s AI helps navigate self-employed retirement options and build wealth through business success.',
 'Specialized retirement planning for entrepreneurs leveraging business income and self-employed retirement account options.',
 'Secure your retirement while building your business empire',
 'Our platform helps entrepreneurs balance business reinvestment with retirement savings, maximizing tax-advantaged accounts and building long-term wealth.',
 '[{"title": "Self-Employed Retirement Accounts", "description": "Optimize SEP-IRAs, Solo 401ks, and other options for maximum contributions."}, {"title": "Business Exit Planning", "description": "Plan for business sale or succession as part of retirement strategy."}, {"title": "Tax-Efficient Strategies", "description": "Minimize taxes while maximizing retirement contributions."}]'::JSONB,
 '[{"question": "What retirement accounts can entrepreneurs use?", "answer": "SEP-IRAs, Solo 401ks, and SIMPLE IRAs offer higher contribution limits for self-employed individuals. Our AI helps choose the best option for your situation."}, {"question": "How much should entrepreneurs save for retirement?", "answer": "Aim for 15-20% of income, taking advantage of higher contribution limits for self-employed accounts. Balance business reinvestment with retirement security."}]'::JSONB,
 '["Help me plan retirement as an entrepreneur", "How to optimize self-employed retirement accounts?", "Best retirement strategies for entrepreneurs"]'::JSONB,
 ARRAY['entrepreneurs-investing', 'freelancers-retirement']),

('entrepreneurs-home-buying', 'entrepreneurs', 'home-buying', null,
 'Home Buying for Entrepreneurs: Securing a Mortgage as a Business Owner | Moneko',
 'Learn how to successfully buy a home as an entrepreneur. Moneko helps you navigate mortgage requirements for business owners and prepare your finances.',
 ARRAY['entrepreneur mortgage', 'home buying for business owners', 'qualifying for mortgage self-employed', 'tax returns for mortgage'],
 'Buying a home when you own a business requires careful planning and documentation. Moneko helps entrepreneurs prepare their financials to meet lender requirements and successfully secure a mortgage.',
 'Tools to help you present a clear and stable income picture to lenders, based on your business''s tax returns and financial statements.',
 'Leverage your business success to secure the home of your dreams',
 'We guide you through the process of using your business income to qualify for a home loan, helping you understand how lenders view your tax write-offs and profitability.',
 '[{"title": "Mortgage-Ready Financials", "description": "Organize your Profit & Loss statements and balance sheets to be ready for lender scrutiny."}, {"title": "Tax Return Strategy", "description": "Understand the trade-off between maximizing business tax deductions and showing sufficient net income to qualify for a mortgage."}, {"title": "Income Stability Proof", "description": "Compile the necessary documentation (usually 2+ years of tax returns) to prove a stable and reliable income from your business."}]'::JSONB,
 '[{"question": "How do I get a mortgage if I show a low income on my tax returns due to write-offs?", "answer": "This is a common challenge. You may need to be less aggressive with deductions for the two years leading up to your mortgage application to show a higher net income. Some lenders also have special programs that allow them to ''add back'' certain write-offs like depreciation."}, {"question": "Can I use my business bank account for my down payment?", "answer": "It''s generally better to move the money to your personal account and let it ''season'' for a few months (at least 60 days). Lenders need to see a clear paper trail and verify the source of funds is legitimate and not a loan."}]'::JSONB,
 '["How to get a mortgage as a business owner?", "Buying a house with entrepreneur income", "Mortgage tips for entrepreneurs"]'::JSONB,
 ARRAY['entrepreneurs-budgeting', 'freelancers-home-buying']),

-- ===================================
-- Target Group: RETIREES (6 of 6 pages)
-- ===================================

('retirees-budgeting', 'retirees', 'budgeting', null,
 'Retirement Budgeting: Fixed Income Financial Management | Moneko',
 'Optimize retirement finances with Moneko''s AI budgeting tools. Manage fixed income, healthcare costs, and preserve wealth in retirement.',
 ARRAY['retirement budgeting', 'fixed income budget', 'retiree finances', 'retirement money management', 'AI retirement planning'],
 'Retirement brings a shift from earning to preserving and spending wealth wisely. Moneko helps retirees manage fixed incomes, plan for healthcare costs, and maintain their lifestyle throughout retirement.',
 'Retirement-focused budgeting tools that maximize fixed income while preserving wealth and planning for unexpected expenses.',
 'Enjoy retirement with confidence through smart financial management',
 'Our AI helps retirees stretch their savings, optimize Social Security and pension income, and plan for the healthcare and lifestyle costs of aging.',
 '[{"title": "Fixed Income Optimization", "description": "Maximize Social Security, pensions, and retirement account withdrawals."}, {"title": "Healthcare Cost Planning", "description": "Budget for Medicare, supplements, and rising healthcare expenses."}, {"title": "Wealth Preservation", "description": "Protect assets while maintaining desired lifestyle."}]'::JSONB,
 '[{"question": "How much can retirees safely withdraw from savings?", "answer": "The traditional 4% rule is a starting point, but this varies. A dynamic withdrawal strategy that adjusts for market performance is often better. Our AI helps optimize withdrawal strategies."}, {"question": "How should retirees budget for healthcare costs?", "answer": "Plan for a significant portion of your budget to go to healthcare. Our tools help track Medicare premiums, supplemental plan costs, and out-of-pocket expenses to create an accurate forecast."}]'::JSONB,
 '["Help me create a budget for retirement", "How to manage fixed retirement income?", "Best budgeting strategies for retirees"]'::JSONB,
 ARRAY['retirees-saving', 'retirees-investing']),

('retirees-saving', 'retirees', 'saving', null,
 'Wealth Preservation for Retirees: Protecting Your Nest Egg | Moneko',
 'Your goal has shifted from saving to preservation. Learn strategies with Moneko to protect your retirement capital from inflation, market risk, and unforeseen costs.',
 ARRAY['wealth preservation', 'retiree savings', 'protecting retirement assets', 'capital preservation strategy', 'inflation protection for retirees'],
 'In retirement, "saving" means preserving the capital you''ve worked a lifetime to build. Moneko provides strategies to protect your nest egg from being eroded by inflation, market volatility, and unexpected expenses, ensuring it lasts for your entire life.',
 'AI-powered strategies focused on risk management and capital preservation to give you peace of mind in retirement.',
 'Protect your hard-earned nest egg and enjoy a secure retirement',
 'Our platform helps you structure your assets to balance safety and growth, create strategies to combat inflation, and build contingency plans for large, unexpected costs like long-term care.',
 '[{"title": "Inflation-Adjusted Planning", "description": "Model how inflation can impact your purchasing power and create strategies to counteract it."}, {"title": "Risk-Managed Portfolios", "description": "Structure your investments to reduce volatility and protect your principal capital."}, {"title": "Contingency Fund Strategy", "description": "Plan for major potential expenses, like long-term care, to protect your primary nest egg."}]'::JSONB,
 '[{"question": "How do I protect my retirement savings from inflation?", "answer": "While you want to be safer in retirement, you still need some growth to outpace inflation. Holding a portion of your portfolio in high-quality dividend-paying stocks and using inflation-protected securities like TIPS can help."}, {"question": "Should I still have an emergency fund in retirement?", "answer": "Yes, but it might be considered a ''contingency fund''. Having 1-2 years of living expenses in very safe, liquid assets (like cash or short-term bonds) can prevent you from having to sell growth assets during a market downturn to cover expenses."}]'::JSONB,
 '["How to protect my retirement savings?", "Wealth preservation strategies", "Inflation protection for seniors"]'::JSONB,
 ARRAY['retirees-budgeting', 'retirees-investing']),

('retirees-debt-repayment', 'retirees', 'debt-repayment', null,
 'Debt Management in Retirement: Paying off Mortgages & Other Debt | Moneko',
 'Navigate debt repayment on a fixed income with Moneko. Get strategies for managing or eliminating a mortgage, medical bills, or other debts in retirement.',
 ARRAY['debt in retirement', 'paying off mortgage in retirement', 'retiree debt management', 'medical debt'],
 'Carrying debt into retirement can be a significant source of stress on a fixed income. Moneko helps retirees create a smart plan to manage or eliminate remaining debts, like a mortgage, to improve cash flow and financial security.',
 'Strategies to manage and eliminate debt on a fixed income, freeing up your cash for the retirement you deserve.',
 'Enter your golden years with the freedom of being debt-free',
 'We help you analyze the pros and cons of paying off your mortgage, create a plan for handling unexpected medical bills, and manage your liabilities to ensure they don''t jeopardize your retirement lifestyle.',
 '[{"title": "Mortgage Payoff Analysis", "description": "Analyze whether using a lump sum from savings to pay off your mortgage is a smart financial move for you."}, {"title": "Fixed-Income Debt Plan", "description": "Create a budget-friendly plan to systematically pay down any remaining high-interest debts."}, {"title": "Medical Debt Strategy", "description": "Guidance on navigating large medical bills, including negotiating with providers and understanding payment options."}]'::JSONB,
 '[{"question": "Should I pay off my mortgage before I retire?", "answer": "It''s a personal and financial decision. Having no mortgage payment provides psychological security and frees up cash flow. However, if your mortgage has a very low interest rate, you might earn more by keeping your money invested. Moneko helps you weigh the options."}, {"question": "How can I handle large, unexpected medical bills in retirement?", "answer": "First, carefully review the bill for errors. Then, contact the provider to ask for a discounted price for paying in cash or to set up a no-interest payment plan. Don''t put it on a high-interest credit card if you can avoid it."}]'::JSONB,
 '["Should I pay off my mortgage in retirement?", "How to manage debt on a fixed income?", "Handling medical debt for seniors"]'::JSONB,
 ARRAY['retirees-budgeting', 'retirees-home-buying']),

('retirees-investing', 'retirees', 'investing', null,
 'Investing in Retirement: Capital Preservation and Income Generation | Moneko',
 'Navigate investing in retirement with Moneko. Focus on capital preservation, generating stable income, and managing your portfolio to last a lifetime.',
 ARRAY['investing for retirees', 'retirement income', 'capital preservation', 'retirement portfolio', 'required minimum distributions'],
 'Investing in retirement shifts from growth to preservation and income. Moneko helps retirees structure their portfolio to provide a reliable income stream, protect their hard-earned capital, and make their savings last.',
 'AI-powered portfolio strategies for retirees, focused on generating income, managing risk, and optimizing for longevity.',
 'Invest with confidence throughout your retirement years',
 'Our platform helps you manage your investments to support your lifestyle, covering everything from withdrawal strategies to managing Required Minimum Distributions (RMDs) tax-efficiently.',
 '[{"title": "Income-Focused Portfolios", "description": "Build a portfolio of dividend stocks, bonds, and other assets designed to generate regular income."}, {"title": "Capital Preservation Strategies", "description": "Reduce portfolio risk to protect your principal savings from major market downturns."}, {"title": "RMD and Withdrawal Planning", "description": "Optimize your withdrawal strategy to meet your needs while minimizing your tax burden."}]'::JSONB,
 '[{"question": "How should my investment strategy change in retirement?", "answer": "Your focus should shift from aggressive growth to a more conservative approach focused on capital preservation and generating income. Your portfolio should have a higher allocation to bonds and dividend-paying stocks."}, {"question": "What is a safe withdrawal rate in retirement?", "answer": "The traditional 4% rule is a common starting point, but a safe rate depends on your age, portfolio allocation, and market conditions. Moneko''s AI can help you model different scenarios to find a sustainable rate for you."}]'::JSONB,
 '["Help me create an investment plan for retirement", "How to generate income from my retirement portfolio?", "Best investment strategies for retirees"]'::JSONB,
 ARRAY['retirees-budgeting', 'retirees-saving']),

('retirees-retirement', 'retirees', 'retirement', null,
 'Retirement Income Management: Making Your Money Last | Moneko',
 'Master your retirement income with Moneko. Learn to create a "retirement paycheck" by optimizing Social Security, pensions, and withdrawal strategies.',
 ARRAY['retirement income', 'retirement withdrawal strategy', 'social security optimization', 'making retirement savings last', 'RMD'],
 'You''ve saved for retirement; now it''s time to spend it wisely. Moneko helps you transition from accumulating wealth to creating a reliable, tax-efficient income stream that will last for your entire lifetime.',
 'A holistic system for managing all your income sources in retirement to create a predictable and sustainable lifestyle.',
 'Turn your nest egg into a reliable paycheck for life',
 'We help you coordinate your Social Security benefits, pension payouts, and portfolio withdrawals to create a steady "paycheck," manage your tax liability, and ensure you never have to worry about outliving your money.',
 '[{"title": "Smart Withdrawal Strategy", "description": "Guidance on which accounts to draw from first (taxable, tax-deferred, tax-free) to minimize your tax bill."}, {"title": "Social Security Maximizer", "description": "Analyze the best time for you and your spouse to claim Social Security benefits to maximize your lifetime payout."}, {"title": "Required Minimum Distribution (RMD) Planner", "description": "Calculate your RMDs and create a plan to take them tax-efficiently."}]'::JSONB,
 '[{"question": "Which account should I withdraw from first in retirement?", "answer": "A common strategy is to withdraw from taxable accounts first, followed by tax-deferred (like Traditional IRAs/401ks), and finally tax-free (like Roth IRAs). This allows your tax-advantaged accounts to continue growing for longer."}, {"question": "When is the best time to take Social Security?", "answer": "While you can claim as early as 62, your benefit increases by about 8% for every year you delay, up to age 70. Delaying is often a powerful way to get a larger, guaranteed, inflation-adjusted income for life. Moneko can model this for you."}]'::JSONB,
 '["How to create income in retirement?", "Best retirement withdrawal strategies", "When should I take Social Security?"]'::JSONB,
 ARRAY['retirees-investing', 'retirees-budgeting']),

('retirees-home-buying', 'retirees', 'home-buying', null,
 'Home Buying for Retirees: Downsizing & Finding Your Forever Home | Moneko',
 'Navigate the home-buying process as a retiree with Moneko. Get guidance on downsizing, buying a home with cash, and finding a home that fits your retirement lifestyle.',
 ARRAY['downsizing for retirement', 'buying a house in retirement', 'retiree home buying', 'buying a home with cash'],
 'Buying a home in retirement, whether it''s downsizing or moving to a dream location, has unique considerations. Moneko helps retirees navigate this process, from analyzing the financial impact of a move to finding a home that supports aging in place.',
 'Financial and lifestyle analysis tools to help you make the right home buying decision for your retirement years.',
 'Find the perfect home for your next chapter in life',
 'We help you understand the pros and cons of buying with cash versus getting a mortgage, calculate the net profit from selling your current home, and budget for a property that fits your new, relaxed lifestyle.',
 '[{"title": "Downsizing Financial Calculator", "description": "Estimate the proceeds from selling your current home and how that capital can be used for your new purchase and other retirement goals."}, {"title": "Cash vs. Mortgage Analysis", "description": "Analyze the financial implications of buying your new home with cash versus taking out a small mortgage."}, {"title": "Aging-in-Place Features Checklist", "description": "Consider features that will make your new home safe and comfortable for years to come, like single-story living and accessibility."}]'::JSONB,
 '[{"question": "Does it make sense to downsize in retirement?", "answer": "Downsizing can free up significant home equity to supplement your retirement income and reduce your costs for maintenance, utilities, and property taxes. It can be a very powerful financial move."}, {"question": "Should I buy my retirement home with cash?", "answer": "If you have the cash, it provides great peace of mind and simplifies your budget. However, in a low-interest-rate environment, some retirees prefer to take a small mortgage and keep their cash invested for higher potential returns. It''s a personal choice based on risk tolerance."}]'::JSONB,
 '["Tips for downsizing in retirement", "How to buy a house with cash?", "Best places for retirees to live"]'::JSONB,
 ARRAY['retirees-budgeting', 'retirees-debt-repayment']);

-- Step 7: Add Row Level Security (RLS) policies
ALTER TABLE seo_pages_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to SEO pages"
ON seo_pages_data FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users full read access"
ON seo_pages_data FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role full access"
ON seo_pages_data FOR ALL
TO service_role
USING (true);