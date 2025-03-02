const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


async function scrapeAmazon(searchQuery) {
  try {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(searchQuery)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    const $ = cheerio.load(response.data);
    const products = [];
    
    $('.s-result-item[data-component-type="s-search-result"]').each((i, el) => {
      if (i >= 5) return false; 
      
      const name = $(el).find('h2 span').text().trim();
      const priceWhole = $(el).find('.a-price-whole').first().text().trim();
      const priceFraction = $(el).find('.a-price-fraction').first().text().trim();
      const price = priceWhole && priceFraction ? `₹${priceWhole}.${priceFraction}` : 'Price not available';
      const imageUrl = $(el).find('img.s-image').attr('src') || '';
      const productUrl = 'https://www.amazon.in' + $(el).find('a.a-link-normal.s-no-outline').attr('href');
      
      if (name) {
        products.push({
          name,
          price,
          imageUrl,
          productUrl,
          source: 'Amazon'
        });
      }
    });
    
    return products;
  } catch (error) {
    console.error('Error scraping Amazon:', error);
    return [];
  }
}


async function scrapeFlipkart(searchQuery) {
    try {
      const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      const $ = cheerio.load(response.data);
      const products = [];
      
      $('._1AtVbE').each((i, el) => {
        if (i >= 5) return false; 
        
        const name = $(el).find('div._4rR01T').text().trim() || $(el).find('a.s1Q9rs').text().trim();
        const price = $(el).find('div._30jeq3').text().trim();
        const imageUrl = $(el).find('img._396cs4').attr('src') || $(el).find('img._2r_T1I').attr('src') || '';
        const productUrl = 'https://www.flipkart.com' + ($(el).find('a._1fQZEK').attr('href') || $(el).find('a.s1Q9rs').attr('href') || '');
        
        if (name && price) {
          products.push({
            name,
            price,
            imageUrl,
            productUrl,
            source: 'Flipkart'
          });
        }
      });
      
      return products;
    } catch (error) {
      console.error('Error scraping Flipkart:', error);
      return [];
    }
  }



app.get('/api/search', async (req, res) => {
  const searchQuery = req.query.q;
  
  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
   
    const [amazonProducts, flipkartProducts] = await Promise.all([
      scrapeAmazon(searchQuery),
      scrapeFlipkart(searchQuery)
    ]);
    
   
    const results = {
      amazon: amazonProducts,
      flipkart: flipkartProducts
    };
    
    res.json(results);
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});