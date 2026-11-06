# Kunal Singh Finance Portfolio

Dependency-free GitHub Pages portfolio focused on investment research, portfolio analytics,
financial risk, and reproducible data systems.

The site uses semantic HTML, a white/silver visual system, oversized centered typography,
blue accents, and responsive WebP portraits with PNG fallbacks. The opening includes a
local decorative SVG surface; it is abstract artwork, not a model output or performance
chart. Short opacity/transform reveals and native scrolling support the research stories.
The hero artwork floats gently while visible and shifts slightly with native scroll.
Effects pause offscreen or in a hidden tab; reduced-motion preferences disable them.

Fine-pointer movement adds a small perspective response and soft highlight to the hero
artwork, using a separate transform layer and event-coalesced frames. Touch visitors keep
native scrolling and receive press feedback on controls. Research charts draw once on
entry; cards and navigation provide hover and keyboard-focus feedback. All visual
enhancements have static fallbacks and honor reduced-motion preferences.

Financial figures render immediately at their final values. Scroll progress updates only
on scroll/resize through one coalesced animation frame; there is no canvas render loop,
scroll hijacking, font download, or motion dependency. Pointer interaction schedules frames
only while the pointer moves over the artwork; leaving it cancels pending work.

## Local Preview

Serve the repository root with any static HTTP server. For example:

```text
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

GitHub Pages deploys the `main` branch from the repository root:

```text
https://kunalsingh-finance.github.io/kunal-singh-finance-site/
```

## Public-Safe Content

The site links to public repositories and excludes resumes, raw certificates, account
identifiers, source PortfolioAnalyst PDFs, detailed position sizes, restricted account
screenshots, and unreviewed course artifacts.

The portfolio case study uses rounded public-facing summary metrics only. It does not expose
account identifiers, raw statements, transaction files, or detailed holdings data.

Credential cards use reviewed PNG previews. Verification codes and unrelated participant
details are removed from the public copies while original certificate files remain private.

## Public Project Collection

The project directory was updated on October 21, 2026, with the public Market Microstructure
and Options Volatility projects. Their descriptions and figures were checked against their
published READMEs; the existing collection was reviewed on October 5, 2026.
It includes all 18 public research/analytics projects owned by `kunalsingh-finance`;
the GitHub profile and this website are not counted as research projects. Seven additional
analytical studies retain their reviewed summaries without publishing source course files.

| Research area | Public projects |
| --- | --- |
| Execution and derivatives | [Market Microstructure & Optimal Execution Engine](https://github.com/kunalsingh-finance/market-microstructure-execution-engine), [Options Volatility & Dynamic Hedging Engine](https://github.com/kunalsingh-finance/options-volatility-hedging-engine) |
| Portfolios and manager research | [ETF Holdings & Portfolio Transition Lab](https://github.com/kunalsingh-finance/etf-portfolio-transition-lab), [Investment Manager Research Lab](https://github.com/kunalsingh-finance/investment-manager-research-lab), [IPS-Driven Asset Allocation](https://github.com/kunalsingh-finance/ips-driven-asset-allocation-engine), [Black-Litterman Optimizer](https://github.com/kunalsingh-finance/black-litterman-portfolio-optimizer), [GKX Public-Data Replication](https://github.com/kunalsingh-finance/gkx-public-data-replication), [Stock Return Prediction](https://github.com/kunalsingh-finance/statistical-learning-stock-return-prediction) |
| Fixed income, bank risk and credit | [Treasury Curve & Hedge Engine](https://github.com/kunalsingh-finance/treasury-curve-risk), [Bank ALM & Liquidity Risk Engine](https://github.com/kunalsingh-finance/bank-alm-risk-engine), [Structured Credit Research](https://github.com/kunalsingh-finance/structured-credit-research), [Direct Lending Surveillance Lab](https://github.com/kunalsingh-finance/direct-lending-surveillance-lab), [U.S. Bank Risk Platform](https://github.com/kunalsingh-finance/us-bank-risk-regulatory-data-platform) |
| Fund operations and private capital | [Private Markets Capital Lab](https://github.com/kunalsingh-finance/private-markets-capital-lab), [PBOR](https://github.com/kunalsingh-finance/PBOR), [Fund NAV Reconciliation](https://github.com/kunalsingh-finance/fund-nav-reconciliation-engine) |
| Research inputs and data quality | [Shrinkage-to-Black-Litterman Bridge](https://github.com/kunalsingh-finance/shrinkage-bl-bridge), [M&A Target Screening](https://github.com/kunalsingh-finance/M-A-Target-Screening-Workflow) |

Descriptions distinguish downloaded public observations from synthetic records and
illustrative portfolio assumptions. They retain negative holdout results, weak calibration,
source exceptions, and unresolved reconciliation/replay differences. Numerical checks are
not presented as evidence of forecast accuracy. Source provenance, methods, and authorship
disclosures remain in the linked project repositories.

The directory and its category links are static HTML and remain usable without JavaScript.
Adding projects does not add a backend, external data requests, or a motion dependency.

The latest-research section replaces the employment timeline with two detailed project
stories and links to public evidence, including the interactive options report. It retains
the profile and education cards. The former `#experience` anchor still resolves to this
section; current navigation uses `#latest-research`.
