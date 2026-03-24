const fs = require('fs');

// Fix WA webhook FAQ
const waFile = 'src/app/api/webhook/waha/route.ts';
let wa = fs.readFileSync(waFile, 'utf8');

// Replace FAQ greeting
wa = wa.replace(
  /Selamat \$\{timeStr\} Bapak\/Ibu\/Kakak! Ada yang bisa kami bantu seputar jasa laser cutting, bending, atau fabrikasi metal kami\?/g,
  'Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metal Indo* 🏭\\n\\nSebelum kami bantu, boleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏'
);

// Replace generic FAQ service response
wa = wa.replace(
  'Ya, kami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi Lanjutan untuk material Besi, Stainless, Aluminium, dan Mild Steel (Ketebalan laser maks 20mm). Ada yang bisa dibantu?',
  'Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metal Indo* 🏭\\n\\nKami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi untuk material Besi, Stainless, Aluminium, dan Mild Steel.\\n\\nBoleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏'
);

// Clean up Bapak/Ibu from other FAQ responses  
wa = wa.replace(/Silakan Bapak\/Ibu bisa langsung melampirkan/g, 'Silakan langsung lampirkan');
wa = wa.replace(/mohon Bapak\/Ibu kirimkan/g, 'silakan kirimkan');
wa = wa.replace(/kualitas file engineering Bapak\/Ibu/g, 'kualitas file engineering');
wa = wa.replace(/Silakan mampir kapan saja di jam kerja ya\./g, 'Silakan mampir kapan saja di jam kerja.');

fs.writeFileSync(waFile, wa);
console.log('WA webhook FAQ updated');

// Fix Web chat FAQ
const chatFile = 'src/app/api/chat/route.ts';
let chat = fs.readFileSync(chatFile, 'utf8');

chat = chat.replace(
  /Selamat \$\{timeStr\} Bapak\/Ibu\/Kakak! Ada yang bisa kami bantu seputar jasa laser cutting, bending, atau fabrikasi metal kami\?/g,
  'Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metal Indo* 🏭\\n\\nSebelum kami bantu, boleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏'
);

chat = chat.replace(
  'Ya, kami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi Lanjutan untuk material Besi, Stainless, Aluminium, dan Mild Steel (Ketebalan laser maks 20mm). Ada yang bisa dibantu?',
  'Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metal Indo* 🏭\\n\\nKami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi untuk material Besi, Stainless, Aluminium, dan Mild Steel.\\n\\nBoleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏'
);

chat = chat.replace(/Silakan Bapak\/Ibu bisa langsung mengirimkan/g, 'Silakan langsung kirimkan');
chat = chat.replace(/mohon Bapak\/Ibu kirimkan/g, 'silakan kirimkan');
chat = chat.replace(/kualitas file engineering Bapak\/Ibu/g, 'kualitas file engineering');

fs.writeFileSync(chatFile, chat);
console.log('Web chat FAQ updated');
console.log('DONE');
