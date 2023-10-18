const nodemailer = require("nodemailer");

function sendEmail(recipients, users, operation, fileName) {
  recipients.forEach((recipient) => {
    users.forEach((user) => {
      const message = `${user.displayName} (${user.emailAddress}) was ${operation} the file: ${fileName}`;

      const transporter = nodemailer.createTransport({
        service: "Gmail", // You can use other email services as well
        auth: {
          user: "sev.keoss@gmail.com",
          pass: "qeus tgew mdbg vksg",
        },
      });

      // Function to send the push email
      const mailOptions = {
        from: "sev.keoss@gmail.com",
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

module.exports = { sendEmail };
