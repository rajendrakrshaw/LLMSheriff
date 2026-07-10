export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://llmsheriff.rajendra.dev";

export const portfolioApiBaseUrl =
  process.env.NEXT_PUBLIC_PORTFOLIO_API_BASE_URL || "http://localhost:4000";

export const authorSiteUrl = "https://rajendra.dev";

export const profile = {
  name: "Rajendra Kumar Shaw",
  email: "rajendra250601@gmail.com",
  phone: "+91 7980998132",
  website: authorSiteUrl,
  contactUrl: `${authorSiteUrl}/contact`,
  github: "https://github.com/rajendrakrshaw",
  linkedin: "https://www.linkedin.com/in/rajendra-kumar-shaw",
};

export const footerNavLinks = [
  { label: "Research", href: `${authorSiteUrl}/research` },
  { label: "Publications", href: `${authorSiteUrl}/publications` },
  { label: "Projects", href: `${authorSiteUrl}/projects` },
  { label: "Experience", href: `${authorSiteUrl}/experience` },
  { label: "About", href: `${authorSiteUrl}/about` },
  { label: "Contact", href: `${authorSiteUrl}/contact` },
  { label: "Website", href: authorSiteUrl },
];

export const siteSeo = {
  siteName: "LLMSheriff",
  locale: "en_IN",
  themeColor: "#1a5276",
  image: `${siteUrl}/og-cover.svg`,
  keywords: [
    "LLMSheriff",
    "Rajendra Kumar Shaw",
    "agent observability",
    "intent inference",
    "agentic AI",
    "AI agent monitoring",
    "behavioral states",
    "execution traces",
    "LLM evaluation",
    "research prototype",
    "hybrid inference",
    "NVIDIA Nemotron",
    "FastAPI",
    "Next.js",
  ],
  title: "LLMSheriff | Intent-Aware Agent Monitoring Research Prototype",
  description:
    "LLMSheriff is a research prototype that infers behavioral intent states from autonomous AI agent execution traces using hybrid rule-based and LLM analysis.",
};

export const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LLMSheriff",
  applicationCategory: "ResearchApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description: siteSeo.description,
  author: {
    "@type": "Person",
    name: profile.name,
    url: authorSiteUrl,
    email: profile.email,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};
