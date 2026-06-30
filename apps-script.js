// ============================================================
// WOO ME — Google Apps Script Backend
// Paste this entire file into a new Google Apps Script project
// attached to a Google Sheet, then deploy as a Web App.
// ============================================================

// ─── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  ADMIN_PASSWORD: 'change-me-now',          // ← Set a strong password
  NOTIFICATION_EMAIL: 'kayla.mundt13@gmail.com',
  SHEET_NAME: 'Submissions',
  DRIVE_FOLDER_NAME: 'Woo Me Uploads',
  CALENDLY_LINK: 'https://calendly.com/YOUR-LINK-HERE', // ← Add your link
  CASH_APP_HANDLE: '$itsmekayla282622',
};

// ─── COLUMN MAP (1-indexed) ──────────────────────────────────
const C = {
  ID: 1,
  TIMESTAMP: 2,
  STATUS: 3,          // pending | approved | rejected
  QUEUE_POS: 4,
  LINE_HOP_STATUS: 5, // '' | pending | approved
  NAME: 6,
  AGE: 7,
  LOCATION: 8,
  EMAIL: 9,
  SOURCE: 10,
  DATE_IDEA: 11,
  AVAIL_1: 12,
  AVAIL_2: 13,
  AVAIL_3: 14,
  PITCH: 15,
  DEALBREAKERS: 16,
  LINE_HOP_TYPE: 17,  // '' | cashapp | therapist
  FILE_URL: 18,
};
const NUM_COLS = 18;

// ─── ROUTING ────────────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter.action || '').trim();
  const password = e.parameter.password || '';

  try {
    if (action === 'queue_count') {
      return json(queueCount());
    }

    // All other GET actions require the admin password
    if (password !== CONFIG.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (action === 'submissions') return json(getSubmissions());
    if (action === 'update_status') return json(updateStatus(e.parameter.id, e.parameter.status));
    if (action === 'approve_linehop') return json(approveLineHop(e.parameter.id));
    if (action === 'send_calendly') return json(sendCalendlyLink(e.parameter.id));

    return json({ error: 'Unknown action' });
  } catch (err) {
    return json({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return json(handleSubmission(data));
  } catch (err) {
    return json({ error: err.toString() });
  }
}

// ─── HELPERS ────────────────────────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    const headers = [
      'ID', 'Timestamp', 'Status', 'Queue Position', 'Line Hop Status',
      'Name', 'Age', 'Location', 'Email', 'How They Found You',
      'Date Idea', 'Availability 1', 'Availability 2', 'Availability 3',
      'Pitch', 'Deal-breakers', 'Line Hop Type', 'File URL',
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getUploadFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
}

function findRow(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, C.ID, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}

// ─── QUEUE COUNT ─────────────────────────────────────────────
function queueCount() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { count: 0 };
  const statuses = sheet.getRange(2, C.STATUS, lastRow - 1, 1).getValues();
  const count = statuses.filter(r => r[0] !== 'rejected').length;
  return { count };
}

// ─── NEW SUBMISSION ──────────────────────────────────────────
function handleSubmission(data) {
  const sheet = getSheet();
  const id = Utilities.getUuid();
  const timestamp = new Date().toISOString();

  // Upload file to Drive if provided
  let fileUrl = '';
  if (data.lineHopFile && data.lineHopFile.data) {
    try {
      const bytes = Utilities.base64Decode(data.lineHopFile.data);
      const blob = Utilities.newBlob(bytes, data.lineHopFile.mimeType, data.lineHopFile.name);
      const file = getUploadFolder().createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    } catch (err) {
      Logger.log('File upload error: ' + err);
    }
  }

  // Queue position = total non-rejected submissions + 1
  const queuePos = queueCount().count + 1;
  const lineHopStatus = data.lineHopType ? 'pending' : '';

  sheet.appendRow([
    id,
    timestamp,
    'pending',
    queuePos,
    lineHopStatus,
    data.name || '',
    data.age || '',
    data.location || '',
    data.email || '',
    data.source || '',
    data.dateIdea || '',
    data.avail1 || '',
    data.avail2 || '',
    data.avail3 || '',
    data.pitch || '',
    data.dealbreakers || '',
    data.lineHopType || '',
    fileUrl,
  ]);

  // Notify Kayla
  try { notifyNewApplication(data, id, queuePos, fileUrl); } catch (_) {}

  return { success: true, id, queuePosition: queuePos };
}

// ─── ADMIN ACTIONS ───────────────────────────────────────────
function getSubmissions() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { submissions: [] };

  const rows = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
  const submissions = rows.map(r => ({
    id: r[C.ID - 1],
    timestamp: r[C.TIMESTAMP - 1],
    status: r[C.STATUS - 1],
    queuePosition: r[C.QUEUE_POS - 1],
    lineHopStatus: r[C.LINE_HOP_STATUS - 1],
    name: r[C.NAME - 1],
    age: r[C.AGE - 1],
    location: r[C.LOCATION - 1],
    email: r[C.EMAIL - 1],
    source: r[C.SOURCE - 1],
    dateIdea: r[C.DATE_IDEA - 1],
    avail1: r[C.AVAIL_1 - 1],
    avail2: r[C.AVAIL_2 - 1],
    avail3: r[C.AVAIL_3 - 1],
    pitch: r[C.PITCH - 1],
    dealbreakers: r[C.DEALBREAKERS - 1],
    lineHopType: r[C.LINE_HOP_TYPE - 1],
    fileUrl: r[C.FILE_URL - 1],
  }));

  // Sort: line-hop pending first, then by queue position
  submissions.sort((a, b) => {
    if (a.lineHopStatus === 'pending' && b.lineHopStatus !== 'pending') return -1;
    if (b.lineHopStatus === 'pending' && a.lineHopStatus !== 'pending') return 1;
    return a.queuePosition - b.queuePosition;
  });

  return { submissions };
}

function updateStatus(id, status) {
  const sheet = getSheet();
  const row = findRow(sheet, id);
  if (row < 0) return { error: 'Not found' };
  sheet.getRange(row, C.STATUS).setValue(status);
  return { success: true };
}

function approveLineHop(id) {
  const sheet = getSheet();
  const row = findRow(sheet, id);
  if (row < 0) return { error: 'Not found' };

  // Mark line hop as approved
  sheet.getRange(row, C.LINE_HOP_STATUS).setValue('approved');

  // Move to front: find the current minimum queue position and set to min - 1
  const lastRow = sheet.getLastRow();
  const positions = sheet.getRange(2, C.QUEUE_POS, lastRow - 1, 1).getValues()
    .map(r => Number(r[0])).filter(p => p > 0);
  const minPos = positions.length ? Math.min(...positions) : 1;
  sheet.getRange(row, C.QUEUE_POS).setValue(Math.max(0, minPos - 1));

  return { success: true };
}

function sendCalendlyLink(id) {
  const sheet = getSheet();
  const row = findRow(sheet, id);
  if (row < 0) return { error: 'Not found' };

  const rowData = sheet.getRange(row, 1, 1, NUM_COLS).getValues()[0];
  const email = rowData[C.EMAIL - 1];
  const name = rowData[C.NAME - 1];

  if (!email) return { error: 'No email on file' };

  // Mark as approved
  sheet.getRange(row, C.STATUS).setValue('approved');

  GmailApp.sendEmail(
    email,
    `You're in 🌹 — time to book your date`,
    `Hi ${name},\n\nYou've been approved!\n\nClick the link below to pick a time:\n${CONFIG.CALENDLY_LINK}\n\nSee you soon,\nKayla`,
    {
      htmlBody: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:24px;margin-bottom:8px">You're in 🌹</h2>
          <p style="color:#444;line-height:1.6">Hi ${name},</p>
          <p style="color:#444;line-height:1.6">You've been approved! Click below to pick a time for our date.</p>
          <a href="${CONFIG.CALENDLY_LINK}" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#D94F6E;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Book Your Date →</a>
          <p style="color:#888;font-size:13px;margin-top:24px">See you soon,<br><strong>Kayla</strong></p>
        </div>
      `,
    }
  );

  return { success: true };
}

// ─── EMAIL NOTIFICATION ──────────────────────────────────────
function notifyNewApplication(data, id, queuePos, fileUrl) {
  const lineHopSection = data.lineHopType
    ? `\n\n⚡ LINE HOP REQUEST\nType: ${data.lineHopType === 'cashapp' ? 'Cash App $50' : 'Therapist Letter'}\nFile: ${fileUrl || 'No file uploaded'}`
    : '';

  GmailApp.sendEmail(
    CONFIG.NOTIFICATION_EMAIL,
    `🌹 New application: ${data.name} (#${queuePos} in queue)`,
    `New application received!\n\nName: ${data.name}\nAge: ${data.age}\nLocation: ${data.location}\nEmail: ${data.email}\nHow they found you: ${data.source}\n\nDate idea: ${data.dateIdea}\nAvailability: ${data.avail1} / ${data.avail2 || '—'} / ${data.avail3 || '—'}\n\nPitch:\n${data.pitch}\n\nDeal-breakers:\n${data.dealbreakers || 'None listed'}${lineHopSection}\n\nQueue position: #${queuePos}\nID: ${id}`
  );
}
