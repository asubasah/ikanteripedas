const fs = require('fs');
const filePath = 'src/app/api/webhook/waha/route.ts';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the alertSales block
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const alertSales') && startIdx < 0) {
        startIdx = i;
    }
    if (startIdx >= 0 && endIdx < 0 && (lines[i].trimEnd().endsWith('\`;') || lines[i].trimEnd().endsWith("');"))) {
        endIdx = i;
        break;
    }
}

console.log('Lines ' + (startIdx+1) + ' to ' + (endIdx+1));

const newLines = [
'        const alertParts = [',
'          \'*\uD83D\uDCCB FILE MASUK (WhatsApp)*\',',
'          \'\',',
'          \'\uD83D\uDC64 Dari: *\' + userName + \'*\',',
'          \'\uD83D\uDCDE No: \' + cleanPhone,',
'          \'\uD83D\uDDBC\uFE0F Jenis: [Media/Gambar/PDF]\',',
'          \'\uD83D\uDCC4 Link: \' + (fileUrl || \'(Gagal tarik, cek WA langsung)\'),',
'          \'\',',
'          \'\uD83D\uDCDD *Ringkasan Kebutuhan Customer:*\',',
'          summaryText,',
'          \'\',',
'          \'\uD83D\uDCA1 Untuk detail lengkap histori chat, silakan cek *Monitoring Dashboard CRM*:\',',
'          dashboardUrl',
'        ];',
'        const alertSales = alertParts.join(\'\\n\');'
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
fs.writeFileSync(filePath, lines.join('\n'));
console.log('DONE');
