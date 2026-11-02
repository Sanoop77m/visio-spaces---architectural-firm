// MOCK CONTENT. Everything in this file is invented sample data for the first
// phase of the build: replace it with the firm's real details before launch.
// Set `footer.draftNotice` to null once the real content is in.

export const firm = {
  name: 'Visio Spaces',
  statement: 'We design buildings around the way light moves through a day.',
  scrollHint: 'Scroll to follow the sun from late afternoon into night',
};

export const studio = {
  heading: 'Every project starts with a sun study',
  paragraphs: [
    'Before we draw a wall, we spend a day on the site and record where the light falls, hour by hour. Rooms, openings and shade are placed from those notes.',
    'Visio Spaces was founded in Kochi in 2012. Twenty-two architects and interior designers work on homes, workplaces and public buildings, and the same team stays with each project from first sketch to handover.',
  ],
};

// `stop` links a project to its building and camera position in
// src/scene/timeline.js. `images` is empty until real photography is supplied.
export const projects = [
  {
    stop: 'house',
    side: 'left',
    name: 'Courtyard House',
    summary:
      'A family home wrapped around a shaded court. The upper bedrooms lean out over the garden to keep the living room cool through the afternoon.',
    facts: { Location: 'Kochi, India', Year: '2023', Type: 'Residential', Area: '420 m²' },
    images: [],
  },
  {
    stop: 'library',
    side: 'right',
    name: 'Tide Line Library',
    summary:
      'North-facing roof lights give the reading rooms even daylight all day, while deep concrete fins shield the public terrace from the western sun.',
    facts: { Location: 'Lisbon, Portugal', Year: '2021', Type: 'Public', Area: '3,800 m²' },
    images: [],
  },
  {
    stop: 'offices',
    side: 'left',
    name: 'Kiln Yard Offices',
    summary:
      'Nine floors, each shifted from the one below. The offset creates a balcony for every team and shades the glass beneath it.',
    facts: { Location: 'Bengaluru, India', Year: '2024', Type: 'Commercial', Area: '11,200 m²' },
    images: [],
  },
  {
    stop: 'pavilion',
    side: 'right',
    name: 'Memorial Pavilion',
    summary:
      'A single tall room with one narrow opening. Once a year, at the hour of the anniversary, sunlight reaches the far wall.',
    facts: { Location: 'Porto, Portugal', Year: '2019', Type: 'Cultural', Area: '260 m²' },
    images: [],
  },
];

export const services = {
  heading: 'What we do',
  items: [
    {
      name: 'Architecture',
      description: 'New buildings and extensions, from feasibility through to site supervision.',
    },
    {
      name: 'Interiors',
      description: 'Layouts, joinery, lighting and materials, designed along with the building.',
    },
    {
      name: 'Daylight studies',
      description: 'Sun, shade and glare modelling for your own architects and developers.',
    },
    {
      name: 'Master planning',
      description: 'Site strategy for campuses, housing and mixed-use neighbourhoods.',
    },
  ],
};

export const contact = {
  heading: 'Tell us about your site',
  intro: 'Send us a location and a rough brief. We reply within two working days.',
  email: 'hello@visiospaces.example',
  phone: '+00 000 000 0000',
  address: ['Visio Spaces', '14 Sample Road', 'Kochi 682 000, India'],
  // Add { label, url } entries once the firm's real profiles are known.
  social: [],
};

export const footer = {
  draftNotice: 'Draft site: projects, copy and contact details are sample content.',
};
