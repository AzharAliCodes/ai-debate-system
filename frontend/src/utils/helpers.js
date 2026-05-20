export const techIconMappings = {
  'react.js': 'react',
  reactjs: 'react',
  react: 'react',
  'next.js': 'nextjs',
  nextjs: 'nextjs',
  next: 'nextjs',
  'vue.js': 'vuejs',
  vuejs: 'vuejs',
  vue: 'vuejs',
  'express.js': 'express',
  expressjs: 'express',
  express: 'express',
  'node.js': 'nodejs',
  nodejs: 'nodejs',
  node: 'nodejs',
  mongodb: 'mongodb',
  mongo: 'mongodb',
  python: 'python',
  django: 'django',
  flask: 'flask',
  fastapi: 'fastapi',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  html5: 'html5',
  html: 'html5',
  css3: 'css3',
  css: 'css3',
  tailwindcss: 'tailwindcss',
  tailwind: 'tailwindcss',
  mysql: 'mysql',
  postgresql: 'postgresql',
  postgres: 'postgresql',
  docker: 'docker',
  kubernetes: 'kubernetes',
  aws: 'amazonwebservices',
  git: 'git',
  github: 'github',
};

export const getTechIcon = (tech) => {
  const normalized = tech.toLowerCase().replace(/\.js$/, '').replace(/\s+/g, '');
  const mapped = techIconMappings[normalized] || normalized;
  return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${mapped}/${mapped}-original.svg`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
