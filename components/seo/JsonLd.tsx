export function SoftwareApplicationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Qualee',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Plateforme de fidélisation et gamification pour les professionnels de la beauté. Roue de la fortune, carte fidélité digitale, campagnes WhatsApp.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Essai gratuit 14 jours',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '120',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
