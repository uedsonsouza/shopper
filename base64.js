/* eslint-disable @typescript-eslint/no-require-imports */
// import axios from 'axios';

// async function convertImageToBase64(url) {
//   try {
//     const response = await axios.get(url, { responseType: 'arraybuffer' });
//     const base64 = Buffer.from(response.data, 'binary').toString('base64');
//     console.log('base64=======>', base64); // Mostra a string base64
//   } catch (error) {
//     console.error('Erro ao converter a imagem:', error);
//   }
// }

// convertImageToBase64('https://i.imgur.com/oJdznSZ.png');

import { base64String } from './base64String.js';
import fs from 'fs';

// Decodifica a string base64
const imageData = Buffer.from(base64String, 'base64');

// Salva a imagem em um arquivo
fs.writeFileSync('output_image.png', imageData);

console.log('Imagem salva como output_image.png');
