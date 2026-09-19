export interface HeroTab {
  id: string;
  label: string;
  preview: string;
  href: string;
}

export interface FeatureTab {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  color: string;
  bgClass: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export interface PricingAudience {
  id: string;
  label: string;
  plans: PricingPlan[];
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}
