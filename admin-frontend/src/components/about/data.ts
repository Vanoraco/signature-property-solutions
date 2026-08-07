export interface ValueItem {
  tag: string
  text: string
}

export interface ReasonItem {
  title: string
  text: string
}

export interface TagGroup {
  title: string
  items: string[]
}

export interface ServiceItem {
  id: string
  tag: string
  title: string
  tagline: string
  copy: string[]
  tagGroups: TagGroup[]
}

export interface ProcessStep {
  title: string
  text: string
}

export const aboutHero = {
  eyebrow: 'About Signature Property Solutions',
  title: 'Your Trusted Partner for Real Estate & Property Solutions',
  lead: 'A trusted real estate and property services company based in Addis Ababa, Ethiopia — combining professionalism, integrity, market expertise, and exceptional customer service.',
  placeholder: 'Add: hero image — Addis Ababa skyline or office team',
}

export const aboutParagraphs: string[] = [
  'At **Signature Property Solutions**, we believe that every property represents more than a physical space, it is an opportunity, an investment, a home, and the foundation for future success. As a trusted real estate and property services company based in Addis Ababa, Ethiopia, we are committed to delivering comprehensive property solutions that combine professionalism, integrity, market expertise, and exceptional customer service.',
  'We provide an integrated portfolio of real estate services, including luxury furnished apartments & penthouses, residential, office, and commercial property sales and rentals, property management, property marketing, investment advisory, and real estate consultancy. Our goal is to simplify every stage of the property journey by offering tailored solutions that meet the unique needs of individuals, businesses, investors, and international organizations.',
  'Whether you are relocating to Ethiopia, searching for executive accommodation, investing in property, leasing commercial space, selling or buying a home, or seeking professional property management, our experienced team delivers personalized guidance and reliable solutions designed to help you make confident decisions.',
  'Our luxury furnished apartment portfolio has become a preferred choice for corporate executives, diplomats, embassy personnel, expatriates, UN and NGO professionals, relocating families, and long-term business travelers who value comfort, security, convenience, and premium service.',
  "At Signature Property Solutions, we don't simply facilitate property transactions—we build long-term relationships founded on trust, transparency, and excellence. Every client receives the attention, professionalism, and commitment they deserve, ensuring an experience that exceeds expectations from the first conversation to long after the transaction is complete.",
]

export const visionMission = {
  vision:
    "To become Ethiopia's most trusted, innovative, and customer-focused real estate and property services company, recognized for delivering exceptional property experiences, creating long-term value, and setting the benchmark for excellence across residential, commercial, hospitality, and investment real estate.",
  mission:
    'To provide comprehensive real estate and property solutions through professional expertise, ethical business practices, innovative technology, and personalized customer service. We are committed to helping individuals, businesses, investors, and international organizations achieve their property goals while building lasting relationships based on trust, integrity, and excellence.',
}

export const coreValues: ValueItem[] = [
  { tag: 'Integrity', text: 'We conduct every transaction with honesty, transparency, and accountability, ensuring our clients can trust us at every stage of their property journey.' },
  { tag: 'Excellence', text: 'We strive for the highest standards in delivery service, continuously improving our processes to provide exceptional customer experience and premium property solutions.' },
  { tag: 'Customer Commitment', text: 'Our clients are at the heart of everything we do. We listen carefully, understand their objectives, and deliver solutions tailored to their unique needs.' },
  { tag: 'Professionalism', text: 'Our team operates with expertise, respect, reliability, and attention to detail, ensuring every interaction reflects the quality of our brand.' },
  { tag: 'Innovation', text: 'We embrace modern technology, digital marketing, and data-driven insights to provide smarter, more efficient, and more effective property solutions.' },
  { tag: 'Trust', text: 'We believe strong relationships are built through consistency, transparency, and delivering on our promises.' },
  { tag: 'Collaboration', text: 'We work closely with property owners, investors, developers, businesses, and tenants to create mutually beneficial partnerships that generate long-term success.' },
  { tag: 'Sustainability', text: 'We support responsible property practices that create lasting value for our clients, communities, and the real estate industry.' },
]

export const aboutWhyChooseUs: ReasonItem[] = [
  { title: 'Comprehensive Property Solutions Under One Roof', text: 'From luxury furnished apartments and residential sales to commercial leasing, property management, investment advisory, and consultancy, we provide integrated services that simplify every aspect of your property journey.' },
  { title: 'Local Expertise with Global Standards', text: 'Our deep understanding of the Ethiopian real estate market, combined with internationally inspired service standards, enables us to deliver professional solutions that meet the expectations of both local and international clients.' },
  { title: 'Premium Property Portfolio', text: 'We carefully select and manage quality residential, commercial, and executive properties in strategic locations, ensuring our clients have access to well-maintained, secure, and high-value real estate.' },
  { title: 'Trusted by Professionals and Organizations', text: 'Our services are designed to meet the needs of corporate executives, multinational companies, embassies, diplomats, UN agencies, NGOs, expatriates, investors, and relocating families seeking dependable property solutions.' },
  { title: 'Personalized Service', text: 'Every client has unique goals. We take the time to understand your requirements and provide customized recommendations, transparent advice, and ongoing support throughout the entire process.' },
  { title: 'Professional Property Management', text: 'We help property owners maximize returns while protecting their investments through proactive management, tenant relations, maintenance coordination, occupancy optimization, and financial oversight.' },
  { title: 'Strategic Property Marketing', text: 'Using professional photography, compelling content, digital advertising, search engine optimization, and targeted marketing campaigns, we position every property for maximum visibility and faster results.' },
  { title: 'Commitment to Excellence', text: 'We measure our success by the satisfaction of our clients. Every service we provide reflects our dedication to quality, professionalism, reliability, and continuous improvement.' },
]

export const aboutClosing = {
  promise: 'Your property goals become our priority.',
  paragraphs: [
    '**Our Commitment** — At Signature Property Solutions, our commitment extends beyond property transactions. We are dedicated to creating meaningful relationships, delivering exceptional experiences, and helping our clients achieve their real estate ambitions with confidence.',
    'Whether you are searching for your next home, expanding your business, investing in property, relocating to Addis Ababa, or entrusting us with the management of your valuable assets, we are here to provide expert guidance and dependable service every step of the way.',
    'With professionalism, market expertise, and a passion for excellence, we are committed to delivering trusted property solutions that create lasting value and peace of mind.',
  ],
}

export const servicesHero = {
  eyebrow: 'Our Services',
  title: 'Comprehensive Real Estate & Property Solutions',
  lead: 'End-to-end real estate and property services designed to meet the diverse needs of homeowners, businesses, investors, expatriates, and international organizations.',
  placeholder: 'Add: hero image — apartment interior or building exterior',
}

export const servicesParagraphs: string[] = [
  'At Signature Property Solutions, we provide end-to-end real estate and property services designed to meet the diverse needs of homeowners, businesses, investors, expatriates, and international organizations.',
  "Whether you're looking to buy, sell, rent, lease, invest, or professionally manage a property, our experienced team delivers tailored solutions with integrity, market expertise, and exceptional customer service.",
  'Our mission is simple: to make every property journey smooth, transparent, and rewarding.',
]

export const services: ServiceItem[] = [
  {
    id: 'luxury-furnished-apartments',
    tag: 'Serviced Living',
    title: 'Luxury Furnished Apartments',
    tagline: 'Executive Living Designed for Comfort',
    copy: [
      'Experience premium long-term accommodation in Addis Ababa through our carefully selected portfolio of luxury furnished apartments.',
      'Designed for executives, diplomats, expatriates, consultants, and relocating families, our fully serviced apartments offer the perfect combination of comfort, privacy, security, and convenience.',
      'Our apartments include one-, two-, and three-bedroom options with modern interiors, fully equipped kitchens, high-speed internet, housekeeping, and premium building amenities.',
    ],
    tagGroups: [
      {
        title: 'Ideal For',
        items: ['Corporate Executives', 'Diplomats', 'Embassy Staff', 'UN & NGO Professionals', 'Expatriates', 'Long-Term Business Travelers', 'Relocating Families', 'Diaspora Guests'],
      },
      {
        title: 'Features',
        items: ['Fully Furnished Apartments', 'Minimum Stay of 30 Nights', 'High-Speed Wi-Fi', 'Modern Kitchens', 'Housekeeping Services', 'Secure Free-Parking', 'Gym Access', '24/7 Reception', 'CCTV & Security', 'Backup Generator', 'Prime Addis Ababa Locations (Specific supermarkets, international schools, Hospitals,'],
      },
    ],
  },
  {
    id: 'residential-sales-rentals',
    tag: 'Residential',
    title: 'Find Your Executive Home — Residential Property Sales & Rentals',
    tagline: 'Helping You Find the Perfect Home',
    copy: [
      "Whether you're purchasing your first home, relocating, investing, or searching for a rental property, we connect you with quality residential properties that match your lifestyle and budget.",
      'Our experienced advisors guide you through every step of the buying, selling, or leasing process to ensure a smooth and informed experience.',
    ],
    tagGroups: [
      {
        title: 'Services Include',
        items: ['Property Buying', 'Property Selling', 'Long-Term Rentals', 'Lease Management', 'Property Marketing', 'Property Management'],
      },
    ],
  },
  {
    id: 'commercial',
    tag: 'Commercial',
    title: 'Commercial Property Solutions',
    tagline: 'Business Spaces That Drive Success',
    copy: [
      'Finding the right commercial property is critical to business growth.',
      'We help businesses secure strategic commercial spaces that support operational efficiency and long-term success.',
    ],
    tagGroups: [
      {
        title: 'Property Types',
        items: ['Office Buildings', 'Office Spaces', 'Retail Shops', 'Commercial Buildings', 'Warehouses', 'Industrial Properties', 'Mixed-Use Developments', 'Land for Commercial Development'],
      },
    ],
  },
  {
    id: 'property-management',
    tag: 'Management',
    title: 'Property Management',
    tagline: 'Protecting and Maximizing Your Investment',
    copy: [
      'Owning property should be rewarding—not stressful.',
      'Our professional property management services ensure your investment remains profitable, well-maintained, and professionally managed.',
      'We handle day-to-day operations while keeping owners informed through transparent reporting and proactive communication.',
    ],
    tagGroups: [
      {
        title: 'Our Services',
        items: ['Tenant Screening', 'Lease Administration', 'Rent Collection', 'Property Maintenance', 'Vendor Coordination', 'Property Inspections', 'Financial Reporting', 'Occupancy Optimization'],
      },
    ],
  },
  {
    id: 'property-marketing',
    tag: 'Marketing',
    title: 'Property Marketing',
    tagline: 'Selling and Leasing Properties Faster',
    copy: [
      "We combine professional marketing strategies with modern technology to maximize your property's visibility and attract qualified buyers and tenants.",
      'Our marketing approach includes premium photography, compelling content, digital advertising, and listing optimization across leading property platforms.',
    ],
    tagGroups: [
      {
        title: 'Marketing Services',
        items: ['Professional Photography', 'Virtual Tours', 'Property Branding', 'Digital Marketing', 'Social Media Promotion', 'Listing Optimization', 'Google Business Optimization', 'SEO', 'Lead Generation'],
      },
    ],
  },
  {
    id: 'investment-advisory',
    tag: 'Investment',
    title: 'Property Investment Advisory',
    tagline: 'Make Smarter Investment Decisions',
    copy: [
      'Real estate is one of the most valuable investments when guided by reliable market intelligence.',
      'We help investors identify high-potential opportunities, evaluate returns, and build sustainable property portfolios.',
    ],
    tagGroups: [
      {
        title: 'Investment Services',
        items: ['Investment Advisory', 'Property Portfolio Planning', 'Market Research', 'ROI Analysis', 'Risk Assessment', 'Property Acquisition Support'],
      },
    ],
  },
  {
    id: 'consultancy',
    tag: 'Consultancy',
    title: 'Real Estate Consultancy',
    tagline: 'Expert Advice Backed by Market Knowledge',
    copy: [
      'Our consultancy services support individuals, developers, businesses, and investors with strategic real estate insights and professional guidance.',
      "Whether you're evaluating a new project or seeking independent advice, our team provides practical, data-driven recommendations.",
    ],
    tagGroups: [
      {
        title: 'Consultancy Areas',
        items: ['Market Analysis', 'Property Feasibility Studies', 'Development Advisory', 'Asset Optimization', 'Investment Planning', 'Property Strategy'],
      },
    ],
  },
  {
    id: 'corporate-housing-relocation',
    tag: 'Relocation',
    title: 'Corporate Housing & Relocation Services',
    tagline: 'Making Every Relocation Effortless',
    copy: [
      'We provide premium accommodation solutions tailored for organizations relocating employees, consultants, diplomats, and executives to Addis Ababa.',
      'Our relocation services ensure clients experience a smooth transition from arrival to move-in.',
    ],
    tagGroups: [
      {
        title: 'Corporate Solutions',
        items: ['Executive Apartments', 'Staff Accommodation', 'Embassy Housing', 'NGO Housing', 'Project-Based Accommodation', 'Long-Term Leasing', 'Relocation Assistance'],
      },
    ],
  },
]

export const servicesWhyChooseUs: ReasonItem[] = [
  { title: 'Professional Expertise', text: "A dedicated team with in-depth knowledge of Ethiopia's real estate market." },
  { title: 'Premium Property Portfolio', text: 'Carefully selected residential, commercial, and luxury furnished properties.' },
  { title: 'Personalized Service', text: 'Every client receives tailored advice and customized property solutions.' },
  { title: 'Trusted Relationships', text: 'Built on integrity, transparency, and long-term partnerships.' },
  { title: 'End-to-End Solutions', text: 'From acquisition and leasing to management and investment, we handle every stage of the property journey.' },
  { title: 'Customer-First Approach', text: 'Your goals are our priority, and we are committed to delivering exceptional service at every interaction.' },
]

export const processSteps: ProcessStep[] = [
  { title: 'Consultation', text: 'We take time to understand your property needs and objectives.' },
  { title: 'Property Search or Assessment', text: 'Our experts identify the most suitable opportunities or evaluate your existing property.' },
  { title: 'Recommendation', text: 'We provide clear, professional advice tailored to your goals.' },
  { title: 'Transaction Support', text: 'We guide you through negotiations, documentation, and closing.' },
  { title: 'After Sales Service', text: 'Our relationship continues through property management, support, and future opportunities.' },
]

export const footerLine = 'Signature Property Solutions — Addis Ababa, Ethiopia'
