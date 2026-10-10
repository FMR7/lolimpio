const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { PurgeCSS } = require('purgecss');

const publicDir = path.join(__dirname, 'public');
const outputDir = path.join(__dirname, 'dist');
const htmlPath = path.join(publicDir, 'index.html');
const cssPath = path.join(publicDir, 'css', 'styles.css');
const bootstrapCssPath = require.resolve('bootstrap/dist/css/bootstrap.min.css');
const iconGlyphs = {
  facebook: 'f39e',
  whatsapp: 'f232',
  moon: 'f186',
  sun: 'f185',
  envelope: 'f0e0',
  building: 'f1ad',
  'user-group': 'f0c0',
  house: 'f015',
  'house-user': 'e1b0',
  'house-fire': 'e50c',
  calculator: 'f1ec',
  'helmet-safety': 'f807'
};
const brandIcons = new Set(['facebook', 'whatsapp']);

function createIconCss(html) {
  const usedIconNames = new Set(
    [...html.matchAll(/\bfa-([a-z0-9-]+)\b/g)]
      .map((match) => match[1])
      .filter((name) => Object.hasOwn(iconGlyphs, name))
  );
  const rules = [
    '.fa-brands,.fa-solid{display:inline-block;font-style:normal;line-height:1}',
    '.fa-brands{font-family:"Font Awesome 6 Brands",sans-serif;font-weight:400}',
    '.fa-solid{font-family:"Font Awesome 6 Free",sans-serif;font-weight:900}'
  ];

  if (/\bfa-xl\b/.test(html)) {
    rules.push('.fa-xl{font-size:1.5em;line-height:.04167em;vertical-align:-.125em}');
  }

  if (/\bfa-2xl\b/.test(html)) {
    rules.push('.fa-2xl{font-size:2em;line-height:.03125em;vertical-align:-.1875em}');
  }

  for (const name of usedIconNames) {
    rules.push(`.fa-${name}::before{content:"\\${iconGlyphs[name]}"}`);
  }

  return { css: rules.join('\n'), usedIconNames };
}

async function build() {
  const sourceHtml = fs.readFileSync(htmlPath, 'utf8');
  const html = sourceHtml
    .replace(
      /<link\b(?=[^>]*href=["'][^"']*bootstrap@5\.3\.5\/dist\/css\/bootstrap\.min\.css["'])[^>]*>/gi,
      ''
    )
    .replace(
      /<link\b(?=[^>]*href=["'][^"']*font-awesome\/6\.7\.2\/css\/all\.min\.css["'])[^>]*>/gi,
      ''
    )
    .replace(
      /<link\b(?=[^>]*href=["']css\/styles\.css["'])[^>]*>/gi,
      ''
    );
  const { css: iconCss, usedIconNames } = createIconCss(html);
  const bootstrapCss = fs.readFileSync(bootstrapCssPath, 'utf8');
  const css = `${bootstrapCss}\n${fs.readFileSync(cssPath, 'utf8')}\n${iconCss}`;
  const firstFoldEnd = html.indexOf('<!-- SERVICIOS -->');
  if (firstFoldEnd === -1) {
    throw new Error('Could not find the above-the-fold content boundary.');
  }

  const safelist = {
    standard: [
      'active',
      'collapsing',
      'fa-brands',
      'fa-solid',
      'fa-xl',
      'fa-2xl',
      'modal-backdrop',
      'modal-static',
      'show',
      '[data-bs-theme=dark]',
      '[data-bs-theme=light]',
      ...[...usedIconNames].map((name) => `fa-${name}`)
    ],
    deep: [/data-bs-theme/]
  };
  const purgeCss = async (content) => {
    const [result] = await new PurgeCSS().purge({
      content: [{ raw: content, extension: 'html' }],
      css: [{ raw: css, from: cssPath }],
      safelist
    });
    const minified = new CleanCSS().minify(result.css);
    if (minified.errors.length > 0) {
      throw new Error(minified.errors.join('\n'));
    }
    return minified.styles;
  };

  const criticalCss = await purgeCss(html.slice(0, firstFoldEnd));
  const deferredCss = await purgeCss(html);

  let minifiedHtml = await minify(html, {
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true
  });
  minifiedHtml = minifiedHtml.replace(
    '</head>',
    `<style>${criticalCss}</style><link rel="preload" href="css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="css/styles.css"></noscript></head>`
  );

  fs.cpSync(publicDir, outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), minifiedHtml);
  fs.writeFileSync(path.join(outputDir, 'css', 'styles.css'), deferredCss);

  console.log(`Built production assets in ${path.relative(__dirname, outputDir)}`);
  console.log(`HTML: ${Buffer.byteLength(html)} -> ${Buffer.byteLength(minifiedHtml)} bytes`);
  console.log(`Critical CSS: ${Buffer.byteLength(criticalCss)} bytes inline`);
  console.log(`Deferred CSS: ${Buffer.byteLength(deferredCss)} bytes`);
  console.log(`Bootstrap CSS: ${Buffer.byteLength(bootstrapCss)} bytes before purging`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});