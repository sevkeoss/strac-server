const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { sendEmail, findDifferenceByEmail } = require("./util");
const { v4: uuidv4 } = require("uuid");

// If modifying these scopes, delete token.json and restart server.
const SCOPES = ["https://www.googleapis.com/auth/drive"];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

const NGROK_PATH = path.join(process.cwd(), "ngrok.json");

const subs = {};
const state = {};

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(client) {
  const drive = google.drive({ version: "v3", auth: client });
  let nextToken = null;

  let files = [];
  do {
    const response = await drive.files.list({
      pageToken: nextToken,
      pageSize: 30,
      fields: "nextPageToken, files(id, name)",
    });
    files.push.apply(files, response.data.files);

    nextToken = response.data.nextPageToken;
  } while (nextToken != null);

  return files;
}

async function downloadFile(client, fileId) {
  const drive = google.drive({ version: "v3", auth: client });
  const file = await drive.files.get({
    fileId,
    fields: "name, mimeType",
  });

  const exportedFile = await drive.files.export({
    fileId,
    mimeType: "application/pdf",
  });

  const buf = await exportedFile.data.arrayBuffer();

  return {
    name: file.data.name + ".docx",
    content: Buffer.from(buf),
  };
}

async function getPermissions(client, fileId) {
  const drive = google.drive({ version: "v3", auth: client });

  let usersWithAccess = [];
  let nextToken = null;
  do {
    const response = await drive.permissions.list({
      fileId: fileId,
      fields: "nextPageToken, permissions(displayName,emailAddress)",
    });

    usersWithAccess.push.apply(usersWithAccess, response.data.permissions);
    nextToken = response.data.nextPageToken;
  } while (nextToken != null);

  return usersWithAccess;
}

async function subscribe(client, fileId, email) {
  const drive = google.drive({ version: "v3", auth: client });

  await drive.files.get({
    fileId,
    fields: "name, mimeType",
  });

  await register(client, fileId);

  if (subs[fileId]) {
    subs[fileId].push(email);
  } else {
    subs[fileId] = [email];
  }

  if (!state[fileId]) {
    const permissions = await getPermissions(client, fileId);
    state[fileId] = permissions;
  }
}

let token = null;
async function register(client, fileId) {
  const drive = google.drive({ version: "v3", auth: client });

  let credentials = null;
  try {
    const content = await fs.readFile(NGROK_PATH);
    credentials = JSON.parse(content);
  } catch (err) {
    throw err;
  }

  if (credentials.ngrok == undefined) {
    throw {
      status: 500,
      errors: ["Could not register due to invalid ngrok server"],
    };
  }

  const watchReq = {
    fileId,
    resource: {
      id: uuidv4(),
      type: "web_hook",
      kind: "api#channel",
      address: credentials.ngrok,
    },
  };

  await drive.files.watch(watchReq);
  if (token == null) {
    token = (await drive.changes.getStartPageToken()).data.startPageToken;
  }
}

async function getChanges(client) {
  const drive = google.drive({ version: "v3", auth: client });

  try {
    const watchRequest = {
      pageToken: token,
    };
    const changes = await drive.changes.list(watchRequest);

    if (changes.length != 0) {
      token = (await drive.changes.getStartPageToken()).data.startPageToken;
    }

    return changes.data.changes;
  } catch (err) {
    return [];
  }
}

async function notifyChanges(fileId) {
  const client = await authorize();
  const changes = await getChanges(client);

  changes.forEach(async (change) => {
    if (change.fileId === fileId && subs[fileId]) {
      const newPermissions = await getPermissions(client, fileId);

      const added = findDifferenceByEmail(newPermissions, state[fileId]);
      const removed = findDifferenceByEmail(state[fileId], newPermissions);

      sendEmail(subs[fileId], added, "added to", change.file.name);
      sendEmail(subs[fileId], removed, "removed from", change.file.name);

      state[fileId] = newPermissions;
    }
  });
}

module.exports = {
  authorize,
  listFiles,
  downloadFile,
  getPermissions,
  subscribe,
  notifyChanges,
};
