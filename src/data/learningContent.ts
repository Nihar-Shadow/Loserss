export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: {
    teen: string;
    beginner: string;
    student: string;
  };
  example: string;
  interactivePrompt: string;
}

export interface LearningModule {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  level: "Beginner" | "Intermediate";
  overview: string;
  lessons: Lesson[];
  quiz: QuizQuestion[];
  badge: { name: string; icon: string };
  unlockAfter?: string;
  xpReward: number;
  predictionUnlock?: boolean;
}

export const modules: LearningModule[] = [
  {
    id: "m1",
    title: "Introduction to Financial Markets",
    subtitle: "Where money meets opportunity",
    icon: "🏛️",
    level: "Beginner",
    overview: "Financial markets are like massive bazaars where people buy and sell ownership in companies, lend money to governments, and trade commodities. Understanding how these markets work is the first step to growing your wealth intelligently.",
    xpReward: 500,
    badge: { name: "Market Rookie", icon: "🌟" },
    lessons: [
      {
        id: "m1-l1", title: "What Are Financial Markets?", duration: "5 min",
        content: {
          teen: "Think of a financial market like OLX or Amazon — but instead of phones and shoes, people buy and sell tiny pieces of companies (stocks), loans to the government (bonds), and even gold. The prices go up and down based on how many people want to buy vs. sell.",
          beginner: "Financial markets are organized platforms where buyers and sellers trade financial instruments like stocks, bonds, currencies, and commodities. They help companies raise capital, allow investors to grow wealth, and enable price discovery through supply and demand.",
          student: "Financial markets facilitate the allocation of scarce capital resources across the economy. Primary markets handle new issuance (IPOs, FPOs), while secondary markets provide liquidity through continuous trading. Market microstructure — order books, bid-ask spreads, and market makers — determines price efficiency."
        },
        example: "When Zomato listed on the NSE in 2021 at ₹76/share, it raised ₹9,375 crore from investors. The stock hit ₹169 on listing day — that's the primary market (IPO) feeding into the secondary market (daily trading).",
        interactivePrompt: "If a company needs ₹100 crore to build a new factory, should they go to the primary market or secondary market? Why?"
      },
      {
        id: "m1-l2", title: "Types of Financial Markets", duration: "6 min",
        content: {
          teen: "There are different 'shops' for different things: the stock market (company shares), bond market (loans), forex market (currencies like USD/INR), and commodity market (gold, oil). Each has its own rules and vibes.",
          beginner: "The four main types are: equity markets (BSE/NSE for stocks), debt markets (government and corporate bonds), forex markets (currency trading), and commodity markets (MCX for gold, crude oil). Each serves different investor needs and risk profiles.",
          student: "Markets are segmented by instrument type, regulatory framework, and settlement mechanisms. India's equity markets (NSE, BSE) are regulated by SEBI, forex by RBI, and commodities by SEBI post-FMC merger. OTC derivatives markets dwarf exchange-traded volumes globally."
        },
        example: "NSE handles ₹50,000+ crore in equity trades daily. Meanwhile, MCX processes gold and crude oil futures worth thousands of crores. India's forex market sees $35 billion daily turnover.",
        interactivePrompt: "You want to protect your savings from the rupee falling against the dollar. Which market would you look at?"
      },
      {
        id: "m1-l3", title: "Key Players in the Market", duration: "5 min",
        content: {
          teen: "The market has big players (mutual funds, FIIs), medium players (traders), and small players (you and me — retail investors). There are also referees (SEBI) who make sure nobody cheats.",
          beginner: "Market participants include retail investors, institutional investors (mutual funds, insurance companies), Foreign Institutional Investors (FIIs), market makers, brokers (Zerodha, Groww), and regulators like SEBI who ensure fair play and investor protection.",
          student: "Institutional investors drive 65%+ of daily volumes. FII flows significantly impact Indian markets — net FII buying/selling correlates strongly with Nifty direction. SEBI's regulatory framework covers insider trading (SEBI PIT Regulations), corporate governance (LODR), and market surveillance through automated systems."
        },
        example: "When FIIs sold ₹1.5 lakh crore worth of Indian stocks in 2022, the Nifty fell 10%. But DIIs (domestic institutions) and retail investors bought the dip, cushioning the fall.",
        interactivePrompt: "If FIIs are selling heavily but retail investors are buying, what might happen to stock prices in the short term vs. long term?"
      },
      {
        id: "m1-l4", title: "How Stock Exchanges Work", duration: "6 min",
        content: {
          teen: "A stock exchange is like an app where buyers and sellers get matched. You say 'I'll buy Reliance at ₹2,500' and someone else says 'I'll sell at ₹2,500' — done! The exchange makes sure the trade happens fairly.",
          beginner: "Stock exchanges like NSE and BSE match buy and sell orders electronically. When you place an order through your broker app, it goes to the exchange's order matching system. Trades settle in T+1 (next business day), meaning shares appear in your demat account one day after purchase.",
          student: "NSE uses a price-time priority algorithm for order matching. The NEAT (National Exchange for Automated Trading) system processes millions of orders per second. Settlement moved from T+2 to T+1 in India in 2023, improving capital efficiency. Co-location servers provide sub-millisecond execution for algorithmic traders."
        },
        example: "India moved to T+1 settlement in January 2023, one of the first major markets to do so. This means if you sell shares on Monday, you get the money on Tuesday instead of Wednesday.",
        interactivePrompt: "You placed a buy order for TCS at ₹3,800 but the stock is trading at ₹3,850. Will your order execute? What type of order should you have placed?"
      },
      {
        id: "m1-l5", title: "Understanding Market Indices", duration: "5 min",
        content: {
          teen: "Nifty 50 and Sensex are like the 'mood meters' of the stock market. If Nifty is up, most stocks are doing well. It's like checking if 'the market is happy or sad today.'",
          beginner: "Market indices like Nifty 50 (top 50 companies on NSE) and Sensex (top 30 on BSE) track overall market performance. They're weighted by market capitalization — larger companies like Reliance, TCS, and HDFC Bank have more influence on the index value.",
          student: "Nifty 50 uses free-float market cap weighting, recalibrated semi-annually. Sector indices (Bank Nifty, IT Nifty) provide granular exposure tracking. The VIX (India VIX) measures expected 30-day volatility derived from Nifty options pricing — a 'fear gauge' for the market."
        },
        example: "On March 23, 2020, Nifty hit 7,511 during COVID panic. By October 2021, it crossed 18,000 — a 140% rally in 18 months. Those who understood indices knew the entire market was recovering, not just individual stocks.",
        interactivePrompt: "If Reliance (12% weight in Nifty) rises 5% but other 49 stocks fall 1% each, will Nifty go up or down?"
      },
    ],
    quiz: [
      { question: "What is the primary purpose of a stock exchange?", options: ["To set stock prices by the government", "To match buyers and sellers for trading", "To guarantee profits for investors", "To print currency"], correctIndex: 1, explanation: "Stock exchanges provide a platform where buy and sell orders are matched electronically, enabling fair price discovery." },
      { question: "What does SEBI stand for?", options: ["Stock Exchange Board of India", "Securities and Exchange Board of India", "Securities and Equity Bureau of India", "Stock and Equity Board of India"], correctIndex: 1, explanation: "SEBI (Securities and Exchange Board of India) is the regulatory body that oversees Indian securities markets." },
      { question: "What is India's current stock trade settlement cycle?", options: ["T+0 (same day)", "T+1 (next business day)", "T+2 (two business days)", "T+3 (three business days)"], correctIndex: 1, explanation: "India moved to T+1 settlement in January 2023, meaning trades settle the next business day." },
      { question: "The Nifty 50 index represents:", options: ["50 cheapest stocks on NSE", "Top 50 companies by market cap on NSE", "50 newest IPOs", "50 stocks chosen randomly"], correctIndex: 1, explanation: "Nifty 50 tracks the top 50 companies by free-float market capitalization on the National Stock Exchange." },
      { question: "Who are FIIs?", options: ["First-time Indian Investors", "Foreign Institutional Investors", "Federal Insurance Institutions", "Financial Index Indicators"], correctIndex: 1, explanation: "FIIs are large foreign investment entities like pension funds and hedge funds that invest in Indian markets." },
    ]
  },
  {
    id: "m2",
    title: "How Stocks Move",
    subtitle: "Demand, supply & news decoded",
    icon: "📊",
    level: "Beginner",
    overview: "Stock prices aren't random — they move based on who wants to buy, who wants to sell, and what news is shaking the market. Master this, and you'll start seeing patterns where others see chaos.",
    xpReward: 600,
    badge: { name: "Trend Spotter", icon: "🔭" },
    unlockAfter: "m1",
    predictionUnlock: true,
    lessons: [
      {
        id: "m2-l1", title: "Supply & Demand in Stocks", duration: "5 min",
        content: {
          teen: "It's like limited-edition sneakers. If everyone wants Nike Dunks but only 100 pairs exist, the price skyrockets. Stocks work the same — more buyers than sellers = price goes up.",
          beginner: "Stock prices are determined by supply (sellers) and demand (buyers). When more people want to buy a stock than sell it, the price rises. When sellers outnumber buyers, the price falls. This is reflected in the order book — a live list of all buy and sell orders.",
          student: "Price discovery occurs through continuous double auction mechanisms. The order book depth at various price levels determines liquidity and potential slippage. Market impact — how much your trade moves the price — depends on order size relative to available liquidity at the best bid/ask."
        },
        example: "When Adani Group stocks saw massive selling in Jan 2023 after the Hindenburg report, there were far more sellers than buyers. Adani Enterprises fell 60% in days — that's extreme supply-demand imbalance.",
        interactivePrompt: "A company announces record profits. What happens to the number of buyers vs sellers? How does the price react?"
      },
      {
        id: "m2-l2", title: "News Impact on Stock Prices", duration: "6 min",
        content: {
          teen: "Stocks react to news like you react to exam results. Good results (earnings beat) = celebration (price up). Bad results (scam exposed) = panic (price crashes). The twist? Markets react to EXPECTATIONS, not just facts.",
          beginner: "News moves markets through sentiment shifts. Earnings reports, government policies, global events, and company announcements all affect stock prices. The key insight: markets are forward-looking — stocks often 'price in' expected news before it happens, leading to 'buy the rumor, sell the news' patterns.",
          student: "Efficient Market Hypothesis (semi-strong form) suggests prices rapidly incorporate all public information. However, behavioral biases create predictable anomalies — post-earnings announcement drift, momentum effects, and sentiment-driven mispricings create alpha opportunities for systematic traders."
        },
        example: "When RBI unexpectedly raised interest rates in May 2022, Bank Nifty dropped 3% in minutes. But when the expected rate hike came in June, markets barely moved — it was already 'priced in.'",
        interactivePrompt: "A pharmaceutical company is expected to get FDA approval for a new drug. The stock has already risen 30% on this expectation. The approval comes through. What happens to the stock price?"
      },
      {
        id: "m2-l3", title: "Volume — The Market's Heartbeat", duration: "5 min",
        content: {
          teen: "Volume is how many shares were traded. Think of it like Instagram likes — a post with 10,000 likes means people care about it. A stock moving on high volume means the move is 'real.' Low volume? Could be fake noise.",
          beginner: "Trading volume measures how many shares changed hands. High volume confirms price trends — a breakout on high volume is more reliable than one on low volume. Volume spikes often precede or accompany major price moves, making it a critical confirmation indicator.",
          student: "Volume analysis reveals institutional participation. OBV (On-Balance Volume) and VWAP (Volume-Weighted Average Price) are essential tools. Abnormal volume relative to the 20-day average signals potential breakouts or breakdowns. Dark pool and block trade data provide additional institutional flow insights."
        },
        example: "Tata Motors' average daily volume is ~30 million shares. On days when EV-related news drops, volume can spike to 100M+ shares. These high-volume days often mark the start of new trends.",
        interactivePrompt: "Stock A rises 5% on 10x normal volume. Stock B rises 5% on half the normal volume. Which move is more trustworthy and why?"
      },
      {
        id: "m2-l4", title: "Circuit Breakers & Market Halts", duration: "4 min",
        content: {
          teen: "When the market goes crazy (too much up or down), the exchange hits the pause button — like a teacher stopping class when students get too rowdy. This prevents total chaos.",
          beginner: "Circuit breakers are automatic trading halts triggered when indices fall sharply. The NSE has three tiers: 10%, 15%, and 20% drops from the previous close. Individual stocks also have price bands (5%, 10%, 20%) that limit daily price movement to prevent manipulation.",
          student: "Market-wide circuit breakers (MWCB) are based on S&P BSE Sensex movements. The pre-open call auction session after a halt allows for orderly price discovery. Stock-specific circuits are set based on market cap and trading history. F&O stocks have no upper/lower circuits but have price bands."
        },
        example: "On March 23, 2020, Sensex fell 3,935 points (13%), triggering a market-wide circuit breaker for the first time since 2008. Trading was halted for 45 minutes before resuming.",
        interactivePrompt: "Why do you think circuit breakers exist? What could happen if stocks could fall 90% in a single day?"
      },
      {
        id: "m2-l5", title: "Bull vs Bear Markets", duration: "5 min",
        content: {
          teen: "Bull market = prices going up like a bull charging upward. Bear market = prices falling like a bear swiping downward. The trick is knowing which one you're in and adjusting your game plan.",
          beginner: "A bull market is a sustained period of rising prices (typically 20%+ gain from recent low). A bear market is the opposite (20%+ decline from recent high). Understanding market cycles helps you make better decisions — buying during bear markets and being cautious during euphoric bull runs.",
          student: "Market cycles follow stages: accumulation, markup, distribution, and markdown (Wyckoff theory). Secular bull/bear markets span years; cyclical ones occur within them. Breadth indicators (advance-decline ratio, percentage of stocks above 200 DMA) help identify cycle phases more reliably than index levels alone."
        },
        example: "India's market from March 2020 (Nifty 7,511) to October 2021 (Nifty 18,600) was a classic bull market. The period from Oct 2021 to June 2022 (Nifty falling to 15,200) was a bear market correction.",
        interactivePrompt: "We're in a bull market and your friend says 'stocks only go up!' What would you tell them based on market cycle theory?"
      },
    ],
    quiz: [
      { question: "What primarily determines stock prices?", options: ["Government decisions", "Supply and demand from buyers and sellers", "The stock exchange setting prices", "Company CEOs deciding prices"], correctIndex: 1, explanation: "Stock prices are determined by the balance of supply (sellers) and demand (buyers) in the market." },
      { question: "What does 'priced in' mean?", options: ["The stock has a fixed price", "The market has already adjusted for expected news", "The stock is overpriced", "The stock price equals its face value"], correctIndex: 1, explanation: "When news is 'priced in,' the market has already adjusted the stock price based on expectations before the actual announcement." },
      { question: "High volume during a price rise indicates:", options: ["The move is unreliable", "Strong conviction behind the price move", "Market manipulation", "Low investor interest"], correctIndex: 1, explanation: "High volume confirms that many participants support the price movement, making it more reliable than a low-volume move." },
      { question: "A bear market is defined as a decline of:", options: ["5% from the peak", "10% from the peak", "20% or more from the peak", "50% from the peak"], correctIndex: 2, explanation: "A bear market is traditionally defined as a decline of 20% or more from a recent market high." },
      { question: "Why do circuit breakers exist?", options: ["To make stocks more expensive", "To prevent extreme panic-driven crashes", "To help large traders", "To close markets early on Fridays"], correctIndex: 1, explanation: "Circuit breakers halt trading during extreme moves to prevent panic selling and give investors time to make rational decisions." },
    ]
  },
  {
    id: "m3",
    title: "Risk, Diversification & Portfolio Basics",
    subtitle: "Don't put all eggs in one basket",
    icon: "🛡️",
    level: "Intermediate",
    overview: "Risk is not about avoiding losses — it's about understanding them. Learn how to build a portfolio that survives bad days and thrives on good ones. Diversification is your superpower.",
    xpReward: 600,
    badge: { name: "Risk Analyst", icon: "🛡️" },
    unlockAfter: "m2",
    lessons: [
      {
        id: "m3-l1", title: "Understanding Risk & Return", duration: "6 min",
        content: {
          teen: "Higher risk = higher potential reward. It's like choosing between a ₹10 samosa (safe, always tasty) and a ₹500 mystery box (could be amazing or terrible). Investing is about knowing how much risk you can stomach.",
          beginner: "Risk and return are directly related. Fixed deposits give 6-7% with near-zero risk. Stocks can give 15-20% annually but with significant volatility. Understanding your risk tolerance — how much loss you can handle emotionally and financially — is the foundation of good investing.",
          student: "Risk is quantified through standard deviation (volatility), beta (systematic risk), and Value at Risk (VaR). The Capital Asset Pricing Model (CAPM) relates expected return to systematic risk: E(R) = Rf + β(Rm - Rf). Sharpe ratio measures risk-adjusted returns, enabling comparison across different asset classes."
        },
        example: "Paytm IPO at ₹2,150 in Nov 2021 dropped to ₹500 by 2022 — a 75% loss. Meanwhile, a simple Nifty index fund gained 12% CAGR over 10 years with lower volatility. Higher risk doesn't always mean higher returns.",
        interactivePrompt: "You have ₹1 lakh to invest. Option A: FD at 7% guaranteed. Option B: Stock that could give +40% or -30%. Which do you choose and why?"
      },
      {
        id: "m3-l2", title: "The Magic of Diversification", duration: "5 min",
        content: {
          teen: "Don't put all your money in one stock. If you only own Zomato and it crashes, you're done. But if you own Zomato + Reliance + TCS + SBI, one crash won't destroy everything. That's diversification — being smart, not just brave.",
          beginner: "Diversification means spreading investments across different stocks, sectors, and asset classes to reduce risk. The key insight: uncorrelated assets reduce portfolio volatility without proportionally reducing returns. A mix of IT, banking, pharma, and FMCG stocks provides better risk-adjusted returns than any single sector.",
          student: "Modern Portfolio Theory (Markowitz) shows that an efficient portfolio maximizes return for a given risk level. The efficient frontier represents optimal portfolios. Diversification reduces unsystematic (company-specific) risk but not systematic (market) risk. Correlation coefficients between assets determine diversification benefit — aim for low or negative correlations."
        },
        example: "In 2022, IT stocks (Infosys, TCS) fell 25% while energy stocks (ONGC, Coal India) rose 30%. An investor holding both sectors broke even, while someone all-in on IT lost significantly.",
        interactivePrompt: "Build a 5-stock portfolio across different sectors. Explain why you chose each sector and how they protect each other."
      },
      {
        id: "m3-l3", title: "Asset Allocation Strategies", duration: "6 min",
        content: {
          teen: "Asset allocation is deciding how much money goes where. Like planning your screen time: some for studying (bonds), some for gaming (stocks), some for YouTube (gold). The mix depends on your age and goals.",
          beginner: "Asset allocation divides your portfolio between asset classes: equities (growth), debt/bonds (stability), gold (hedge), and cash (liquidity). A common rule: allocate (100 - your age)% to equities. A 25-year-old might do 75% equity, 15% debt, 10% gold. Rebalance periodically.",
          student: "Strategic asset allocation sets long-term targets based on risk tolerance and investment horizon. Tactical allocation allows short-term deviations to exploit market conditions. Factor-based allocation (value, momentum, quality, low volatility) provides systematic exposure to return-driving factors beyond simple asset class allocation."
        },
        example: "A 25-year-old with ₹10,000/month SIP might split: ₹6,000 in Nifty 50 index fund, ₹2,000 in mid-cap fund, ₹1,000 in gold ETF, ₹1,000 in liquid fund. This gives growth + stability.",
        interactivePrompt: "Your friend (age 22) wants to put 100% in small-cap stocks. What's wrong with this approach and what would you suggest instead?"
      },
      {
        id: "m3-l4", title: "SIPs — Your Secret Weapon", duration: "5 min",
        content: {
          teen: "SIP = Systematic Investment Plan. Instead of putting ₹60,000 at once, you invest ₹5,000 every month. When prices are low, you get more units. When prices are high, you get fewer. Over time, you average out the ups and downs.",
          beginner: "SIPs leverage rupee cost averaging — investing a fixed amount regularly regardless of market conditions. This eliminates the need to time the market. In falling markets, your fixed amount buys more units; in rising markets, fewer units. Over time, your average cost tends to be lower than the average market price.",
          student: "SIPs exploit the volatility drag reduction through dollar-cost averaging. Mathematical analysis shows SIPs outperform lump sum only in sideways/declining markets. In trending bull markets, lump sum wins. Value-averaging (adjusting SIP amounts based on portfolio value vs target) provides superior risk-adjusted returns in backtesting."
        },
        example: "₹10,000 SIP in Nifty 50 index fund started in Jan 2015 would have grown to ₹22+ lakh by 2024 (invested ₹12 lakh). That's the power of consistent investing through market cycles.",
        interactivePrompt: "Calculate: ₹5,000 SIP for 20 years at 12% annual return. How much would you invest vs. how much you'd have? (Hint: use compounding)"
      },
      {
        id: "m3-l5", title: "When to Rebalance Your Portfolio", duration: "5 min",
        content: {
          teen: "Rebalancing is like cleaning your room. Over time, things get messy — maybe your stocks grew too much and now you're 90% equity instead of 70%. Time to sell some stocks and buy other assets to get back to your plan.",
          beginner: "Rebalancing means periodically adjusting your portfolio back to target allocations. If stocks outperform and grow from 70% to 85% of your portfolio, you sell some stocks and buy bonds/gold to return to 70%. This forces you to 'buy low, sell high' systematically. Rebalance annually or when allocations drift 5%+ from targets.",
          student: "Rebalancing generates a 'volatility harvesting' premium estimated at 0.5-1% annually. Calendar rebalancing (annual/semi-annual) vs. threshold rebalancing (5% drift trigger) show similar risk-adjusted performance. Transaction costs and tax implications must be considered — use new inflows for rebalancing when possible to minimize tax events."
        },
        example: "In March 2020, a 70/30 equity-debt portfolio would have shifted to 55/45 as stocks crashed. Rebalancing by moving 15% from debt to equity captured the entire recovery rally.",
        interactivePrompt: "Your portfolio target is 70% equity, 30% debt. After a bull run, it's now 85/15. Describe the rebalancing steps you'd take."
      },
    ],
    quiz: [
      { question: "What does diversification reduce?", options: ["All investment risk", "Systematic (market) risk", "Unsystematic (company-specific) risk", "Returns only"], correctIndex: 2, explanation: "Diversification reduces unsystematic risk (specific to individual companies) but cannot eliminate systematic risk that affects the entire market." },
      { question: "The general rule for equity allocation by age is:", options: ["Always 100% equity", "Equity % = your age", "Equity % = 100 minus your age", "Always 50/50"], correctIndex: 2, explanation: "A common rule of thumb is to allocate (100 - your age)% to equities, becoming more conservative as you age." },
      { question: "SIP stands for:", options: ["Stock Investment Program", "Systematic Investment Plan", "Standard Index Portfolio", "Share Income Protocol"], correctIndex: 1, explanation: "SIP (Systematic Investment Plan) involves investing a fixed amount regularly, typically monthly, in a mutual fund or ETF." },
      { question: "What is rupee cost averaging?", options: ["Getting the lowest price always", "Buying more units when prices are low through regular investing", "Averaging your profits in rupees", "Converting foreign investments to rupees"], correctIndex: 1, explanation: "Rupee cost averaging means your fixed SIP amount automatically buys more units when prices are low and fewer when prices are high." },
      { question: "When should you rebalance your portfolio?", options: ["Every day", "When allocations drift significantly from targets", "Only when markets crash", "Never, let it ride"], correctIndex: 1, explanation: "Rebalance when allocations drift 5%+ from targets or on a regular schedule (annually/semi-annually) to maintain your desired risk level." },
    ]
  },
  {
    id: "m4",
    title: "Fundamental vs Technical Analysis",
    subtitle: "Two lenses, one market",
    icon: "🔍",
    level: "Intermediate",
    overview: "Fundamental analysis asks 'Is this company worth buying?' Technical analysis asks 'Is this the right time to buy?' Together, they form a powerful toolkit for making informed investment decisions.",
    xpReward: 700,
    badge: { name: "Market Analyst", icon: "📐" },
    unlockAfter: "m3",
    lessons: [
      {
        id: "m4-l1", title: "What is Fundamental Analysis?", duration: "6 min",
        content: {
          teen: "Fundamental analysis is like checking a restaurant's reviews, menu, and chef before eating there. You look at the company's profits, debts, and future plans to decide if its stock is worth buying. Good company ≠ good stock price (yet).",
          beginner: "Fundamental analysis evaluates a company's intrinsic value by examining financial statements (profit & loss, balance sheet, cash flow), industry position, management quality, and growth prospects. If the intrinsic value is higher than the current stock price, the stock might be undervalued — a potential buy.",
          student: "Fundamental analysis uses two approaches: top-down (economy → sector → company) and bottom-up (company-first). DCF (Discounted Cash Flow) models estimate intrinsic value by projecting future cash flows and discounting to present value using WACC. Relative valuation using P/E, EV/EBITDA, and PEG ratios provides cross-company comparisons within sectors."
        },
        example: "In 2020, Avenue Supermarts (DMart) traded at P/E of 160x while ITC traded at P/E of 15x. DMart's high P/E reflected expected 25%+ growth; ITC's low P/E reflected slower growth expectations. Neither was 'wrong' — they reflected different growth stories.",
        interactivePrompt: "Company A has P/E of 10 with 5% growth. Company B has P/E of 50 with 40% growth. Which might be a better investment?"
      },
      {
        id: "m4-l2", title: "Key Financial Ratios", duration: "7 min",
        content: {
          teen: "Financial ratios are like a report card for companies. P/E tells you if a stock is 'expensive.' ROE tells you how well the company uses your money. Debt/Equity tells you if the company borrowed too much. Check all three before investing.",
          beginner: "Essential ratios: P/E (Price/Earnings — lower may mean cheaper), P/B (Price/Book — company value vs stock price), ROE (Return on Equity — profitability), Debt/Equity (leverage level), and EPS growth (earnings trend). Compare ratios within the same sector, not across different industries.",
          student: "DuPont decomposition breaks ROE into: Net Margin × Asset Turnover × Equity Multiplier, revealing whether returns come from profitability, efficiency, or leverage. PEG ratio (P/E ÷ growth rate) normalizes for growth differences. Free Cash Flow yield (FCF/Market Cap) is often more reliable than P/E as it's harder to manipulate than accounting earnings."
        },
        example: "HDFC Bank: P/E ~20, ROE ~17%, Debt/Equity appropriate for banking. Yes Bank in 2019: P/E looked cheap at 8x, but ROE was plummeting and bad loans were rising. P/E alone would have misled you — context matters.",
        interactivePrompt: "A company has P/E of 5 (very cheap!) but its debt-to-equity is 4.0 and ROE is negative. Would you buy it? Why or why not?"
      },
      {
        id: "m4-l3", title: "Introduction to Technical Analysis", duration: "6 min",
        content: {
          teen: "Technical analysis is like reading a stock's body language. Instead of looking at profits, you look at price charts and patterns. If a stock keeps bouncing off ₹500 (support), it probably won't go below easily. If it can't break ₹600 (resistance), it's stuck.",
          beginner: "Technical analysis studies price and volume patterns to predict future movements. Key concepts: support (price floor where buying increases), resistance (price ceiling where selling increases), trends (uptrend, downtrend, sideways), and chart patterns. It's based on the premise that price action reflects all available information.",
          student: "Technical analysis rests on three assumptions: market discounts everything, prices move in trends, and history repeats. Dow Theory identifies primary trends (months-years), secondary trends (weeks-months), and minor trends (days). Elliott Wave Theory proposes markets move in fractal wave patterns of 5 impulse waves and 3 corrective waves."
        },
        example: "Nifty repeatedly tested 17,800 as resistance in late 2022 before breaking through in early 2023. Once broken, 17,800 became support. This 'resistance-turned-support' concept is a core technical analysis principle.",
        interactivePrompt: "Look at any Nifty chart. Can you identify two support levels and two resistance levels? What would you do if price approaches a support level?"
      },
      {
        id: "m4-l4", title: "Popular Technical Indicators", duration: "7 min",
        content: {
          teen: "Indicators are like GPS for stock traders. RSI tells you if a stock is 'overbought' (too expensive right now) or 'oversold' (bargain time). Moving averages smooth out the noise so you can see the real trend.",
          beginner: "Key indicators: Moving Averages (50-day and 200-day show trends), RSI (above 70 = overbought, below 30 = oversold), MACD (shows momentum shifts), and Bollinger Bands (show volatility). Use 2-3 indicators together for confirmation — no single indicator is reliable alone.",
          student: "RSI divergence (price makes new high but RSI doesn't) is a powerful reversal signal. MACD histogram contraction signals potential trend changes. Volume-price analysis through VWAP provides institutional reference points. Fibonacci retracements (38.2%, 50%, 61.8%) identify potential reversal levels based on prior moves."
        },
        example: "When Nifty RSI hit 85 in October 2021 (extremely overbought), a correction followed. When RSI hit 25 in March 2020 (extremely oversold), a massive rally followed. RSI extremes don't guarantee reversals but significantly increase probabilities.",
        interactivePrompt: "A stock's RSI is at 75, it's above its 200-day moving average, but MACD is showing bearish divergence. What does this mixed signal tell you?"
      },
      {
        id: "m4-l5", title: "Combining Both Approaches", duration: "5 min",
        content: {
          teen: "The best investors use both fundamental AND technical analysis. Fundamentals tell you WHAT to buy (good companies). Technicals tell you WHEN to buy (right time). It's like knowing a movie is good (reviews) AND picking the best seats (timing).",
          beginner: "The winning approach combines both: use fundamental analysis to identify quality stocks, then use technical analysis to time your entries and exits. Example: fundamentally strong stock at support level with oversold RSI = high-probability buying opportunity. This CANSLIM-like approach reduces both analysis and timing risk.",
          student: "Quantitative approaches blend both: fundamental screens (low P/E, high ROE, growth) filtered by technical conditions (above 200 DMA, RSI < 40, high relative strength). Factor investing frameworks formalize this — value + momentum combination has shown superior risk-adjusted returns across markets globally, including Indian equities."
        },
        example: "In March 2020, TCS at ₹1,700 was fundamentally solid (30%+ ROE, zero debt, consistent growth) and technically oversold (RSI below 25, at multi-year support). Both lenses screamed 'buy.' It hit ₹4,000 within 18 months.",
        interactivePrompt: "Pick a stock. Analyze it using 3 fundamental ratios and 2 technical indicators. What's your verdict — buy, hold, or sell?"
      },
    ],
    quiz: [
      { question: "P/E ratio stands for:", options: ["Price to Equity", "Price to Earnings", "Profit to Expense", "Performance to Efficiency"], correctIndex: 1, explanation: "P/E (Price to Earnings) ratio divides the stock price by earnings per share, showing how much investors pay per rupee of earnings." },
      { question: "RSI above 70 typically indicates:", options: ["Strong buy signal", "Stock is oversold", "Stock is overbought", "Market is closed"], correctIndex: 2, explanation: "RSI above 70 suggests a stock is overbought — it may have risen too fast and could be due for a pullback." },
      { question: "Support in technical analysis is:", options: ["A price level where buying interest increases", "The maximum price a stock can reach", "Government support for the stock", "Customer support from the broker"], correctIndex: 0, explanation: "Support is a price level where buying interest tends to be strong enough to prevent the price from declining further." },
      { question: "Which approach tells you WHAT to buy?", options: ["Technical analysis", "Fundamental analysis", "Sentiment analysis", "Quantitative analysis"], correctIndex: 1, explanation: "Fundamental analysis evaluates company quality and intrinsic value, helping you decide what to buy. Technical analysis helps with when to buy." },
      { question: "ROE measures:", options: ["Revenue over expenses", "Return on equity (profit vs shareholder money)", "Rate of exchange", "Risk of entry"], correctIndex: 1, explanation: "ROE (Return on Equity) measures how much profit a company generates relative to shareholders' equity, showing capital efficiency." },
    ]
  },
  {
    id: "m5",
    title: "Behavioral Finance & Trading Psychology",
    subtitle: "Your biggest enemy is your own brain",
    icon: "🧠",
    level: "Intermediate",
    overview: "Markets are driven by human emotions — greed, fear, FOMO, and overconfidence. Understanding these psychological traps is what separates consistent winners from emotional traders who blow up their accounts.",
    xpReward: 700,
    badge: { name: "Mind Master", icon: "🧘" },
    unlockAfter: "m4",
    lessons: [
      {
        id: "m5-l1", title: "Common Cognitive Biases", duration: "6 min",
        content: {
          teen: "Your brain tricks you into bad trades. Confirmation bias = only reading news that agrees with you. FOMO = buying because everyone else is. Anchoring = thinking a stock is 'cheap' because it used to be higher. Know your enemy — it's your own brain.",
          beginner: "Key biases: Confirmation bias (seeking information that supports your view), Anchoring (fixating on irrelevant reference points), Recency bias (overweighting recent events), Loss aversion (losses hurt 2x more than gains feel good), and Herd mentality (following the crowd). Awareness is the first step to overcoming them.",
          student: "Kahneman & Tversky's Prospect Theory shows asymmetric risk preferences — people are risk-seeking in losses and risk-averse in gains. The disposition effect (selling winners too early, holding losers too long) is empirically validated across markets. Overconfidence leads to excessive trading, reducing net returns by 2-3% annually for active retail traders."
        },
        example: "During the 2021 crypto bull run, millions of young Indians poured savings into coins like SHIB and DOGE driven by FOMO and herd mentality. When crypto crashed 70%+ in 2022, loss aversion kept them holding, hoping for a recovery instead of cutting losses.",
        interactivePrompt: "You bought a stock at ₹500. It's now ₹300. A better opportunity exists elsewhere. Why is it so hard to sell? Which bias is at work?"
      },
      {
        id: "m5-l2", title: "Fear & Greed — Market's Twin Engines", duration: "5 min",
        content: {
          teen: "Markets swing between two emotions: 'OMG everything is going up, I need to buy NOW!' (greed) and 'OMG everything is crashing, I need to sell NOW!' (fear). Warren Buffett said: 'Be greedy when others are fearful.' Easier said than done though.",
          beginner: "The Fear & Greed Index quantifies market sentiment. Extreme greed (everyone buying) often marks market tops. Extreme fear (everyone selling) often marks market bottoms. Contrarian investing — doing the opposite of the crowd at extremes — sounds simple but requires emotional discipline most people lack.",
          student: "Sentiment indicators (put/call ratio, VIX, mutual fund flows, IPO activity) quantify market psychology. Mean reversion in sentiment creates systematic opportunities. However, sentiment extremes can persist longer than expected — 'the market can stay irrational longer than you can stay solvent' (Keynes). Position sizing and risk management matter more than sentiment timing."
        },
        example: "India VIX spiked to 80+ in March 2020 (extreme fear). Those who bought Nifty at 7,500 when everyone was panicking saw 140% returns in 18 months. The Fear & Greed Index was screaming 'fear' — contrarians were rewarded.",
        interactivePrompt: "Markets have rallied 50% in 6 months. Everyone is euphoric, IPOs are oversubscribed 100x. What would a contrarian investor do?"
      },
      {
        id: "m5-l3", title: "The Art of Patience in Investing", duration: "5 min",
        content: {
          teen: "The stock market rewards patience, not speed. Checking your portfolio 10 times a day won't make it grow faster. The best investors buy good stocks and hold them for years. It's boring, but boring = rich over time.",
          beginner: "Time in the market beats timing the market. If you invested ₹1 lakh in Nifty 50 in 2010 and held for 14 years, you'd have ₹6+ lakh. But if you missed just the 10 best trading days, your returns would be cut by more than half. Patience and staying invested are your biggest edges.",
          student: "Behavioral studies show retail investors who trade less outperform those who trade more. Transaction costs, bid-ask spreads, and short-term capital gains tax erode returns from frequent trading. The 'coffee can' portfolio approach (buy quality, forget for years) has empirically outperformed active management for most retail investors."
        },
        example: "An investor who put ₹10,000 in Infosys during its 1993 IPO and simply held would have over ₹5 crore today (including splits and bonuses). No trading, no timing — just patience with a quality company.",
        interactivePrompt: "You invested ₹1 lakh in a great company. After 6 months, it's down 20%. Your friend says 'sell before it falls more.' What do you do?"
      },
      {
        id: "m5-l4", title: "Building a Trading Plan", duration: "6 min",
        content: {
          teen: "Trading without a plan is like playing a game without knowing the rules. A good plan has: what you'll buy, how much you'll spend, when you'll sell (profit target), and when you'll cut losses (stop loss). Write it down BEFORE you trade.",
          beginner: "A trading plan includes: entry criteria (why buy?), position sizing (how much?), stop loss (when to cut losses — typically 7-10% below entry), profit target (when to book gains), and review schedule (weekly/monthly analysis). Following the plan removes emotion from decisions — the hardest but most important skill.",
          student: "Professional trading plans include edge definition (what gives you an advantage), risk-per-trade (typically 1-2% of capital), risk-reward ratio (minimum 1:2), maximum portfolio heat (total risk across all positions), and journaling for continuous improvement. Systematic backtesting of entry/exit rules provides statistical confidence in the strategy."
        },
        example: "Rakesh Jhunjhunwala's approach: buy fundamentally strong companies (Titan, Tata Motors) at reasonable prices, hold for years, and add during corrections. His plan was simple but he followed it with discipline — worth ₹46,000 crore at his peak.",
        interactivePrompt: "Create a simple trading plan: Pick 1 stock, set your entry price, stop loss (where you'll sell if wrong), and target price (where you'll take profits)."
      },
      {
        id: "m5-l5", title: "Learning From Losses", duration: "5 min",
        content: {
          teen: "Every investor loses money sometimes — even Warren Buffett. The difference between good and bad investors is what they do AFTER a loss. Good investors ask 'What did I learn?' Bad investors blame the market and repeat the same mistake.",
          beginner: "Losses are tuition fees in the market. Keep a trading journal: record every trade with your reasoning, outcome, and lessons. Common patterns emerge — maybe you always buy too late (FOMO) or hold losers too long (loss aversion). Identifying your personal patterns is the fastest way to improve.",
          student: "Post-trade analysis should evaluate process over outcome. A good trade with a bad outcome (correct analysis, stopped out by noise) is still a good trade. Track metrics: win rate, average win/loss ratio, maximum drawdown, and Sharpe ratio of returns. Continuous improvement through data-driven journaling separates professionals from amateurs."
        },
        example: "The 2008 financial crisis wiped out experienced hedge funds. But the investors who survived learned crucial lessons about leverage, correlation, and tail risk. Nassim Taleb's 'Antifragile' philosophy — growing stronger from volatility — is the ultimate investing mindset.",
        interactivePrompt: "You lost 15% on a trade. Write a 3-point journal entry: What went wrong, what you'd do differently, and one rule you'll add to your trading plan."
      },
    ],
    quiz: [
      { question: "Loss aversion means:", options: ["Avoiding all risks", "Losses feel about 2x more painful than equivalent gains feel good", "Never investing in stocks", "Only investing in safe assets"], correctIndex: 1, explanation: "Prospect Theory shows people feel the pain of losses about twice as intensely as the pleasure of equivalent gains, leading to irrational holding of losing positions." },
      { question: "What is the disposition effect?", options: ["Selling winners too early and holding losers too long", "Disposing of all stocks during a crash", "The effect of market disposition on returns", "Selling all positions at once"], correctIndex: 0, explanation: "The disposition effect is the tendency to sell winning positions too quickly (to lock in gains) while holding losing positions too long (hoping for recovery)." },
      { question: "FOMO in investing stands for:", options: ["First Order Market Option", "Fear Of Missing Out", "Financial Options Market Order", "Fundamental Operating Market Overview"], correctIndex: 1, explanation: "FOMO (Fear Of Missing Out) drives investors to buy into rallying assets without proper analysis, often near the top of a move." },
      { question: "'Be greedy when others are fearful' is attributed to:", options: ["Elon Musk", "Warren Buffett", "Rakesh Jhunjhunwala", "RBI Governor"], correctIndex: 1, explanation: "Warren Buffett's famous contrarian advice suggests buying during market panics when others are selling fearfully, and being cautious during euphoria." },
      { question: "A trading journal helps by:", options: ["Predicting stock prices", "Identifying your personal behavioral patterns", "Guaranteeing profits", "Eliminating all risk"], correctIndex: 1, explanation: "Trading journals help you identify recurring mistakes and biases in your decision-making, enabling continuous improvement through self-awareness." },
    ]
  }
];

export const badges = [
  { id: "market_rookie", name: "Market Rookie", icon: "🌟", module: "m1", description: "Complete Module 1" },
  { id: "trend_spotter", name: "Trend Spotter", icon: "🔭", module: "m2", description: "Complete Module 2" },
  { id: "risk_analyst", name: "Risk Analyst", icon: "🛡️", module: "m3", description: "Complete Module 3" },
  { id: "market_analyst", name: "Market Analyst", icon: "📐", module: "m4", description: "Complete Module 4" },
  { id: "mind_master", name: "Mind Master", icon: "🧘", module: "m5", description: "Complete Module 5" },
  { id: "quiz_ace", name: "Quiz Ace", icon: "🎯", description: "Score 100% on any quiz" },
  { id: "streak_warrior", name: "Streak Warrior", icon: "🔥", description: "7-day learning streak" },
];

export type ExplainMode = "teen" | "beginner" | "student";

export const explainModeLabels: Record<ExplainMode, string> = {
  teen: "Explain Like I'm 15",
  beginner: "Explain Like a Beginner Investor",
  student: "Explain Like a Finance Student",
};
