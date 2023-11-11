import fs from 'fs';
import puppeteer from 'puppeteer';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 2000 }); // Adjust the rate limiting as needed

async function scrapeData() {
  const url =
    'https://www.google.com/search?q=iphone+price+list&tbm=shop&source=lnms&sa=X&ved=2ahUKEwjzxvzyysKAAxXzhIkEHf8GAr4Q0pQJegQICBAB';

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set a random User-Agent to rotate between requests
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0',
    // Add more user agent strings here
  ];
  const randomUserAgent =
    userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(randomUserAgent);

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const scrapedData = await limiter.schedule(async () => {
    const docs = await page.evaluate(() => {
      const data = [];
      const elements = document.querySelectorAll('.sh-dgr__content');

      for (let i = 0; i < 60 && i < elements.length; i++) {
        const el = elements[i];

        const heading = el.querySelector('.tAxDx').innerText;
        const imgElement = el.querySelector('img');
        const imgSrc = imgElement ? imgElement.getAttribute('src') : null;
        const descriptionElement = el.querySelector('.F7Kwhf');
        const description = descriptionElement
          ? descriptionElement.innerText
          : null;

        const price = el.querySelector('.a8Pemb').innerText;
        const store = el.querySelector('.aULzUe').innerText;

        const href = el
          .querySelector('.eaGTj a:first-child')
          .getAttribute('href');
        const inputString = href;
        let storeLink;
        const regex = /(https?|http):\/\/([^&]+)/;
        const match = inputString.match(regex);

        if (match) {
          storeLink = match[0];
        }

        data.push({ heading, imgSrc, description, price, store, storeLink });
      }

      return data;
    });

    return docs;
  });

  await browser.close();
  return scrapedData;
}

scrapeData()
  .then((data) => {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFile('data.json', jsonData, (err) => {
      if (err) {
        console.error('Error writing data to data.json:', err);
      } else {
        console.log('Data has been written to data.json');
      }
    });
  })
  .catch((err) => {
    console.error('Error:', err);
  });
