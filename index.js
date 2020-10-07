const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  const pages = [];

  for (let year = 2018; year <= 2020; year++) {
    const pagesPerYear = await getPages(year);
    for (let item of pagesPerYear) {
      const { internalLink, conversations } = await getConversations(item.link);
      item.internalLink = internalLink;
      item.conversations = conversations;
    }
    pages.push(...pagesPerYear);
  }

  await browser.close();

  fs.writeFileSync('data.json', JSON.stringify(pages), { encoding: 'utf-8' });

  process.exit();

  async function getPages(year) {
    await page.goto(`https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/?contentLanguageFilter=es&pubFilter=mwb&yearFilter=${ year }`);
    return page.evaluate(() => {
      const as = document.querySelectorAll('#pubsViewResults .publication.pubSym-mwb .publicationDesc a'); 
      return Array.from(as)
        .reverse()
        .map(a => ({
          title: a.textContent.trim(),
          link: a.href
        }));
    })
    
  }

  async function getConversations(link) {
    await page.goto(link);
    const internalLink = await page.evaluate(() => document.querySelector('div.syn-body a').href);

    await page.click('div.syn-body a');
    await page.waitForSelector('.bodyTxt .section .pGroup');

    const conversations = await page.evaluate(() => {
      const pGroups = document.querySelectorAll('.bodyTxt .section .pGroup');
      return Array.from(pGroups).map(pGroup => {
        return Array.from(pGroup.querySelectorAll('p'))
          .map(p => {
            const index = p.textContent.indexOf(':');
            const key = p.textContent.substr(0, index);
            const value = p.textContent.substr(index + 1);
            return [ key.trim(), value.trim() ];
          })
          .filter(([ key ]) => ['Pregunta', 'Texto', 'Pregunta pendiente'].includes(key))
          .map(([ key, value ]) => {
            if (key === 'Pregunta') key = 'question';
            if (key === 'Texto') key = 'vers';
            if (key === 'Pregunta pendiente') key = 'pending';

            return [key, value];
          })
          .slice(0, 3)
          .reduce((a, [key, value]) => ({ ...a, [key]: value }), {})
      })
      .slice(0, 3)
      .filter(o => JSON.stringify(o) !== '{}');
    });

    return { internalLink, conversations };
  }

})();



