const express = require("express");
const {
  authorize,
  listFiles,
  downloadFile,
  getPermissions,
  subscribe,
  pollUpdates,
} = require("./google-drive");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/list-files", async (_, res) => {
  try {
    const client = await authorize();
    const files = await listFiles(client);
    res.json(files);
  } catch (err) {
    res.status(err.status).send(err.errors[0].message);
  }
});

app.get("/download/:fileId", async (req, res) => {
  try {
    const client = await authorize();
    const fileId = req.params.fileId;
    const file = await downloadFile(client, fileId);
    res.set("Content-Disposition", `attachment; filename="${file.name}"`);
    res.end(file.content);
  } catch (err) {
    res.status(err.status).send(err.errors[0].message);
  }
});

app.get("/permissions/:fileId", async (req, res) => {
  try {
    const client = await authorize();
    const fileId = req.params.fileId;
    const permissions = await getPermissions(client, fileId);

    res.json(permissions);
  } catch (err) {
    res.status(err.status).send(err.errors[0].message);
  }
});

app.post("/subscribe/:fileId", async (req, res) => {
  const client = await authorize();

  const email = req.body.email;
  if (email == null) {
    res
      .status(400)
      .send("Email to send updates to not provided in request body");
    return;
  }

  try {
    await subscribe(client, req.params.fileId, email);
    res.send(`Successfully subscribed ${email}`);
  } catch (err) {
    res.status(err.status).send(err.errors[0].message);
  }
});

app.listen(PORT, async () => {
  console.log(`Server is running on https://localhost:${PORT}`);
  await authorize();
});

pollUpdates();
