// Single source of truth for Grove's public site info (metadata, JSON-LD, footer).
export const siteConfig = {
  businessName: "Grove",
  tagline: "A CRM with nothing in the way.",
  url: "https://thegrovecms.com",
  parent: "Evergreen Digital Co.",
  parentUrl: "https://evergreendigitalco.com",

  phone: "",
  email: "",
  address: { street: "", city: "", state: "WA", postalCode: "" },
  serviceArea: [] as string[],

  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    x: "",
    tiktok: "",
    googleBusinessProfile: "",
  },

  defaultTitle: "Grove | A CRM with nothing in the way",
  titleTemplate: "%s | Grove",
  defaultDescription:
    "Grove is a customer management system for small teams. Follow-ups that schedule themselves, a clean pipeline, and nothing in the way.",
  ogImage: "/og-image.png",
  locale: "en_US",

  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
};

export type SiteConfig = typeof siteConfig;
