-- Migration for Moneko pSEO database schema
-- This file defines the table structure for storing programmatic SEO page data

-- Drop existing table if it exists to ensure clean schema
DROP TABLE IF EXISTS seo_pages_data;

-- Create the table with correct schema matching pseo-manager function
CREATE TABLE seo_pages_data (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core routing and identification (matches pseo-manager expectation)
  slug TEXT NOT NULL UNIQUE,
  
  -- Core content variables
  target_group TEXT NOT NULL,
  financial_goal TEXT NOT NULL,
  region TEXT,
  
  -- SEO metadata
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT[],
  
  -- Content sections
  intro_content TEXT NOT NULL,
  feature_benefit_snippet TEXT NOT NULL,
  cta_snippet TEXT NOT NULL,
  secondary_content TEXT NOT NULL,
  
  -- Structured content (JSON)
  benefits JSONB NOT NULL DEFAULT '[]'::JSONB,
  faqs JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- Related content
  related_article_slugs TEXT[],
  
  -- Tracking fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS seo_pages_data_slug_idx ON seo_pages_data (slug);
CREATE INDEX IF NOT EXISTS seo_pages_data_target_group_idx ON seo_pages_data (target_group);
CREATE INDEX IF NOT EXISTS seo_pages_data_financial_goal_idx ON seo_pages_data (financial_goal);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_seo_pages_data_updated_at ON seo_pages_data;
CREATE TRIGGER update_seo_pages_data_updated_at
BEFORE UPDATE ON seo_pages_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment to the table for documentation
COMMENT ON TABLE seo_pages_data IS 'Stores data for programmatic SEO pages with dynamic content variables';

-- Insert comprehensive pSEO data covering all target groups and financial goals
INSERT INTO seo_pages_data (
  slug, target_group, financial_goal, region, title, meta_description, keywords,
  intro_content, feature_benefit_snippet, cta_snippet, secondary_content,
  benefits, faqs, related_article_slugs
) VALUES

-- TARGET GROUP BUDGETING PAGES (matching index.tsx links)
('students-budgeting', 'students', 'budgeting', null,
 'Student Budgeting: AI-Powered Financial Planning for Students | Moneko',
 'Master student budgeting with Moneko''s AI tools. Track expenses, manage limited income, and build healthy financial habits during college.',
 ARRAY['student budgeting', 'college finances', 'student budget app', 'AI financial planning', 'expense tracking'],
 'Student life comes with unique financial challenges - from textbook costs to irregular income from part-time jobs. Moneko''s AI-powered budgeting tools are specifically designed to help students manage their money effectively while focusing on their studies.',
 'Smart budgeting tools designed for student life, helping you track expenses, set spending limits, and save money on a tight budget.',
 'Start your financial journey with smart student budgeting tools',
 'Our platform understands the reality of student finances: ramen budgets, textbook expenses, and the need to make every dollar count. Get personalized insights that work with your lifestyle.',
 '[
   {"title": "Textbook & Supply Tracking", "description": "Monitor educational expenses and find savings opportunities"},
   {"title": "Part-Time Income Management", "description": "Balance irregular income with consistent budgeting"},
   {"title": "Campus Spending Insights", "description": "AI analysis of dining, entertainment, and lifestyle costs"}
 ]'::JSONB,
 '[
   {"question": "How much should students budget for monthly expenses?", "answer": "Student budgets typically range from $800-2000/month depending on location and lifestyle. Moneko helps you create a realistic budget based on your actual income and necessary expenses."},
   {"question": "How can I save money as a student?", "answer": "Focus on textbook rentals, meal planning, student discounts, and tracking small daily expenses. Our AI identifies spending patterns and suggests specific areas for savings."}
 ]'::JSONB,
 ARRAY['young-professionals-budgeting', 'parents-budgeting']),

('young-professionals-budgeting', 'young-professionals', 'budgeting', null,
 'Young Professional Budgeting: Smart Money Management for Career Growth | Moneko',
 'Build wealth as a young professional with Moneko''s AI budgeting tools. Balance career growth, lifestyle, and savings with intelligent financial planning.',
 ARRAY['young professional budget', 'career budgeting', 'salary management', 'AI financial planning', 'lifestyle budgeting'],
 'Starting your career brings new financial opportunities and responsibilities. Moneko helps young professionals navigate salary management, lifestyle inflation, and building wealth while enjoying life.',
 'AI-powered budgeting that grows with your career, helping you balance professional development, lifestyle goals, and long-term financial security.',
 'Take control of your finances and accelerate your wealth building',
 'From entry-level to promotions, our platform adapts to your changing income and helps you make smart financial decisions at every career stage.',
 '[
   {"title": "Salary Optimization", "description": "Maximize your income through strategic budgeting and negotiation insights"},
   {"title": "Career Investment Tracking", "description": "Budget for professional development, certifications, and networking"},
   {"title": "Lifestyle Balance", "description": "Enjoy your success while building long-term wealth"}
 ]'::JSONB,
 '[
   {"question": "How much should young professionals save?", "answer": "Aim for 20% savings rate: 10% for retirement, 5-10% for emergency fund/goals. Our AI helps optimize this based on your salary and expenses."},
   {"question": "How do I avoid lifestyle inflation?", "answer": "Set automatic savings increases with each raise, track discretionary spending, and use our AI to identify when lifestyle costs are growing faster than income."}
 ]'::JSONB,
 ARRAY['students-budgeting', 'entrepreneurs-budgeting']),

('parents-budgeting', 'parents', 'budgeting', null,
 'Family Budgeting for Parents: AI-Powered Financial Planning | Moneko',
 'Manage family finances with confidence using Moneko''s AI budgeting tools. Handle childcare costs, education planning, and family goals efficiently.',
 ARRAY['family budgeting', 'parent budget app', 'childcare costs', 'family financial planning', 'AI budgeting'],
 'Raising a family brings joy and financial complexity. Moneko''s AI understands the unique challenges parents face, from childcare costs to education planning, helping you budget effectively for your family''s needs.',
 'Family-focused budgeting tools that account for childcare, education, healthcare, and all the unexpected costs that come with raising children.',
 'Secure your family''s financial future with smart budgeting',
 'Our platform helps you balance immediate family needs with long-term goals like college savings and retirement, ensuring your family thrives financially.',
 '[
   {"title": "Childcare Cost Management", "description": "Track and optimize daycare, babysitting, and activity expenses"},
   {"title": "Education Planning", "description": "Budget for current school costs and future college expenses"},
   {"title": "Family Emergency Planning", "description": "Build larger emergency funds appropriate for family responsibilities"}
 ]'::JSONB,
 '[
   {"question": "How much should families budget for children?", "answer": "Families typically spend $12,000-15,000 annually per child. Our AI helps track these costs and find optimization opportunities while maintaining quality of life."},
   {"question": "How do I balance family expenses with retirement savings?", "answer": "Prioritize employer 401k matches, then balance children''s immediate needs with long-term savings. Our tools help optimize this balance based on your family''s situation."}
 ]'::JSONB,
 ARRAY['couples-budgeting', 'young-professionals-budgeting']),

('couples-budgeting', 'couples', 'budgeting', null,
 'Couple Budgeting: Joint Financial Planning Made Simple | Moneko',
 'Navigate shared finances with your partner using Moneko''s AI tools. Merge budgets, align goals, and build wealth together with intelligent planning.',
 ARRAY['couple budgeting', 'joint finances', 'shared budget app', 'relationship money management', 'AI financial planning'],
 'Managing money as a couple requires communication, planning, and the right tools. Moneko helps couples align their financial goals, merge their budgets effectively, and build wealth together.',
 'Collaborative budgeting tools designed for couples to manage joint expenses, individual goals, and shared financial dreams.',
 'Build your future together with unified financial planning',
 'From combining incomes to planning major purchases, our AI helps couples navigate the complexities of shared financial responsibility while respecting individual needs.',
 '[
   {"title": "Joint Account Management", "description": "Track shared expenses and individual contributions fairly"},
   {"title": "Goal Alignment Tools", "description": "Merge individual financial goals into cohesive couple objectives"},
   {"title": "Communication Frameworks", "description": "Structured approaches to discussing money and making financial decisions"}
 ]'::JSONB,
 '[
   {"question": "How should couples split shared expenses?", "answer": "Common approaches include 50/50, proportional to income, or separate accounts for different categories. Our AI helps you find the method that works best for your situation."},
   {"question": "How do we budget for individual and shared goals?", "answer": "Allocate percentages for joint goals (home, vacation) and individual goals (hobbies, personal purchases). Our tools help balance these priorities effectively."}
 ]'::JSONB,
 ARRAY['parents-budgeting', 'young-professionals-budgeting']),

('freelancers-budgeting', 'freelancers', 'budgeting', null,
 'Freelancer Budgeting: Manage Variable Income with AI | Moneko',
 'Master freelance finances with Moneko''s AI budgeting tools. Handle irregular income, plan for taxes, and build financial stability as a freelancer.',
 ARRAY['freelancer budgeting', 'variable income budget', 'freelance finances', 'irregular income planning', 'AI financial management'],
 'Freelancing offers freedom but comes with financial unpredictability. Moneko''s AI helps freelancers manage variable income, plan for tax obligations, and build the financial stability needed for long-term success.',
 'Specialized budgeting tools for freelancers that handle income fluctuations, tax planning, and business expense tracking.',
 'Achieve financial stability with smart freelancer budgeting',
 'Our platform understands the feast-or-famine cycle of freelance work, helping you smooth out income volatility and build a sustainable financial foundation.',
 '[
   {"title": "Income Smoothing", "description": "Average irregular income across months for stable budgeting"},
   {"title": "Tax Reserve Management", "description": "Automatically set aside money for quarterly tax payments"},
   {"title": "Business Expense Tracking", "description": "Separate personal and business expenses for better financial clarity"}
 ]'::JSONB,
 '[
   {"question": "How much should freelancers save for taxes?", "answer": "Set aside 25-30% of gross income for taxes, depending on your tax bracket. Our AI tracks this automatically and reminds you about quarterly payments."},
   {"question": "How do I budget with irregular freelance income?", "answer": "Use a baseline budget based on your lowest monthly income, then allocate extra earnings to savings and goals. Our tools help smooth out income fluctuations."}
 ]'::JSONB,
 ARRAY['entrepreneurs-budgeting', 'young-professionals-budgeting']),

('entrepreneurs-budgeting', 'entrepreneurs', 'budgeting', null,
 'Entrepreneur Budgeting: Business & Personal Finance Management | Moneko',
 'Balance business and personal finances with Moneko''s AI tools. Track cash flow, separate business expenses, and plan for entrepreneurial success.',
 ARRAY['entrepreneur budgeting', 'business personal finance', 'startup budgeting', 'cash flow management', 'AI business planning'],
 'Entrepreneurs face unique challenges managing both business and personal finances. Moneko''s AI helps separate these concerns while optimizing cash flow and building wealth through business success.',
 'Comprehensive budgeting for entrepreneurs balancing business investments, personal needs, and long-term wealth building.',
 'Scale your business while securing your personal financial future',
 'Our platform helps entrepreneurs make smart decisions about reinvestment vs. personal financial security, ensuring both business growth and personal wealth building.',
 '[
   {"title": "Business-Personal Separation", "description": "Clear boundaries between business and personal expenses"},
   {"title": "Cash Flow Optimization", "description": "Manage irregular business income and plan for growth investments"},
   {"title": "Wealth Building Strategy", "description": "Balance business reinvestment with personal financial goals"}
 ]'::JSONB,
 '[
   {"question": "How do entrepreneurs separate business and personal budgets?", "answer": "Maintain separate accounts, pay yourself a consistent salary, and track business expenses separately. Our AI helps categorize and optimize both budgets."},
   {"question": "How much should entrepreneurs save personally vs. reinvest?", "answer": "Aim for personal emergency fund first, then balance between business growth opportunities and personal wealth building based on your risk tolerance and business stage."}
 ]'::JSONB,
 ARRAY['freelancers-budgeting', 'young-professionals-budgeting']),

('retirees-budgeting', 'retirees', 'budgeting', null,
 'Retirement Budgeting: Fixed Income Financial Management | Moneko',
 'Optimize retirement finances with Moneko''s AI budgeting tools. Manage fixed income, healthcare costs, and preserve wealth in retirement.',
 ARRAY['retirement budgeting', 'fixed income budget', 'retiree finances', 'retirement money management', 'AI retirement planning'],
 'Retirement brings a shift from earning to preserving and spending wealth wisely. Moneko helps retirees manage fixed incomes, plan for healthcare costs, and maintain their lifestyle throughout retirement.',
 'Retirement-focused budgeting tools that maximize fixed income while preserving wealth and planning for unexpected expenses.',
 'Enjoy retirement with confidence through smart financial management',
 'Our AI helps retirees stretch their savings, optimize Social Security and pension income, and plan for the healthcare and lifestyle costs of aging.',
 '[
   {"title": "Fixed Income Optimization", "description": "Maximize Social Security, pensions, and retirement account withdrawals"},
   {"title": "Healthcare Cost Planning", "description": "Budget for Medicare, supplements, and rising healthcare expenses"},
   {"title": "Wealth Preservation", "description": "Protect assets while maintaining desired lifestyle"}
 ]'::JSONB,
 '[
   {"question": "How much can retirees safely withdraw from savings?", "answer": "The traditional 4% rule suggests withdrawing 4% annually, but this varies based on market conditions, health, and expenses. Our AI helps optimize withdrawal strategies."},
   {"question": "How should retirees budget for healthcare costs?", "answer": "Plan for 15-20% of retirement income going to healthcare. Our tools help track Medicare costs, supplements, and out-of-pocket expenses."}
 ]'::JSONB,
 ARRAY['parents-budgeting', 'young-professionals-retirement']),

-- FINANCIAL GOAL PAGES (matching index.tsx financial goals)
('young-professionals-saving', 'young-professionals', 'saving', null,
 'Smart Saving Strategies for Young Professionals | Moneko',
 'Build wealth through intelligent saving with Moneko''s AI tools. Optimize emergency funds, goal-based saving, and automated wealth building.',
 ARRAY['young professional saving', 'emergency fund', 'goal-based saving', 'automated saving', 'AI wealth building'],
 'Building wealth starts with smart saving habits. Moneko helps young professionals optimize their saving strategies, build emergency funds, and automate wealth accumulation.',
 'AI-powered saving strategies that help young professionals build emergency funds and achieve financial goals faster.',
 'Start building serious wealth with automated saving strategies',
 'From emergency funds to down payments, our AI helps you save efficiently and reach your goals faster than traditional approaches.',
 '[
   {"title": "Emergency Fund Optimization", "description": "Build the right emergency fund size for your situation"},
   {"title": "Goal-Based Saving", "description": "Separate savings for different goals with optimal allocation"},
   {"title": "Automated Wealth Building", "description": "Set up systems that build wealth without constant attention"}
 ]'::JSONB,
 '[
   {"question": "How much should young professionals save monthly?", "answer": "Aim for 20% of income: 6 months expenses for emergency fund, then goal-specific savings. Our AI helps optimize this based on your income and expenses."},
   {"question": "What''s the best way to automate saving?", "answer": "Set up automatic transfers right after payday, use high-yield savings accounts, and increase savings rates with each raise. Our tools help optimize these systems."}
 ]'::JSONB,
 ARRAY['young-professionals-budgeting', 'young-professionals-investing']),

('young-professionals-debt-repayment', 'young-professionals', 'debt-repayment', null,
 'Student Loan & Debt Payoff for Young Professionals | Moneko',
 'Eliminate debt strategically with Moneko''s AI tools. Optimize student loan payments, credit cards, and build wealth while paying off debt.',
 ARRAY['student loan payoff', 'debt repayment strategy', 'young professional debt', 'AI debt management', 'debt consolidation'],
 'Many young professionals start their careers with student loans and other debt. Moneko''s AI helps create optimal payoff strategies while still building wealth and enjoying life.',
 'Smart debt elimination strategies that balance aggressive payoff with wealth building and lifestyle goals.',
 'Become debt-free faster with AI-optimized payoff strategies',
 'Our platform analyzes your debts, income, and goals to create personalized payoff plans that eliminate debt efficiently without sacrificing your future.',
 '[
   {"title": "Debt Avalanche vs Snowball", "description": "AI determines the optimal payoff strategy for your situation"},
   {"title": "Student Loan Optimization", "description": "Navigate forgiveness programs, refinancing, and payment strategies"},
   {"title": "Credit Score Improvement", "description": "Strategic debt payoff that maximizes credit score gains"}
 ]'::JSONB,
 '[
   {"question": "Should I pay off student loans or invest?", "answer": "Compare loan interest rates to investment returns. Generally, pay minimums on low-rate loans (<5%) and invest the difference, aggressively pay high-rate debt first."},
   {"question": "What''s the fastest way to pay off debt?", "answer": "Debt avalanche (highest interest first) saves most money, debt snowball (smallest balance first) provides psychological wins. Our AI recommends based on your personality and situation."}
 ]'::JSONB,
 ARRAY['students-budgeting', 'young-professionals-budgeting']),

('young-professionals-investing', 'young-professionals', 'investing', null,
 'Investment Guide for Young Professionals | Moneko',
 'Start building wealth through smart investing with Moneko''s AI guidance. Learn stocks, retirement accounts, and portfolio optimization.',
 ARRAY['young professional investing', 'beginner investing', '401k optimization', 'portfolio management', 'AI investment advice'],
 'Young professionals have the most valuable asset for building wealth: time. Moneko''s AI helps you start investing early and optimize your portfolio for long-term growth.',
 'AI-guided investment strategies designed for young professionals to build wealth through compound growth and smart asset allocation.',
 'Start building serious wealth through intelligent investing',
 'From 401k optimization to building your first investment portfolio, our AI provides personalized guidance based on your risk tolerance and goals.',
 '[
   {"title": "401k Optimization", "description": "Maximize employer matches and optimize contribution strategies"},
   {"title": "Portfolio Diversification", "description": "Build balanced portfolios appropriate for your age and goals"},
   {"title": "Tax-Efficient Investing", "description": "Minimize taxes while maximizing long-term growth"}
 ]'::JSONB,
 '[
   {"question": "How much should young professionals invest?", "answer": "Start with employer 401k match, then aim for 15-20% total savings rate. Begin with broad market index funds and increase complexity as you learn."},
   {"question": "Should I use a robo-advisor or pick my own stocks?", "answer": "Most young professionals benefit from low-cost index funds or robo-advisors initially. Individual stock picking requires significant time and knowledge investment."}
 ]'::JSONB,
 ARRAY['young-professionals-retirement', 'young-professionals-saving']),

('young-professionals-retirement', 'young-professionals', 'retirement', null,
 'Retirement Planning for Young Professionals | Moneko',
 'Start retirement planning early with Moneko''s AI tools. Optimize 401k contributions, Roth IRAs, and long-term wealth building strategies.',
 ARRAY['retirement planning', 'young professional retirement', '401k strategy', 'Roth IRA', 'AI retirement planning'],
 'Starting retirement planning in your 20s and 30s is the single best financial decision you can make. Moneko''s AI helps young professionals maximize compound growth and build wealth for retirement.',
 'Early retirement planning strategies that leverage compound interest and smart tax planning to build substantial wealth.',
 'Secure your retirement with early planning and compound growth',
 'The earlier you start, the less you need to save monthly. Our AI helps you take advantage of compound interest and time to build retirement wealth efficiently.',
 '[
   {"title": "Compound Interest Maximization", "description": "Start early to leverage decades of compound growth"},
   {"title": "401k and IRA Optimization", "description": "Navigate retirement account rules and maximize benefits"},
   {"title": "FIRE Planning", "description": "Strategies for Financial Independence and early retirement"}
 ]'::JSONB,
 '[
   {"question": "How much should young professionals save for retirement?", "answer": "Aim for 10-15% of income including employer match. Starting at 25, $200/month can grow to over $1M by retirement through compound interest."},
   {"question": "Roth 401k vs Traditional 401k for young professionals?", "answer": "Young professionals often benefit from Roth contributions since they''re likely in lower tax brackets now than in retirement. Our AI helps optimize this decision."}
 ]'::JSONB,
 ARRAY['young-professionals-investing', 'entrepreneurs-retirement']),

('young-professionals-home-buying', 'young-professionals', 'home-buying', null,
 'Home Buying Guide for Young Professionals | Moneko',
 'Navigate first-time home buying with Moneko''s AI tools. Plan down payments, understand mortgages, and make smart real estate decisions.',
 ARRAY['first time home buyer', 'young professional real estate', 'down payment planning', 'mortgage strategy', 'AI home buying'],
 'Buying your first home is a major financial milestone for young professionals. Moneko''s AI helps you plan for down payments, understand mortgage options, and make informed decisions.',
 'Complete home buying guidance from down payment planning to mortgage optimization, designed specifically for young professional buyers.',
 'Make smart home buying decisions with AI-powered guidance',
 'From determining how much house you can afford to optimizing your mortgage terms, our AI helps you navigate the complex home buying process.',
 '[
   {"title": "Down Payment Strategy", "description": "Plan and save for optimal down payment amounts"},
   {"title": "Mortgage Optimization", "description": "Compare loan types and terms to minimize long-term costs"},
   {"title": "Affordability Analysis", "description": "Determine realistic home prices based on income and goals"}
 ]'::JSONB,
 '[
   {"question": "How much should young professionals save for a down payment?", "answer": "Aim for 20% to avoid PMI, but 10-15% can work with good credit. Factor in closing costs (2-3% of home price) and moving expenses."},
   {"question": "Should I buy or rent as a young professional?", "answer": "Consider job stability, local market conditions, and opportunity cost of down payment. Generally buy if staying 5+ years and renting costs exceed ownership costs."}
 ]'::JSONB,
 ARRAY['families-home-buying', 'young-professionals-saving']),

-- ADDITIONAL TARGET GROUPS WITH SPECIFIC FINANCIAL GOALS
('students-emergency-fund', 'students', 'emergency-fund', null,
 'Emergency Fund for Students: Smart Financial Planning | Moneko',
 'Build your emergency fund as a student with Moneko''s AI-powered budgeting tools. Learn smart saving strategies and achieve financial security.',
 ARRAY['emergency fund', 'students', 'financial planning', 'budgeting', 'AI financial tools'],
 'As a student, building an emergency fund might seem challenging with limited income and expenses. Moneko''s AI-powered platform helps students create realistic emergency fund goals and develop sustainable saving habits.',
 'AI-powered budgeting specifically designed for student income patterns and expenses, helping you save consistently without compromising your studies.',
 'Start building your emergency fund today with Moneko''s student-friendly tools',
 'Students face unique financial challenges, from irregular income to unexpected expenses. Our platform provides personalized guidance to help you build financial security.',
 '[
   {"title": "Smart Saving Strategies", "description": "AI-powered recommendations for maximizing your savings on a student budget"},
   {"title": "Flexible Goal Setting", "description": "Set realistic emergency fund targets based on your actual income and expenses"},
   {"title": "Expense Tracking", "description": "Monitor your spending patterns and identify areas where you can save more"}
 ]'::JSONB,
 '[
   {"question": "How much should students save for emergencies?", "answer": "Students should aim for $500-1000 initially, then build toward 3-6 months of expenses. Moneko helps you set realistic goals based on your income."},
   {"question": "How can I save money on a tight student budget?", "answer": "Our AI identifies small, consistent savings opportunities in your spending patterns without impacting your quality of life or studies."}
 ]'::JSONB,
 ARRAY['young-professionals-emergency-fund', 'students-budgeting']),

('families-home-buying', 'families', 'home-buying', null,
 'Home Buying for Families: AI-Powered Mortgage & Savings Planning | Moneko',
 'Plan your family''s home purchase with Moneko''s AI tools. Get personalized mortgage calculations and down payment savings strategies.',
 ARRAY['home buying', 'families', 'mortgage planning', 'down payment', 'AI financial tools'],
 'Buying a home is one of the biggest financial decisions for families. Moneko''s AI platform helps you navigate mortgage options, calculate affordability, and create strategic savings plans.',
 'AI-powered home affordability analysis that considers your family''s unique financial situation and long-term goals.',
 'Find your perfect home with smart financial planning designed for families',
 'Our platform takes into account family-specific expenses like childcare, education costs, and growing space needs to ensure your home purchase fits your budget.',
 '[
   {"title": "Mortgage Affordability Analysis", "description": "AI-powered calculations considering family income, expenses, and future financial needs"},
   {"title": "Down Payment Strategy", "description": "Personalized savings plans to reach your down payment goals faster"},
   {"title": "Family Budget Integration", "description": "Home costs balanced with family expenses like childcare and education"}
 ]'::JSONB,
 '[
   {"question": "How much house can our family afford?", "answer": "Our AI analyzes your family''s complete financial picture, including childcare and education costs, to recommend a realistic home price range."},
   {"question": "What''s the best down payment strategy for families?", "answer": "We help you balance saving for a larger down payment with other family financial priorities, optimizing for your specific situation."}
 ]'::JSONB,
 ARRAY['young-professionals-home-buying', 'couples-budgeting']),

('entrepreneurs-retirement', 'entrepreneurs', 'retirement', null,
 'Retirement Planning for Entrepreneurs: Self-Employed Strategies | Moneko',
 'Build retirement wealth as an entrepreneur with Moneko''s AI guidance. Navigate SEP-IRAs, Solo 401ks, and business-focused retirement planning.',
 ARRAY['entrepreneur retirement', 'self-employed retirement', 'SEP-IRA', 'Solo 401k', 'AI retirement planning'],
 'Entrepreneurs face unique retirement planning challenges without employer benefits. Moneko''s AI helps navigate self-employed retirement options and build wealth through business success.',
 'Specialized retirement planning for entrepreneurs leveraging business income and self-employed retirement account options.',
 'Secure your retirement while building your business empire',
 'Our platform helps entrepreneurs balance business reinvestment with retirement savings, maximizing tax-advantaged accounts and building long-term wealth.',
 '[
   {"title": "Self-Employed Retirement Accounts", "description": "Optimize SEP-IRAs, Solo 401ks, and other options for maximum contributions"},
   {"title": "Business Exit Planning", "description": "Plan for business sale or succession as part of retirement strategy"},
   {"title": "Tax-Efficient Strategies", "description": "Minimize taxes while maximizing retirement contributions"}
 ]'::JSONB,
 '[
   {"question": "What retirement accounts can entrepreneurs use?", "answer": "SEP-IRAs, Solo 401ks, and SIMPLE IRAs offer higher contribution limits for self-employed individuals. Our AI helps choose the best option for your situation."},
   {"question": "How much should entrepreneurs save for retirement?", "answer": "Aim for 15-20% of income, taking advantage of higher contribution limits for self-employed accounts. Balance business reinvestment with retirement security."}
 ]'::JSONB,
 ARRAY['young-professionals-retirement', 'entrepreneurs-budgeting']),

('remote-workers-investing', 'remote-workers', 'investing', null,
 'Investment Strategy for Remote Workers: Location-Independent Wealth Building | Moneko',
 'Build wealth as a remote worker with Moneko''s AI investment tools. Manage variable income, international considerations, and flexible investing.',
 ARRAY['remote worker investing', 'location independent investing', 'digital nomad finances', 'variable income investing', 'AI investment planning'],
 'Remote workers have unique investment considerations from variable income to international tax implications. Moneko''s AI helps navigate these challenges while building wealth.',
 'Investment strategies designed for the remote work lifestyle, handling income variability and location independence.',
 'Build wealth from anywhere with location-independent investment strategies',
 'Whether you''re a digital nomad or working from home, our AI helps you invest consistently and build wealth regardless of your location.',
 '[
   {"title": "Variable Income Management", "description": "Investment strategies that adapt to irregular income patterns"},
   {"title": "International Considerations", "description": "Navigate tax implications and investment options for global remote workers"},
   {"title": "Flexible Portfolio Management", "description": "Investment strategies that work regardless of your location"}
 ]'::JSONB,
 '[
   {"question": "How do remote workers invest with irregular income?", "answer": "Use dollar-cost averaging during good months, maintain larger cash reserves, and focus on flexible investment strategies that adapt to income variability."},
   {"question": "What about taxes for remote workers investing internationally?", "answer": "US citizens must report worldwide income. Consider tax-efficient accounts and consult professionals for complex international situations."}
 ]'::JSONB,
 ARRAY['freelancers-budgeting', 'entrepreneurs-investing']),

('gig-workers-financial-education', 'gig-workers', 'financial-education', null,
 'Financial Education for Gig Workers: Master Variable Income Management | Moneko',
 'Learn essential financial skills for gig work with Moneko''s AI-powered education. Master tax planning, irregular income, and building stability.',
 ARRAY['gig worker finances', 'variable income education', 'freelance financial literacy', 'tax planning gig work', 'AI financial education'],
 'Gig workers face unique financial challenges that traditional advice doesn''t address. Moneko''s AI provides personalized education for managing variable income and building financial stability.',
 'Comprehensive financial education designed specifically for gig workers and the unique challenges of variable income.',
 'Master gig economy finances with personalized AI education',
 'From tax planning to emergency funds, our educational content adapts to your gig work situation and helps you build financial confidence.',
 '[
   {"title": "Variable Income Strategies", "description": "Learn to manage finances with irregular income patterns"},
   {"title": "Tax Planning Education", "description": "Master tax strategies specific to gig work and multiple income sources"},
   {"title": "Emergency Fund Building", "description": "Build larger emergency funds appropriate for income uncertainty"}
 ]'::JSONB,
 '[
   {"question": "How do gig workers manage irregular income?", "answer": "Create baseline budgets using lowest monthly income, build larger emergency funds, and use percentage-based budgeting rather than fixed amounts."},
   {"question": "What financial education do gig workers need most?", "answer": "Tax planning, emergency fund strategies, retirement planning without employer benefits, and business expense tracking are crucial skills for gig workers."}
 ]'::JSONB,
 ARRAY['freelancers-budgeting', 'entrepreneurs-budgeting']),

('beginners-debt-payoff', 'beginners', 'debt-payoff', null,
 'Debt Payoff for Beginners: Simple Strategies to Become Debt-Free | Moneko',
 'Eliminate debt with beginner-friendly strategies using Moneko''s AI tools. Learn debt avalanche vs snowball and create your personalized payoff plan.',
 ARRAY['debt payoff', 'beginners', 'debt elimination', 'debt avalanche', 'debt snowball'],
 'Starting your debt payoff journey can feel overwhelming. Moneko''s AI simplifies the process with personalized strategies that help beginners eliminate debt efficiently.',
 'Simple, effective debt elimination strategies that guide beginners through the process step-by-step.',
 'Start your debt-free journey with proven strategies and AI guidance',
 'Our platform breaks down complex debt strategies into simple, actionable steps that anyone can follow, regardless of their financial experience.',
 '[
   {"title": "Debt Avalanche vs Snowball", "description": "AI determines the best debt payoff strategy based on your specific situation"},
   {"title": "Budget Optimization", "description": "Find extra money for debt payments without sacrificing essentials"},
   {"title": "Progress Tracking", "description": "Visual tools to track your debt elimination progress and stay motivated"}
 ]'::JSONB,
 '[
   {"question": "What''s the best debt payoff strategy for beginners?", "answer": "Debt avalanche saves the most money, debt snowball provides psychological wins. Our AI recommends based on your debts, personality, and financial situation."},
   {"question": "How can beginners find money for debt payments?", "answer": "Track all expenses for a month, identify discretionary spending, and redirect money from subscriptions, dining out, and entertainment to debt payments."}
 ]'::JSONB,
 ARRAY['students-budgeting', 'young-professionals-debt-repayment']),

('intermediate-investors-portfolio-optimization', 'intermediate-investors', 'portfolio-optimization', null,
 'Portfolio Optimization for Intermediate Investors | Moneko',
 'Optimize your investment portfolio with Moneko''s AI-driven rebalancing and asset allocation strategies for experienced investors.',
 ARRAY['portfolio optimization', 'intermediate investors', 'asset allocation', 'portfolio rebalancing', 'AI investment tools'],
 'Intermediate investors understand the basics but need sophisticated tools to optimize their portfolios. Moneko''s AI provides advanced optimization considering risk tolerance and market conditions.',
 'Advanced portfolio optimization that automatically rebalances and adjusts allocation based on market conditions and your goals.',
 'Take your investing to the next level with AI-powered portfolio optimization',
 'Move beyond basic investing with sophisticated portfolio management tools that adapt to market changes and your evolving financial goals.',
 '[
   {"title": "Dynamic Rebalancing", "description": "AI automatically suggests portfolio adjustments based on market conditions"},
   {"title": "Risk Analysis", "description": "Comprehensive risk assessment and optimization for your investment mix"},
   {"title": "Tax-Loss Harvesting", "description": "AI identifies opportunities to minimize taxes through strategic selling"}
 ]'::JSONB,
 '[
   {"question": "How often should intermediate investors rebalance?", "answer": "Our AI monitors continuously and suggests rebalancing when allocations drift significantly from targets or when market conditions warrant adjustment."},
   {"question": "What''s the best asset allocation for intermediate investors?", "answer": "Asset allocation depends on age, risk tolerance, and goals. Our AI creates personalized allocations and adjusts them as your situation changes."}
 ]'::JSONB,
 ARRAY['young-professionals-investing', 'advanced-traders-portfolio-optimization']),

('advanced-traders-market-analysis', 'advanced-traders', 'market-analysis', null,
 'Advanced Market Analysis: AI-Powered Trading Insights | Moneko',
 'Enhance your trading with Moneko''s AI-powered market analysis tools designed for advanced traders and active investors.',
 ARRAY['market analysis', 'advanced trading', 'AI trading tools', 'investment research', 'market insights'],
 'Advanced traders need sophisticated analysis tools that go beyond basic indicators. Moneko''s AI provides deep market insights and pattern recognition for experienced investors.',
 'AI-powered market analysis that identifies patterns, trends, and opportunities that advanced traders can capitalize on.',
 'Enhance your trading with cutting-edge AI market analysis',
 'Our advanced analytics help you make more informed trading decisions by processing vast amounts of market data and identifying opportunities.',
 '[
   {"title": "Pattern Recognition", "description": "AI identifies complex market patterns and trading opportunities"},
   {"title": "Risk Assessment", "description": "Advanced risk analysis for individual trades and overall portfolio"},
   {"title": "Market Sentiment Analysis", "description": "AI analyzes market sentiment from multiple data sources"}
 ]'::JSONB,
 '[
   {"question": "How does AI improve market analysis for advanced traders?", "answer": "Our AI processes vast amounts of market data, identifies patterns humans might miss, and provides insights that can enhance your trading strategies."},
   {"question": "Can AI replace fundamental analysis?", "answer": "AI enhances but doesn''t replace fundamental analysis. It helps you process information faster and identify opportunities, but human judgment remains crucial."}
 ]'::JSONB,
 ARRAY['intermediate-investors-portfolio-optimization', 'entrepreneurs-investing']);

-- Row Level Security (RLS) policies
ALTER TABLE seo_pages_data ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (allows anyone to read SEO pages)
CREATE POLICY "Allow public read access to SEO pages"
ON seo_pages_data FOR SELECT
TO public
USING (true);

-- Policy for authenticated users to read all
CREATE POLICY "Allow authenticated users full read access"
ON seo_pages_data FOR SELECT
TO authenticated
USING (true);

-- Policy for service role to have full access
CREATE POLICY "Allow service role full access"
ON seo_pages_data FOR ALL
TO service_role
USING (true);