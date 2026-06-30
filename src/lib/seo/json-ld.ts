import { homeFaqs } from '@/lib/seo/faq'
import { absoluteUrl, siteConfig } from '@/lib/seo/site'

type JsonLdObject = Record<string, unknown>

function organizationNode(): JsonLdObject {
  return {
    '@type': 'Organization',
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon'),
      caption: `${siteConfig.name} logo`,
    },
    description: siteConfig.description,
    foundingDate: '2024',
    slogan: siteConfig.tagline,
    knowsAbout: siteConfig.knowsAbout,
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
    brand: {
      '@type': 'Brand',
      name: siteConfig.name,
    },
    parentOrganization: {
      '@type': 'Organization',
      name: siteConfig.publisher.parentOrganization,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: siteConfig.contact.contactType,
      email: siteConfig.contact.email,
      availableLanguage: ['English'],
    },
    sameAs: siteConfig.sameAs,
    founder: siteConfig.founders.map((founder) => ({
      '@type': 'Person',
      '@id': `${siteConfig.url}/#founder`,
      name: founder.name,
      jobTitle: founder.jobTitle,
      description: founder.description,
      knowsAbout: founder.knowsAbout,
      worksFor: { '@id': `${siteConfig.url}/#organization` },
    })),
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Experience',
        value: siteConfig.eeat.experience,
      },
      {
        '@type': 'PropertyValue',
        name: 'Expertise',
        value: siteConfig.eeat.expertise,
      },
      {
        '@type': 'PropertyValue',
        name: 'Authoritativeness',
        value: siteConfig.eeat.authoritativeness,
      },
      {
        '@type': 'PropertyValue',
        name: 'Trustworthiness',
        value: siteConfig.eeat.trustworthiness,
      },
    ],
  }
}

function websiteNode(): JsonLdObject {
  return {
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.shortDescription,
    inLanguage: siteConfig.language,
    publisher: { '@id': `${siteConfig.url}/#organization` },
  }
}

function softwareApplicationNode(): JsonLdObject {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${siteConfig.url}/#software`,
    name: siteConfig.name,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'SportsTeamManagementApplication',
    operatingSystem: 'Web Browser',
    url: siteConfig.url,
    description: siteConfig.description,
    featureList: siteConfig.featureList,
    offers: {
      '@type': 'Offer',
      price: siteConfig.offers.price,
      priceCurrency: siteConfig.offers.priceCurrency,
      description: siteConfig.offers.description,
      availability: 'https://schema.org/InStock',
    },
    creator: { '@id': `${siteConfig.url}/#organization` },
    publisher: { '@id': `${siteConfig.url}/#organization` },
    audience: {
      '@type': 'Audience',
      audienceType: 'Brazilian Jiu-Jitsu students, instructors, and gym owners',
    },
  }
}

function webPageNode(path = '/'): JsonLdObject {
  const url = absoluteUrl(path)

  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    about: [{ '@id': `${siteConfig.url}/#software` }, { '@id': `${siteConfig.url}/#organization` }],
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: absoluteUrl('/opengraph-image'),
    },
    inLanguage: siteConfig.language,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '[data-speakable="hero"]', '[data-speakable="summary"]'],
    },
  }
}

function faqPageNode(): JsonLdObject {
  return {
    '@type': 'FAQPage',
    '@id': `${siteConfig.url}/#faq`,
    mainEntity: homeFaqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

function itemListNode(): JsonLdObject {
  return {
    '@type': 'ItemList',
    '@id': `${siteConfig.url}/#features`,
    name: `${siteConfig.name} platform features`,
    itemListElement: siteConfig.featureList.map((feature, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: feature,
    })),
  }
}

export function getHomePageJsonLd(path = '/') {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      websiteNode(),
      softwareApplicationNode(),
      webPageNode(path),
      faqPageNode(),
      itemListNode(),
    ],
  }
}

export function getAuthPageJsonLd({
  path,
  title,
  description,
}: {
  path: string
  title: string
  description: string
}) {
  const url = absoluteUrl(path)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        isPartOf: { '@id': `${siteConfig.url}/#website` },
        about: { '@id': `${siteConfig.url}/#software` },
        inLanguage: siteConfig.language,
      },
      {
        '@type': 'RegisterAction',
        '@id': `${url}#action`,
        target: url,
        name: title,
        agent: { '@id': `${siteConfig.url}/#organization` },
      },
    ],
  }
}
