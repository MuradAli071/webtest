import {
  ArrowUpRight,
  Bot,
  Film,
  Globe2,
  Megaphone,
  Palette,
  Smartphone,
} from "lucide-react";

const serviceIcons = {
  bot: Bot,
  film: Film,
  globe: Globe2,
  smartphone: Smartphone,
  palette: Palette,
  megaphone: Megaphone,
};

export function ServiceIcon({ name, size = 21 }) {
  const Icon = serviceIcons[name] ?? Globe2;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.7} />;
}

export function ServiceCard({ service, number, compact = false }) {
  return (
    <article className={`service-card${compact ? " service-card-compact" : ""}`}>
      <a
        aria-label={`Learn more about ${service.title}`}
        className="service-card-link"
        href={`/services/${service.slug}`}
      >
        <div className="service-card-top">
          {service.imageUrl ? (
            <img className="service-icon-image" src={service.imageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="service-icon">
              <ServiceIcon name={service.icon} />
            </span>
          )}
          {number && <span className="service-number">{number}</span>}
        </div>
        <h3>{service.title}</h3>
        <p>{service.description}</p>
        <span aria-hidden="true" className="service-arrow">
          <ArrowUpRight size={17} />
        </span>
      </a>
    </article>
  );
}
