const TYPES = ['All', 'Digital products', 'Web experiences', 'AI & automation', 'Creative experiments'];
const FEATURED = ['21', '22', '24', '23'];
const ICONS = {
  '01': 'tools', '02': 'globe', '03': 'paint', '04': 'tools', '05': 'code',
  '06': 'code', '07': 'book', '08': 'globe', '09': 'computer', '10': 'code',
  '11': 'computer', '12': 'tools', '13': 'paint', '14': 'globe', '16': 'globe',
  '17': 'settings', '18': 'computer', '19': 'globe', '20': 'computer',
  '21': 'engine', '22': 'sentient', '23': 'spacecraft', '24': 'book',
  '25': 'computer', '26': 'paint', '27': 'e-logo', '28': 'tools', 'meme-deck': 'audio',
};
const ART = {
  '21': { src: 'assets/engine-art.svg', className: 'ce-art-engine', alt: 'Sculptural artwork from an Engine design template' },
  '22': { src: 'assets/sentient-cover.jpg', className: 'ce-art-sentient', alt: 'Sentient agency website cover' },
  '24': { src: 'assets/story-art.png', className: 'ce-art-story', alt: 'Watercolor storybook characters from Cuentacuentos' },
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name, className = '') {
  const node = el('img', `ce-icon ${className}`.trim());
  node.src = `assets/icons/${name}.svg`;
  node.alt = '';
  node.draggable = false;
  return node;
}

export function iconFor(project) {
  const fallback = project.category === 'Web experiences' ? 'globe' : project.category === 'Creative experiments' ? 'paint' : 'tools';
  return `assets/icons/${ICONS[String(project.id)] || fallback}.svg`;
}

function projectIcon(project, className = '') {
  const node = el('img', `ce-icon ${className}`.trim());
  node.src = iconFor(project);
  node.alt = '';
  node.draggable = false;
  return node;
}

function preview(project, detail = false) {
  const art = ART[String(project.id)];
  const node = el('div', `ce-preview ce-preview-${project.id}${detail ? ' ce-preview-detail' : ''}`);
  if (art) {
    const image = el('img', art.className);
    image.src = art.src;
    image.alt = art.alt;
    image.draggable = false;
    node.append(image);
  } else {
    node.classList.add('ce-preview-icon');
    node.append(projectIcon(project));
  }
  return node;
}

export function createExplorer({ projects = [], onOpen = () => {}, initialFilter = 'All' } = {}) {
  const state = { type: TYPES.includes(initialFilter) ? initialFilter : 'All', query: '', view: 'icons' };
  const root = el('section', 'ce-explorer');
  root.setAttribute('aria-label', 'My Creations project explorer');

  const menu = el('div', 'ce-explorer-menu');
  menu.setAttribute('aria-hidden', 'true');
  ['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'].forEach(label => menu.append(el('span', '', label)));

  const toolbar = el('div', 'ce-toolbar');
  const back = el('button', 'ce-back');
  back.type = 'button';
  back.title = 'Show all creations and clear search';
  back.append(el('span', 'ce-back-arrow', '←'), el('span', '', 'Back'));
  const separator = el('span', 'ce-toolbar-separator');
  separator.setAttribute('aria-hidden', 'true');
  const searchLabel = el('label', 'ce-search');
  searchLabel.append(icon('search'));
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Search creations';
  search.setAttribute('aria-label', 'Search creations');
  search.autocomplete = 'off';
  searchLabel.append(search);
  const viewGroup = el('div', 'ce-view-controls');
  viewGroup.setAttribute('aria-label', 'View');
  const iconsButton = el('button', 'ce-view-button', '▦');
  iconsButton.type = 'button';
  iconsButton.title = 'Icons view';
  iconsButton.setAttribute('aria-label', 'Icons view');
  const listButton = el('button', 'ce-view-button', '☷');
  listButton.type = 'button';
  listButton.title = 'List view';
  listButton.setAttribute('aria-label', 'List view');
  viewGroup.append(iconsButton, listButton);
  toolbar.append(back, separator, searchLabel, viewGroup);

  const address = el('div', 'ce-address');
  address.append(el('span', 'ce-address-label', 'Folder'));
  const location = el('div', 'ce-address-location');
  location.append(icon('folder'), el('span', '', 'Creations E : My Creations'));
  address.append(location);

  const body = el('div', 'ce-explorer-body');
  const sidebar = el('aside', 'ce-sidebar');
  const taskPanel = el('section', 'ce-task-panel');
  taskPanel.append(el('h2', 'ce-task-title', 'Explore by type'));
  const filters = el('div', 'ce-filters');
  const filterButtons = new Map();
  const typeIcons = ['folder', 'computer', 'globe', 'settings', 'paint'];
  TYPES.forEach((type, index) => {
    const button = el('button', 'ce-filter');
    button.type = 'button';
    button.append(icon(typeIcons[index]), el('span', '', type === 'All' ? 'All creations' : type));
    button.addEventListener('click', () => { state.type = type; render(); });
    filterButtons.set(type, button);
    filters.append(button);
  });
  taskPanel.append(filters);
  const detailPanel = el('section', 'ce-task-panel ce-details-panel');
  detailPanel.append(el('h2', 'ce-task-title', 'Details'));
  const details = el('div', 'ce-folder-details');
  details.append(icon('folder'), el('strong', '', 'My Creations'));
  const countDetail = el('p');
  const categoryDetail = el('p', 'ce-type-detail');
  details.append(countDetail, categoryDetail);
  detailPanel.append(details);
  sidebar.append(taskPanel, detailPanel);

  const content = el('div', 'ce-explorer-content');
  const intro = el('header', 'ce-intro');
  const identity = el('div', 'ce-identity');
  identity.append(icon('e-logo'), el('span', '', 'Creations E'));
  intro.append(identity, el('h1', '', 'A world of things I make.'), el('p', '', 'Design, digital products, and creative experiments.'));
  const compactLabel = el('label', 'ce-compact-filter');
  compactLabel.append(el('span', '', 'Show'));
  const compactSelect = el('select');
  compactSelect.setAttribute('aria-label', 'Explore by type');
  TYPES.forEach(type => {
    const option = el('option', '', type === 'All' ? 'All creations' : type);
    option.value = type;
    compactSelect.append(option);
  });
  compactSelect.addEventListener('change', () => { state.type = compactSelect.value; render(); });
  compactLabel.append(compactSelect);
  const results = el('div', 'ce-results');
  content.append(intro, compactLabel, results);
  body.append(sidebar, content);

  const status = el('div', 'ce-explorer-status');
  const statusCount = el('span');
  statusCount.setAttribute('aria-live', 'polite');
  status.append(statusCount, el('span', 'ce-status-owner', 'Creations E'));
  root.append(menu, toolbar, address, body, status);

  function projectButton(project, featured = false) {
    const button = el('button', featured ? 'ce-featured-card' : 'ce-project-item');
    button.type = 'button';
    button.title = project.description;
    button.setAttribute('aria-label', `Open ${project.name}`);
    if (featured) button.append(preview(project));
    else button.append(projectIcon(project));
    const label = el('span', 'ce-project-label');
    label.append(el('span', 'ce-project-name', project.name), el('span', 'ce-project-type', project.category));
    button.append(label);
    button.addEventListener('click', () => onOpen(project));
    return button;
  }

  function section(title, className) {
    const node = el('section', className);
    node.append(el('h2', 'ce-section-title', title));
    return node;
  }

  function render() {
    const query = state.query.trim().toLocaleLowerCase();
    const found = projects.filter(project => {
      const text = [project.name, project.description, project.category, ...(project.tags || [])].join(' ').toLocaleLowerCase();
      return (state.type === 'All' || state.type === project.category) && (!query || text.includes(query));
    });
    const defaultView = state.type === 'All' && !query && state.view === 'icons';
    root.dataset.view = state.view;
    compactSelect.value = state.type;
    filterButtons.forEach((button, type) => button.setAttribute('aria-pressed', String(type === state.type)));
    iconsButton.setAttribute('aria-pressed', String(state.view === 'icons'));
    listButton.setAttribute('aria-pressed', String(state.view === 'list'));
    countDetail.textContent = `${found.length} ${found.length === 1 ? 'creation' : 'creations'}`;
    categoryDetail.textContent = state.type === 'All' ? 'Design & creative development' : state.type;
    statusCount.textContent = `${found.length} ${found.length === 1 ? 'object' : 'objects'}${query ? ' found' : ''}`;
    results.replaceChildren();
    const featured = defaultView ? FEATURED.map(id => found.find(project => String(project.id) === id)).filter(Boolean) : [];
    if (featured.length) {
      const featuredSection = section('Featured creations', 'ce-featured-section');
      const grid = el('div', 'ce-featured-grid');
      featured.forEach(project => grid.append(projectButton(project, true)));
      featuredSection.append(grid);
      results.append(featuredSection);
    }
    const others = found.filter(project => !featured.some(item => item.id === project.id));
    const title = query ? `Search results${state.type !== 'All' ? ` · ${state.type}` : ''}` : state.type === 'All' ? (featured.length ? 'More creations' : 'All creations') : state.type;
    const otherSection = section(title, 'ce-all-section');
    const grid = el('div', `ce-project-grid ce-project-grid-${state.view}`);
    others.forEach(project => grid.append(projectButton(project)));
    if (!found.length) {
      const empty = el('div', 'ce-empty');
      empty.append(icon('search'), el('strong', '', 'No creations found'), el('p', '', 'Try another search or choose a different type.'));
      grid.append(empty);
    }
    otherSection.append(grid);
    results.append(otherSection);
  }

  back.addEventListener('click', () => {
    state.type = 'All';
    state.query = '';
    search.value = '';
    content.scrollTop = 0;
    render();
  });
  search.addEventListener('input', () => { state.query = search.value; render(); });
  iconsButton.addEventListener('click', () => { state.view = 'icons'; render(); });
  listButton.addEventListener('click', () => { state.view = 'list'; render(); });
  render();
  return root;
}

export function createProjectView(project) {
  const root = el('article', 'ce-project-view');
  const address = el('div', 'ce-project-address');
  address.append(icon(project.url ? 'globe' : 'folder'), el('span', '', `Creations E / ${project.name}`));
  const content = el('div', 'ce-project-content');
  const heading = el('header', 'ce-project-heading');
  heading.append(projectIcon(project));
  const titles = el('div');
  titles.append(el('p', 'ce-project-category', project.category), el('h1', '', project.name));
  heading.append(titles);
  content.append(heading, preview(project, true));
  const description = el('p', 'ce-project-description', project.description);
  const tags = el('div', 'ce-project-tags');
  (project.tags || []).forEach(tag => tags.append(el('span', '', tag)));
  content.append(description, tags);
  if (project.highlights?.length) {
    const highlights = el('section', 'ce-project-highlights');
    highlights.append(el('h2', '', 'Inside this creation'));
    const list = el('ul');
    project.highlights.forEach(highlight => list.append(el('li', '', highlight)));
    highlights.append(list);
    content.append(highlights);
  }
  const footer = el('footer', 'ce-project-footer');
  footer.append(el('span', '', 'A creation by E'));
  if (project.url) {
    const link = el('a', 'ce-live-link', 'Visit website ↗');
    link.href = project.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    footer.append(link);
  }
  content.append(footer);
  root.append(address, content);
  return root;
}
