// ─── Mock Job Generator ───────────────────────────────────────────────────────
// Generates realistic onlinejobs.ph-style listings for demo / Vercel deployment.
// Jobs are seeded from the user's search keyword so results feel relevant.

import type { RawJob } from '@/types';

const COMPANY_NAMES = [
  'TechFlow Solutions', 'DigitalEdge PH', 'CloudBase Inc', 'Nexus Remote',
  'PinoyDev Studio', 'AsiaVirtual Co', 'RemoteHQ', 'BrightWork PH',
  'SmartHire Global', 'Offshore Elite', 'CodeBridge PH', 'VirtualTeam Asia',
  'EcomGrowth Ltd', 'CreativeLoop', 'DataPilot Inc',
];

const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Full Time', 'Full Time', 'Any'];

const SALARY_OPTIONS = [
  '$10-15/hr', '$15-20/hr', '$20-30/hr', '$800-1,200/mo', '$1,500-2,000/mo',
  '$25/hr', '$12/hr', 'Negotiable', '$10/hr', '$1,000-1,500/mo',
  '$30-40/hr', '$18/hr', 'Open to Offers', '$2,000-2,500/mo', '$15/hr',
];

// Job templates indexed by common keyword families
const JOB_TEMPLATES: Record<string, Array<{ title: string; description: string; requirements: string }>> = {
  default: [
    {
      title: 'Remote Virtual Assistant',
      description: 'We are looking for a reliable Virtual Assistant to support our growing team. You will handle scheduling, email management, data entry, and general administrative tasks. Must be detail-oriented and proactive.',
      requirements: 'Strong written English, time management, experience with Google Workspace and Trello. Please attach your resume when applying.',
    },
    {
      title: 'Customer Support Specialist',
      description: 'Join our international support team! Handle customer inquiries via email and chat. We use Zendesk and Intercom. Remote-friendly company culture with flexible hours.',
      requirements: 'Excellent communication skills, Zendesk experience preferred. Must be able to work PST hours. Submit CV to be considered.',
    },
    {
      title: 'Social Media Manager',
      description: 'Manage our brand presence across Instagram, Facebook, LinkedIn, and TikTok. Create engaging content, schedule posts, and analyze performance metrics weekly.',
      requirements: 'Canva, Buffer/Hootsuite experience. Portfolio required. Experience with Facebook Ads Manager a plus.',
    },
  ],
  ai: [
    {
      title: 'AI Automation Specialist',
      description: 'Build and maintain AI-powered automation workflows using n8n, Make.com, and OpenAI APIs. Integrate chatbots, automate repetitive business processes, and document all workflows. Work with a cutting-edge remote-first team.',
      requirements: 'Experience with n8n or Zapier, familiarity with OpenAI/ChatGPT API, basic Python or JavaScript. No video intro required — just a quick intro message.',
    },
    {
      title: 'AI Prompt Engineer & Content Strategist',
      description: 'Create and optimize AI prompts for marketing copy, product descriptions, and blog content. Work with GPT-4, Claude, and Gemini to produce high-quality outputs at scale. Train team members on prompt engineering best practices.',
      requirements: 'Proven experience with LLMs, strong writing skills, understanding of SEO. GitHub portfolio preferred but not required.',
    },
    {
      title: 'Machine Learning Ops Engineer',
      description: 'Deploy and monitor ML models in production. Manage data pipelines, fine-tune models, and maintain our AI infrastructure. Remote position with global team across US, EU, and PH timezones.',
      requirements: 'Python, PyTorch or TensorFlow, Docker, basic cloud (AWS/GCP). Please include your GitHub profile or relevant projects in your message.',
    },
    {
      title: 'AI Chatbot Developer',
      description: 'Develop intelligent chatbot solutions for e-commerce and customer service clients. Use platforms like Botpress, Voiceflow, and direct OpenAI API integration. Build and test multi-turn conversation flows.',
      requirements: 'Node.js or Python, REST API experience, knowledge of NLP basics. Must be comfortable with async communication. No video application — text only.',
    },
    {
      title: 'Data Analyst with AI Tools',
      description: 'Analyze business data using Python and AI-assisted tools. Create dashboards in Looker Studio and Tableau. Identify trends, prepare reports, and present findings to US-based stakeholders weekly.',
      requirements: 'Python (pandas, numpy), SQL, data visualization experience. Resume/CV required. Detail-oriented and highly analytical.',
    },
  ],
  web: [
    {
      title: 'Full Stack Web Developer (React + Node)',
      description: 'Build scalable web applications for our SaaS product. Work on the full stack using React, TypeScript, Node.js, and PostgreSQL. Agile environment with daily standups and biweekly sprints.',
      requirements: 'React, Node.js, PostgreSQL, Git. 2+ years experience. Please include GitHub link in your application.',
    },
    {
      title: 'WordPress Developer & Designer',
      description: 'Build and maintain WordPress sites for our agency clients. Custom theme development, WooCommerce setup, speed optimization, and SEO configuration. 10-15 hours/week, flexible schedule.',
      requirements: 'WordPress, PHP, CSS, Elementor or Gutenberg. Portfolio of past projects required.',
    },
    {
      title: 'Frontend Developer (Next.js)',
      description: 'Join our product team to build beautiful, performant frontends using Next.js and Tailwind CSS. Work closely with UI/UX designers to implement pixel-perfect interfaces.',
      requirements: 'Next.js, Tailwind CSS, TypeScript, REST APIs. Loom video intro appreciated but not mandatory.',
    },
  ],
  python: [
    {
      title: 'Python Backend Developer',
      description: 'Develop and maintain RESTful APIs using FastAPI and Django. Work with PostgreSQL databases, implement authentication systems, and write clean unit tests. 100% remote, flexible hours.',
      requirements: 'Python, FastAPI or Django, SQL, Docker. Include GitHub profile or code samples in application.',
    },
    {
      title: 'Python Automation Developer',
      description: 'Write Python scripts to automate data collection, processing, and reporting workflows. Work with Selenium, Playwright, and BeautifulSoup for web data extraction tasks.',
      requirements: 'Python, web scraping experience, pandas, basic understanding of APIs. No special file uploads needed.',
    },
  ],
  seo: [
    {
      title: 'SEO Specialist & Content Writer',
      description: 'Develop and execute SEO strategies for our e-commerce clients. Keyword research, on-page optimization, link building campaigns, and monthly reporting using SEMrush and Ahrefs.',
      requirements: 'SEMrush or Ahrefs experience, strong English writing, understanding of Google Analytics. CV and 2 writing samples required.',
    },
  ],
  design: [
    {
      title: 'UI/UX Designer (Figma)',
      description: 'Design intuitive user interfaces for our SaaS dashboard. Create wireframes, prototypes, and design systems. Collaborate with development team using Figma. Remote-friendly.',
      requirements: 'Figma, prototyping, design systems experience. Portfolio required. No video required — portfolio is sufficient.',
    },
    {
      title: 'Graphic Designer (Social Media)',
      description: 'Create eye-catching graphics for social media, email campaigns, and digital ads. Must be fast and creative with a strong sense of visual hierarchy and brand consistency.',
      requirements: 'Canva Pro, Adobe Illustrator or Photoshop. Portfolio of past social media work required.',
    },
  ],
};

// Jobs that will be intentionally REMOVED (for demonstrating the filter logic)
const FILTERED_JOB_TEMPLATES = [
  {
    title: 'Virtual Assistant with Video Intro',
    description: 'Looking for a VA who can submit a short Loom video introduction as part of the application process. Must record a 2-minute video intro explaining your background.',
    requirements: 'Submit Loom video recording along with your application. Voice recording required.',
  },
  {
    title: 'Content Creator (Video Application Required)',
    description: 'We require a short video portfolio submission from all applicants. Upload your showreel to our portal. Audio recording explaining your process is required.',
    requirements: 'Portfolio upload required. Video demo reel. Voice intro recording.',
  },
];

function getTemplatesForKeyword(keyword: string): typeof JOB_TEMPLATES['default'] {
  const kw = keyword.toLowerCase();
  if (kw.includes('ai') || kw.includes('automation') || kw.includes('n8n') || kw.includes('claude') || kw.includes('gpt')) return JOB_TEMPLATES.ai;
  if (kw.includes('web') || kw.includes('react') || kw.includes('next') || kw.includes('developer') || kw.includes('frontend')) return JOB_TEMPLATES.web;
  if (kw.includes('python') || kw.includes('django') || kw.includes('fastapi')) return JOB_TEMPLATES.python;
  if (kw.includes('seo') || kw.includes('content')) return JOB_TEMPLATES.seo;
  if (kw.includes('design') || kw.includes('figma') || kw.includes('ui') || kw.includes('ux')) return JOB_TEMPLATES.design;
  return JOB_TEMPLATES.default;
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function generateMockJobs(keyword: string, count: number): RawJob[] {
  const templates = getTemplatesForKeyword(keyword);
  // Mix in some jobs from other categories for variety
  const allTemplates = [...templates, ...JOB_TEMPLATES.default].slice(0, count + 4);

  const jobs: RawJob[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const template = allTemplates[i % allTemplates.length];
    const company = COMPANY_NAMES[i % COMPANY_NAMES.length];
    const salary = SALARY_OPTIONS[i % SALARY_OPTIONS.length];
    const empType = EMPLOYMENT_TYPES[i % EMPLOYMENT_TYPES.length];
    const daysAgo = Math.floor(Math.random() * 14);
    const posted = new Date(now.getTime() - daysAgo * 86400000);
    const slug = slugify(template.title);

    jobs.push({
      id: `mock-${i}-${Date.now()}`,
      companyName: company,
      employmentType: empType,
      title: template.title,
      url: `https://www.onlinejobs.ph/jobseekers/job/${slug}-${1000 + i}`,
      salary,
      description: template.description,
      datePosted: posted.toISOString().slice(0, 19).replace('T', ' '),
      query: keyword,
    });
  }

  // Inject 1-2 "to be removed" jobs so the filter logic is visible in demo mode
  const filteredCount = Math.min(2, Math.floor(count * 0.3));
  for (let j = 0; j < filteredCount; j++) {
    const template = FILTERED_JOB_TEMPLATES[j % FILTERED_JOB_TEMPLATES.length];
    const posted = new Date(now.getTime() - 3 * 86400000);
    jobs.splice(Math.floor(jobs.length / 2), 0, {
      id: `mock-filtered-${j}-${Date.now()}`,
      companyName: COMPANY_NAMES[(j + 5) % COMPANY_NAMES.length],
      employmentType: 'Full Time',
      title: template.title,
      url: `https://www.onlinejobs.ph/jobseekers/job/filtered-demo-${j}`,
      salary: SALARY_OPTIONS[j % SALARY_OPTIONS.length],
      description: `${template.description} ${template.requirements}`,
      datePosted: posted.toISOString().slice(0, 19).replace('T', ' '),
      query: keyword,
    });
  }

  return jobs;
}
