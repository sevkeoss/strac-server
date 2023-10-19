const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");

const EMAIL_PATH = path.join(process.cwd(), "email.json");

async function sendEmail(recipients, users, operation, fileName) {
  let credentials = null;
  try {
    const content = await fs.readFile(EMAIL_PATH);
    credentials = JSON.parse(content);
  } catch (err) {
    throw err;
  }

  if (credentials.email == undefined || credentials.appPassword == undefined) {
    console.log("Email or App Password not set in email.json");
    return;
  }

  recipients.forEach((recipient) => {
    users.forEach((user) => {
      const message = `${user.displayName} (${user.emailAddress}) was ${operation} the file: ${fileName}`;

      const transporter = nodemailer.createTransport({
        service: "Gmail", // You can use other email services as well
        auth: {
          user: credentials.email,
          pass: credentials.appPassword,
        },
      });

      // Function to send the push email
      const mailOptions = {
        from: credentials.email,
        to: recipient,
        subject: `Notification: File Access Changed - ${fileName}`,
        text: message,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email: ", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    });
  });
}

function findDifferenceByEmail(arr1, arr2) {
  const emails = arr2.map((item) => item["emailAddress"]);
  const diff = arr1.filter((elem) => !emails.includes(elem["emailAddress"]));
  return diff;
}

function extractFileId(resourceUri) {
  const regex = /\/files\/([^?]+)/;

  // Use the match method to extract the file ID
  const match = resourceUri.match(regex);

  let fileId = undefined;
  if (match) {
    fileId = match[1];
  }

  return fileId;
}

module.exports = { sendEmail, findDifferenceByEmail, extractFileId };
