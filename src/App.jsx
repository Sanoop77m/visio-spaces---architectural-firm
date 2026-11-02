import { useCallback, useRef } from 'react';
import { contact, firm, footer, projects, services, studio } from './data/content.js';
import SiteCanvas from './components/SiteCanvas.jsx';
import SunDial from './components/SunDial.jsx';
import logoMark from '../brand/logo/visio-spaces-mark-graphite.svg';

function Header() {
  return (
    <header className="site-header">
      <a className="site-logo" href="#top">
        <img src={logoMark} alt={`${firm.name} home`} />
      </a>
      <nav aria-label="Main">
        <a href="#projects">Projects</a>
        <a href="#services">Services</a>
        <a href="#studio">Studio</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}

function Project({ project }) {
  return (
    <section className={`chapter chapter--${project.side} project`} data-stop={project.stop}>
      <div className="chapter__text">
        <h3>{project.name}</h3>
        <p>{project.summary}</p>
        <dl>
          {Object.entries(project.facts).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function App() {
  const dial = useRef(null);
  const handleSun = useCallback((sun) => dial.current?.update(sun), []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteCanvas onSun={handleSun} />
      <Header />
      <SunDial ref={dial} />

      <main id="main">
        <section className="hero" id="top" data-stop="hero">
          <div className="hero__text">
            <h1 aria-label={firm.name}>
              {[...firm.name].map((letter, index) => (
                <span key={index} aria-hidden="true" style={{ '--letter': index }}>
                  {letter === ' ' ? ' ' : letter}
                </span>
              ))}
            </h1>
            <div className="hero__intro">
              <div>
                <p className="hero__descriptor">{firm.descriptor}</p>
                <p className="hero__statement">{firm.statement}</p>
              </div>
              <p className="hero__hint">{firm.scrollHint}</p>
            </div>
          </div>
        </section>

        <section className="chapter chapter--right" id="studio" data-stop="studio">
          <div className="chapter__text">
            <h2>{studio.heading}</h2>
            {studio.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <div id="projects">
          <h2 className="visually-hidden">Selected projects</h2>
          {projects.map((project) => (
            <Project key={project.stop} project={project} />
          ))}
        </div>

        <section className="chapter chapter--left" id="services" data-stop="services">
          <div className="chapter__text chapter__text--wide">
            <h2>{services.heading}</h2>
            <ul className="service-list">
              {services.items.map((service) => (
                <li key={service.name}>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="chapter chapter--right contact" id="contact" data-stop="contact">
          <div className="chapter__text chapter__text--wide">
            <h2>{contact.heading}</h2>
            <p>{contact.intro}</p>
            <a className="contact__email" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <div className="contact__details">
              <address>
                {contact.address.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </address>
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
              {contact.social.map((link) => (
                <a key={link.url} href={link.url}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} {firm.name}
        </span>
        {footer.draftNotice && <span>{footer.draftNotice}</span>}
      </footer>
    </>
  );
}
